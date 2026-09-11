import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/error.js";
import { Application } from "../models/applicationSchema.js";
import { Job } from "../models/jobSchema.js";

export const getRecruiterAnalytics = catchAsyncErrors(async (req, res, next) => {
  const { role } = req.user;
  if (role === "Job Seeker") {
    return next(new ErrorHandler("Job Seeker not allowed to access this resource.", 400));
  }

  const employerId = req.user._id;

  // 1. Total Jobs Posted
  const totalJobs = await Job.countDocuments({ postedBy: employerId });

  // 2. All Applications for this employer
  const applications = await Application.find({ "employerID.user": employerId });

  const totalApplications = applications.length;
  
  // 3. Status Breakdown
  const statusCounts = {
    Applied: 0,
    "Under Review": 0,
    Shortlisted: 0,
    Interview: 0,
    Selected: 0,
    Rejected: 0
  };

  let totalMatchScore = 0;
  let applicationsWithScore = 0;

  applications.forEach(app => {
    statusCounts[app.status] = (statusCounts[app.status] || 0) + 1;
    if (app.aiMatchScore) {
      totalMatchScore += app.aiMatchScore;
      applicationsWithScore++;
    }
  });

  const avgMatchScore = applicationsWithScore > 0 ? (totalMatchScore / applicationsWithScore).toFixed(2) : 0;

  res.status(200).json({
    success: true,
    analytics: {
      totalJobs,
      totalApplications,
      statusCounts,
      avgMatchScore
    }
  });
});
