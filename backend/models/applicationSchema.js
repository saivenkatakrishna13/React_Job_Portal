import mongoose from "mongoose";
import validator from "validator";

const applicationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please enter your Name!"],
    minLength: [3, "Name must contain at least 3 Characters!"],
    maxLength: [30, "Name cannot exceed 30 Characters!"],
  },
  email: {
    type: String,
    required: [true, "Please enter your Email!"],
    validate: [validator.isEmail, "Please provide a valid Email!"],
  },
  coverLetter: {
    type: String,
    required: [true, "Please provide a cover letter!"],
  },
  phone: {
    type: Number,
    required: [true, "Please enter your Phone Number!"],
  },
  address: {
    type: String,
    required: [true, "Please enter your Address!"],
  },
  resume: {
    public_id: {
      type: String, 
      required: true,
    },
    url: {
      type: String, 
      required: true,
    },
  },
  applicantID: {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["Job Seeker"],
      required: true,
    },
  },
  employerID: {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["Employer"],
      required: true,
    },
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Job",
    required: true,
  },
  status: {
    type: String,
    enum: ["Applied", "Under Review", "Shortlisted", "Interview", "Selected", "Rejected"],
    default: "Applied",
  },
  statusHistory: [
    {
      status: String,
      changedAt: { type: Date, default: Date.now },
      changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    }
  ],
  aiMatchScore: {
    type: Number,
  },
  matchingSkills: {
    type: [String],
  },
  missingSkills: {
    type: [String],
  },
  aiExplanation: {
    type: String,
  },
  // Background AI scoring lifecycle (Part C Phase 4): set to "pending" at
  // creation when scoring can run, then "done"/"failed" by the background
  // task; "skipped" when there is no resume text/analysis to score against.
  aiStatus: {
    type: String,
    enum: ["pending", "done", "failed", "skipped"],
    default: "skipped",
  }
}, { timestamps: true });

// One application per candidate per job — enforced at the database level
// (Part A #10). The controller check keeps the exact "You have already applied
// to this job." message; this index catches races and direct writes.
applicationSchema.index(
  { jobId: 1, "applicantID.user": 1 },
  { unique: true, name: "job_applicant_unique" }
);

export const Application = mongoose.model("Application", applicationSchema);
