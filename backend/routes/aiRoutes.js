import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import {
  getResumeAnalysis,
  checkJobMatch,
  getJobSkillGap,
  getInterviewQuestions,
} from "../controllers/aiController.js";

const router = express.Router();

router.post("/analyze-resume", isAuthenticated, getResumeAnalysis);
router.post("/match-job", isAuthenticated, checkJobMatch);
router.post("/skill-gap", isAuthenticated, getJobSkillGap);
router.post("/interview-questions", isAuthenticated, getInterviewQuestions);

export default router;
