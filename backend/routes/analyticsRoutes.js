import express from "express";
import { getRecruiterAnalytics } from "../controllers/analyticsController.js";
import { isAuthenticated } from "../middlewares/auth.js";

const router = express.Router();

router.get("/employer", isAuthenticated, getRecruiterAnalytics);

export default router;
