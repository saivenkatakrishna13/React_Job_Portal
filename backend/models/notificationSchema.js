import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    // Recipient (the user who is notified)
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["new-applicant", "status-changed"],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    application: {
      type: mongoose.Schema.ObjectId,
      ref: "Application",
    },
    job: {
      type: mongoose.Schema.ObjectId,
      ref: "Job",
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 });

export const Notification = mongoose.model("Notification", notificationSchema);
