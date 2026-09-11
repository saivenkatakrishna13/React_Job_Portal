import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import { getResumeAnalysis, checkJobMatch, getJobSkillGap } from "../controllers/aiController.js";

const router = express.Router();

router.post("/analyze-resume", isAuthenticated, getResumeAnalysis);
router.post("/match-job", isAuthenticated, checkJobMatch);
router.post("/skill-gap", isAuthenticated, getJobSkillGap);

export default router;
