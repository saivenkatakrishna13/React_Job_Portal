import mongoose from "mongoose";

const savedJobSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },
    job: {
      type: mongoose.Schema.ObjectId,
      ref: "Job",
      required: true,
    },
  },
  { timestamps: true }
);

// Idempotent saves: one row per (user, job); duplicates are rejected at the
// database level and the controller treats that as "already saved" -> 200.
savedJobSchema.index(
  { user: 1, job: 1 },
  { unique: true, name: "user_job_unique" }
);

export const SavedJob = mongoose.model("SavedJob", savedJobSchema);
