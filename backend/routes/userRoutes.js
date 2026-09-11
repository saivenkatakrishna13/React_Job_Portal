import express from "express";
import { login, register, logout, getUser, uploadResume } from "../controllers/userController.js";
import { isAuthenticated } from "../middlewares/auth.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/logout", logout);
router.get("/getuser", isAuthenticated, getUser);
router.post("/upload-resume", isAuthenticated, uploadResume);

export default router;
