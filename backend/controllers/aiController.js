import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/error.js";
import { User } from "../models/userSchema.js";
import { Job } from "../models/jobSchema.js";
import { analyzeResume, matchJobToCandidate, getSkillGap } from "../services/aiService.js";

export const getResumeAnalysis = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user.resumeText) {
    return next(new ErrorHandler("No resume text found. Please upload a PDF resume first.", 400));
  }

  // Assuming resumeText hasn't changed, we could cache this.
  // For now, we will compute it if not present.
  if (!user.resumeAnalysis) {
    const analysis = await analyzeResume(user.resumeText);
    user.resumeAnalysis = analysis;
    await user.save();
  }

  res.status(200).json({
    success: true,
    analysis: user.resumeAnalysis
  });
});

export const checkJobMatch = catchAsyncErrors(async (req, res, next) => {
  const { jobId } = req.body;
  if (!jobId) return next(new ErrorHandler("Job ID is required.", 400));

  const job = await Job.findById(jobId);
  if (!job) return next(new ErrorHandler("Job not found.", 404));

  const user = await User.findById(req.user.id);
  if (!user.resumeText) {
    return next(new ErrorHandler("No resume text found to match against.", 400));
  }

  // Ensure resume analysis exists
  let resumeAnalysis = user.resumeAnalysis;
  if (!resumeAnalysis) {
    resumeAnalysis = await analyzeResume(user.resumeText);
    user.resumeAnalysis = resumeAnalysis;
    await user.save();
  }

  const matchData = await matchJobToCandidate(resumeAnalysis, user.resumeText, job);

  res.status(200).json({
    success: true,
    matchData
  });
});

export const getJobSkillGap = catchAsyncErrors(async (req, res, next) => {
  const { jobId } = req.body;
  if (!jobId) return next(new ErrorHandler("Job ID is required.", 400));

  const job = await Job.findById(jobId);
  if (!job) return next(new ErrorHandler("Job not found.", 404));

  const user = await User.findById(req.user.id);
  if (!user.resumeText) {
    return next(new ErrorHandler("No resume text found.", 400));
  }

  const skillGapData = await getSkillGap(user.resumeText, job);

  res.status(200).json({
    success: true,
    skillGapData
  });
});
