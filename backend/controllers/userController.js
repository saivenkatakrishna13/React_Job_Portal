import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import { User } from "../models/userSchema.js";
import ErrorHandler from "../middlewares/error.js";
import { sendToken } from "../utils/jwtToken.js";

export const register = catchAsyncErrors(async (req, res, next) => {
  const { name, email, phone, password, role } = req.body;
  if (!name || !email || !phone || !password || !role) {
    return next(new ErrorHandler("Please fill full form !"));
  }
  const isEmail = await User.findOne({ email });
  if (isEmail) {
    return next(new ErrorHandler("Email already registered !"));
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
    return next(new ErrorHandler("Please provide email ,password and role !"));
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
  const data = await pdfParse(dataBuffer);
  
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
});