import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/error.js";
import { Application } from "../models/applicationSchema.js";
import { Job } from "../models/jobSchema.js";
import { User } from "../models/userSchema.js";
import cloudinary from "cloudinary";
import fs from "fs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");
import { Notification } from "../models/notificationSchema.js";
import { matchJobToCandidate } from "../services/aiService.js";

const APPLICATION_STATUSES = [
  "Applied",
  "Under Review",
  "Shortlisted",
  "Interview",
  "Selected",
  "Rejected",
];

// Sensible-transition rules (Part A #9): Selected and Rejected are terminal —
// they can only move back out through an explicit re-open (to Under Review).
// Same-status updates are idempotent no-ops that still record history.
const ALLOWED_TRANSITIONS = {
  "Applied": ["Under Review", "Shortlisted", "Rejected"],
  "Under Review": ["Shortlisted", "Interview", "Rejected"],
  "Shortlisted": ["Interview", "Selected", "Rejected"],
  "Interview": ["Selected", "Rejected"],
  "Selected": ["Under Review"],
  "Rejected": ["Under Review"],
};

export const postApplication = catchAsyncErrors(async (req, res, next) => {
  const { role } = req.user;
  if (role === "Employer") {
    return next(
      new ErrorHandler("Employer not allowed to access this resource.", 400)
    );
  }
  
  const jobId = req.body.jobId;
  if (!jobId) {
    return next(new ErrorHandler("Job ID is required.", 400));
  }

  // Duplicate Application Protection
  const existingApplication = await Application.findOne({
    "applicantID.user": req.user._id,
    jobId: jobId
  });

  if (existingApplication) {
    return next(new ErrorHandler("You have already applied to this job.", 400));
  }

  const jobDetails = await Job.findById(jobId);
  if (!jobDetails) {
    return next(new ErrorHandler("Job not found!", 404));
  }

  // Closed/deactivated jobs must not accept new applications. A job whose
  // deadline has passed counts as closed too (Part A #11).
  const pastDeadline =
    jobDetails.deadline && new Date(jobDetails.deadline) < new Date();
  if (jobDetails.expired || pastDeadline) {
    return next(new ErrorHandler("This job is closed and no longer accepting applications.", 400));
  }

  // Support 1-click apply by falling back to user profile data
  const name = req.body.name || req.user.name;
  const email = req.body.email || req.user.email;
  const phone = req.body.phone || req.user.phone;
  const coverLetter = req.body.coverLetter || "I am very interested in this opportunity and would love to learn more.";
  const address = req.body.address || "Address not provided";

  if (!name || !email || !phone) {
    return next(new ErrorHandler("Please ensure your profile has name, email, and phone, or provide them.", 400));
  }

  const applicantID = {
    user: req.user._id,
    role: "Job Seeker",
  };

  const employerID = {
    user: jobDetails.postedBy,
    role: "Employer",
  };

  let finalResume = null;
  let finalResumeText = null;

  // Check if user uploaded a new file
  if (req.files && Object.keys(req.files).length > 0 && req.files.resume) {
    const { resume } = req.files;
    const allowedFormats = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
    if (!allowedFormats.includes(resume.mimetype)) {
      return next(
        new ErrorHandler("Invalid file type. Please upload a PNG, JPEG, WEBP, or PDF file.", 400)
      );
    }

    try {
      const cloudinaryResponse = await cloudinary.uploader.upload(
        resume.tempFilePath,
        { resource_type: "auto" }
      );
      
      finalResume = {
        public_id: cloudinaryResponse.public_id,
        url: cloudinaryResponse.secure_url,
      };
    } catch (error) {
      console.error("Cloudinary Error:", error);
      return next(new ErrorHandler("Failed to upload Resume to Cloudinary. Please check config.", 500));
    }

    // Parse it locally for AI matching if it's a PDF. This runs OUTSIDE the
    // Cloudinary block on purpose: an unreadable PDF must not be reported as
    // a Cloudinary failure, and the application still submits without AI text.
    if (resume.mimetype === "application/pdf") {
      try {
        const dataBuffer = fs.readFileSync(resume.tempFilePath);
        const data = await pdfParse(dataBuffer);
        finalResumeText = data.text;
      } catch (parseError) {
        console.error(
          "PDF parse skipped (application continues, AI score stays pending):",
          parseError.message
        );
        finalResumeText = null;
      }
    }
  } else {
    // Check if user has an existing resume saved on their profile
    const currentUser = await User.findById(req.user._id);
    if (!currentUser.resume || !currentUser.resume.url) {
      return next(new ErrorHandler("Please upload a resume file or upload one to your profile first.", 400));
    }
    finalResume = currentUser.resume;
    finalResumeText = currentUser.resumeText;
  }
  
  try {
    // Decide up-front whether AI scoring can happen: it needs the resume text
    // AND an existing resume analysis (Part C Phase 4).
    const profileUser = await User.findById(req.user._id);
    const canScore = Boolean(
      finalResumeText && profileUser && profileUser.resumeAnalysis
    );

    const application = await Application.create({
      name,
      email,
      coverLetter,
      phone,
      address,
      applicantID,
      employerID,
      jobId,
      resume: finalResume,
      aiStatus: canScore ? "pending" : "skipped",
    });

    // Notify the employer about the new applicant BEFORE responding so tests
    // (and users) see it as soon as the 200 lands. Guarded: a notification
    // hiccup must never fail the application itself.
    try {
      await Notification.create({
        user: employerID.user,
        type: "new-applicant",
        message: `New applicant ${name} applied for ${jobDetails.title}.`,
        application: application._id,
        job: jobDetails._id,
      });
    } catch (notifError) {
      console.error("Notification create failed:", notifError.message);
    }

    // Respond immediately; score in the BACKGROUND. An AI failure (or a 180 s
    // provider stall) must never fail or delay the application itself.
    res.status(200).json({
      success: true,
      message: "Application Submitted!",
      application,
    });

    if (canScore) {
      (async () => {
        try {
          const matchData = await matchJobToCandidate(
            profileUser.resumeAnalysis,
            finalResumeText,
            {
              title: jobDetails.title,
              description: jobDetails.description,
              requiredSkills: jobDetails.requiredSkills,
              experienceLevel: jobDetails.experienceLevel,
            }
          );
          application.aiMatchScore = matchData.matchScore || matchData.score || 0;
          application.matchingSkills = matchData.matchingSkills || [];
          application.missingSkills = matchData.missingSkills || [];
          application.aiExplanation = matchData.explanation || "";
          application.aiStatus = "done";
          await application.save();
        } catch (aiError) {
          console.error("AI matching failed:", aiError);
          application.aiStatus = "failed";
          try {
            await application.save();
          } catch (saveError) {
            console.error("Could not record aiStatus=failed:", saveError.message);
          }
        }
      })();
    }
  } catch (error) {
    return next(error);
  }
});

export const employerGetAllApplications = catchAsyncErrors(
  async (req, res, next) => {
    const { role } = req.user;
    if (role === "Job Seeker") {
      return next(
        new ErrorHandler("Job Seeker not allowed to access this resource.", 400)
      );
    }
    const { _id } = req.user;
    const applications = await Application.find({ "employerID.user": _id })
      .populate("jobId", "title category location")
      .sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      applications,
    });
  }
);

export const jobseekerGetAllApplications = catchAsyncErrors(
  async (req, res, next) => {
    const { role } = req.user;
    if (role === "Employer") {
      return next(
        new ErrorHandler("Employer not allowed to access this resource.", 400)
      );
    }
    const { _id } = req.user;
    const applications = await Application.find({ "applicantID.user": _id })
      .populate("jobId", "title category location")
      .sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      applications,
    });
  }
);

export const jobseekerDeleteApplication = catchAsyncErrors(
  async (req, res, next) => {
    const { role } = req.user;
    if (role === "Employer") {
      return next(
        new ErrorHandler("Employer not allowed to access this resource.", 400)
      );
    }
    const { id } = req.params;
    const application = await Application.findById(id);
    if (!application) {
      return next(new ErrorHandler("Application not found!", 404));
    }
    // A job seeker can only withdraw their own application
    if (application.applicantID.user.toString() !== req.user._id.toString()) {
      return next(new ErrorHandler("You are not authorized to withdraw this application.", 403));
    }
    await application.deleteOne();
    res.status(200).json({
      success: true,
      message: "Application Deleted!",
    });
  }
);

export const updateApplicationStatus = catchAsyncErrors(async (req, res, next) => {
  const { role } = req.user;
  if (role === "Job Seeker") {
    return next(new ErrorHandler("Job Seeker not allowed to access this resource.", 400));
  }
  const { id } = req.params;
  const { status } = req.body;
  if (!status) {
    return next(new ErrorHandler("Please provide a status.", 400));
  }
  if (!APPLICATION_STATUSES.includes(status)) {
    return next(new ErrorHandler(`Invalid status. Allowed values: ${APPLICATION_STATUSES.join(", ")}.`, 400));
  }
  const application = await Application.findById(id);
  if (!application) {
    return next(new ErrorHandler("Application not found!", 404));
  }
  // Only the employer who owns the job can update the application status
  if (application.employerID.user.toString() !== req.user._id.toString()) {
    return next(new ErrorHandler("You are not authorized to update this application.", 403));
  }
  // Enforce sensible transitions (Part A #9) after ownership, so the 403 for
  // other employers still wins over a merely-invalid transition.
  const allowedNext = ALLOWED_TRANSITIONS[application.status] || [];
  if (status !== application.status && !allowedNext.includes(status)) {
    return next(
      new ErrorHandler(
        `Invalid status transition: ${application.status} → ${status}.`,
        400
      )
    );
  }
  const previousStatus = application.status;
  application.status = status;
  application.statusHistory.push({
    status,
    changedAt: new Date(),
    changedBy: req.user._id,
  });
  await application.save();

  // Notify the applicant when the status actually changed (guarded, before
  // the response so the notification is visible immediately).
  if (previousStatus !== status) {
    try {
      const jobDoc = await Job.findById(application.jobId).select("title");
      await Notification.create({
        user: application.applicantID.user,
        type: "status-changed",
        message: `Your application for "${jobDoc ? jobDoc.title : "a job"}" moved to ${status}.`,
        application: application._id,
        job: application.jobId,
      });
    } catch (notifError) {
      console.error("Notification create failed:", notifError.message);
    }
  }

  res.status(200).json({
    success: true,
    message: "Application status updated!",
    application,
  });
});
