import crypto from "crypto";
import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/error.js";
import { User } from "../models/userSchema.js";
import { Job } from "../models/jobSchema.js";
import {
  analyzeResume,
  matchJobToCandidate,
  getSkillGap,
  getInterviewQuestions as buildInterviewQuestions,
} from "../services/aiService.js";

// In-memory match cache keyed by (user, job, resume hash) so opening a job
// page does not burn an AI call every time (Part C Phase 5). Bounded + TTL'd:
// job edits surface at worst after MATCH_CACHE_TTL_MS, resume uploads change
// the hash and self-invalidate.
const matchCache = new Map();
const MATCH_CACHE_TTL_MS = 10 * 60 * 1000;
const MATCH_CACHE_MAX = 500;
const matchCacheKey = (userId, jobId, resumeText) => {
  const resumeHash = crypto.createHash("sha256").update(resumeText).digest("hex").slice(0, 16);
  return `${userId}:${jobId}:${resumeHash}`;
};

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

  // Serve from cache when this exact (user, job, resume) was scored recently.
  const cacheKey = matchCacheKey(req.user.id, jobId, user.resumeText);
  const cached = matchCache.get(cacheKey);
  if (cached && Date.now() - cached.at < MATCH_CACHE_TTL_MS) {
    console.log(`match-job cache hit (${cacheKey})`);
    return res.status(200).json({
      success: true,
      matchData: cached.data,
    });
  }

  // Ensure resume analysis exists
  let resumeAnalysis = user.resumeAnalysis;
  if (!resumeAnalysis) {
    resumeAnalysis = await analyzeResume(user.resumeText);
    user.resumeAnalysis = resumeAnalysis;
    await user.save();
  }

  const matchData = await matchJobToCandidate(resumeAnalysis, user.resumeText, job);

  if (matchCache.size >= MATCH_CACHE_MAX) matchCache.clear();
  matchCache.set(cacheKey, { data: matchData, at: Date.now() });

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

export const getInterviewQuestions = catchAsyncErrors(async (req, res, next) => {
  const { jobId } = req.body;
  if (!jobId) return next(new ErrorHandler("Job ID is required.", 400));

  const job = await Job.findById(jobId);
  if (!job) return next(new ErrorHandler("Job not found.", 404));

  const user = await User.findById(req.user.id);
  if (!user.resumeText) {
    return next(new ErrorHandler("No resume text found. Please upload a PDF resume first.", 400));
  }

  const data = await buildInterviewQuestions(user.resumeText, job);

  res.status(200).json({
    success: true,
    questions: data.questions,
  });
});
