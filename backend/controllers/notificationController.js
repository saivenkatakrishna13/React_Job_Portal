import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import { Notification } from "../models/notificationSchema.js";

export const getMyNotifications = catchAsyncErrors(async (req, res, next) => {
  const notifications = await Notification.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50);
  const unreadCount = await Notification.countDocuments({
    user: req.user._id,
    read: false,
  });

  res.status(200).json({
    success: true,
    notifications,
    unreadCount,
  });
});

export const markAllRead = catchAsyncErrors(async (req, res, next) => {
  await Notification.updateMany(
    { user: req.user._id, read: false },
    { $set: { read: true } }
  );

  res.status(200).json({
    success: true,
    message: "All notifications marked as read.",
  });
});
