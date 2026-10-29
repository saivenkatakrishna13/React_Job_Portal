import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import {
  getMyNotifications,
  markAllRead,
} from "../controllers/notificationController.js";

const router = express.Router();

router.get("/", isAuthenticated, getMyNotifications);
router.put("/read-all", isAuthenticated, markAllRead);

export default router;
