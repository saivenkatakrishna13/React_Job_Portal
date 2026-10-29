import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import { User } from "../models/userSchema.js";
import { Application } from "../models/applicationSchema.js";
import { Job } from "../models/jobSchema.js";
import { SavedJob } from "../models/savedJobSchema.js";
import { Notification } from "../models/notificationSchema.js";
import ErrorHandler from "../middlewares/error.js";
import { sendToken } from "../utils/jwtToken.js";

export const register = catchAsyncErrors(async (req, res, next) => {
  const { name, email, phone, password, role } = req.body;
  if (!name || !email || !phone || !password || !role) {
    return next(new ErrorHandler("Please fill full form !", 400));
  }
  const isEmail = await User.findOne({ email });
  if (isEmail) {
    return next(new ErrorHandler("Email already registered !", 400));
  }
  const user = await User.create({
    name,
    email,
    phone,
    password,
    role,
  });
  sendToken(user, 201, res, "User Registered Sucessfully !");
});

export const login = catchAsyncErrors(async (req, res, next) => {
  const { email, password, role } = req.body;
  if (!email || !password || !role) {
    return next(new ErrorHandler("Please provide email ,password and role !", 400));
  }
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    return next(new ErrorHandler("Invalid Email Or Password.", 400));
  }
  const isPasswordMatched = await user.comparePassword(password);
  if (!isPasswordMatched) {
    return next(new ErrorHandler("Invalid Email Or Password !", 400));
  }
  if (user.role !== role) {
    return next(
      new ErrorHandler(`User with provided email and ${role} not found !`, 404)
    );
  }
  sendToken(user, 201, res, "User Logged In Sucessfully !");
});

export const logout = catchAsyncErrors(async (req, res, next) => {
  res
    .status(201)
    .cookie("token", "", {
      httpOnly: true,
      expires: new Date(0),
      path: "/",
    })
    .json({
      success: true,
      message: "Logged Out Successfully !",
    });
});


export const getUser = catchAsyncErrors((req, res, next) => {
  const user = req.user;
  // Sanitize user data to remove sensitive fields but include resume data
  const sanitizedUser = {
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    resumeText: user.resumeText || null,           // needed for AI match checks
    resumeAnalysis: user.resumeAnalysis || null,   // needed for dashboard display
  };

  res.status(200).json({
    success: true,
    user: sanitizedUser,
  });
});

import fs from "fs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

export const uploadResume = catchAsyncErrors(async (req, res, next) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return next(new ErrorHandler("Resume File Required!", 400));
  }

  const { resume } = req.files;
  if (resume.mimetype !== "application/pdf") {
    return next(new ErrorHandler("Only PDF resumes are supported for profile analysis.", 400));
  }

  // Real content check (Part A #6): a genuine PDF starts with "%PDF-".
  // The declared mimetype and file extension are both forgeable.
  let header = Buffer.alloc(5);
  let fd;
  try {
    fd = fs.openSync(resume.tempFilePath, "r");
    fs.readSync(fd, header, 0, 5, 0);
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
  if (header.toString("latin1") !== "%PDF-") {
    return next(new ErrorHandler("Only PDF resumes are supported for profile analysis.", 400));
  }

  try {
    // Upload to Cloudinary first
    let cloudinaryResponse;
    try {
      const cloudinary = (await import('cloudinary')).default;
      cloudinaryResponse = await cloudinary.uploader.upload(
        resume.tempFilePath,
        { resource_type: "auto" }
      );
    } catch (error) {
      console.error("Cloudinary Error:", error);
      return next(new ErrorHandler("Failed to upload Resume to Cloudinary. Please check configuration.", 500));
    }

    const dataBuffer = fs.readFileSync(resume.tempFilePath);
    let data;
    try {
      data = await pdfParse(dataBuffer);
    } catch (parseError) {
      console.error("PDF parse error:", parseError.message);
      return next(
        new ErrorHandler(
          "Could not read text from this PDF. Please upload a text-based PDF (not a scanned image).",
          400
        )
      );
    }

    const user = await User.findById(req.user._id);
    user.resumeText = data.text;
    user.resumeAnalysis = null; // reset analysis
    user.resume = {
      public_id: cloudinaryResponse.public_id,
      url: cloudinaryResponse.secure_url,
    };
    await user.save();

    res.status(200).json({
      success: true,
      message: "Resume uploaded successfully!",
    });
  } finally {
    // express-fileupload with useTempFiles leaves the file on disk — remove it
    // on every path (success, 400, 500) so uploads never accumulate.
    try {
      fs.unlinkSync(resume.tempFilePath);
    } catch (cleanupError) {
      // already gone (or never written) — nothing to do
    }
  }
});

export const changePassword = catchAsyncErrors(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return next(new ErrorHandler("Please provide current and new password !", 400));
  }
  const user = await User.findById(req.user._id).select("+password");
  if (!user) {
    return next(new ErrorHandler("User Not Authorized", 401));
  }
  const isCurrentPasswordValid = await user.comparePassword(currentPassword);
  if (!isCurrentPasswordValid) {
    return next(new ErrorHandler("Current password is incorrect !", 400));
  }
  // Schema validators (8-32 chars) run on save and map to a 400 with the
  // field message through errorMiddleware.
  user.password = newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Password changed successfully !",
  });
});

export const deleteMe = catchAsyncErrors(async (req, res, next) => {
  const { password } = req.body;
  if (!password) {
    return next(new ErrorHandler("Please provide your password to delete the account.", 400));
  }
  const user = await User.findById(req.user._id).select("+password");
  if (!user) {
    return next(new ErrorHandler("User Not Authorized", 401));
  }
  const passwordValid = await user.comparePassword(password);
  if (!passwordValid) {
    return next(new ErrorHandler("Incorrect password. Account not deleted.", 400));
  }
  // Cascade so no orphaned jobs/applications/saves/notifications survive their
  // owner — this is also what lets the test suites clean up every user they
  // create.
  const myJobIds = (await Job.find({ postedBy: user._id }).select("_id")).map(
    (job) => job._id
  );
  await Application.deleteMany({
    $or: [{ "applicantID.user": user._id }, { "employerID.user": user._id }],
  });
  await SavedJob.deleteMany({
    $or: [{ user: user._id }, { job: { $in: myJobIds } }],
  });
  await Notification.deleteMany({ user: user._id });
  await Job.deleteMany({ postedBy: user._id });
  await user.deleteOne();

  res
    .clearCookie("token", { path: "/" })
    .status(200)
    .json({ success: true, message: "Account deleted successfully !" });
});