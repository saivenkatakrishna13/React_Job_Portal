import express from "express";
import {
  deleteJob,
  getAllJobs,
  getMyJobs,
  getSavedJobs,
  getSingleJob,
  postJob,
  saveJob,
  unsaveJob,
  updateJob,
} from "../controllers/jobController.js";
import { isAuthenticated } from "../middlewares/auth.js";

const router = express.Router();

router.get("/getall", getAllJobs);
router.post("/post", isAuthenticated, postJob);
router.get("/getmyjobs", isAuthenticated, getMyJobs);
router.put("/update/:id", isAuthenticated, updateJob);
router.delete("/delete/:id", isAuthenticated, deleteJob);
// Saved-job routes MUST precede "/:id" or "saved" would be read as a job id.
router.post("/save/:id", isAuthenticated, saveJob);
router.delete("/save/:id", isAuthenticated, unsaveJob);
router.get("/saved", isAuthenticated, getSavedJobs);
router.get("/:id", isAuthenticated, getSingleJob);

export default router;
