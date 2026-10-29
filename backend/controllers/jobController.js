import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import { Job } from "../models/jobSchema.js";
import { SavedJob } from "../models/savedJobSchema.js";
import ErrorHandler from "../middlewares/error.js";

// Escape user input before it is used in a $regex, so characters like
// "(" or "[" are treated literally instead of throwing a bad-regex error.
const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const getAllJobs = catchAsyncErrors(async (req, res, next) => {
  const { search, category, location, jobType, experienceLevel, salaryMin, salaryMax, skills, page = 1, limit = 10 } = req.query;
  
  let query = { expired: false };

  // Past-deadline jobs behave as expired (Part A #11). `{deadline: null}`
  // also matches documents without a deadline, so they stay open. Lives in
  // its own $and clause so it composes with the search $or and the salary
  // filter below (salary pushes onto the same $and array).
  query.$and = [
    { $or: [{ deadline: null }, { deadline: { $gte: new Date() } }] },
  ];

  if (search) {
    const searchRegex = escapeRegex(search);
    query.$or = [
      { title: { $regex: searchRegex, $options: "i" } },
      { description: { $regex: searchRegex, $options: "i" } },
    ];
  }

  if (category) query.category = category;
  if (location) query.location = { $regex: escapeRegex(location), $options: "i" };
  if (jobType) query.jobType = jobType;
  if (experienceLevel) query.experienceLevel = experienceLevel;
  
  if (salaryMin || salaryMax) {
    // Salary lives in its own $and clause so it combines with the search
    // $or as AND, instead of colliding with it (same deep semantics as before).
    let fixedSalaryQuery = {};
    if (salaryMin) fixedSalaryQuery.$gte = Number(salaryMin);
    if (salaryMax) fixedSalaryQuery.$lte = Number(salaryMax);

    const salaryRangeQuery = {
      salaryFrom: { $lte: salaryMax ? Number(salaryMax) : 9999999 },
      salaryTo: { $gte: salaryMin ? Number(salaryMin) : 0 },
    };

    query.$and = query.$and || [];
    query.$and.push({ $or: [{ fixedSalary: fixedSalaryQuery }, salaryRangeQuery] });
  }

  if (skills) {
    const skillsArray = skills.split(",").map((s) => s.trim());
    query.requiredSkills = { $in: skillsArray };
  }

  const skip = (Number(page) - 1) * Number(limit);
  
  const jobs = await Job.find(query).skip(skip).limit(Number(limit));
  const totalJobs = await Job.countDocuments(query);

  res.status(200).json({
    success: true,
    jobs,
    totalJobs,
    totalPages: Math.ceil(totalJobs / Number(limit)),
    currentPage: Number(page),
  });
});

export const postJob = catchAsyncErrors(async (req, res, next) => {
  const { role } = req.user;
  if (role === "Job Seeker") {
    return next(
      new ErrorHandler("Job Seeker not allowed to access this resource.", 400)
    );
  }
  const {
    title,
    description,
    category,
    country,
    city,
    location,
    fixedSalary,
    salaryFrom,
    salaryTo,
    requiredSkills,
    jobType,
    experienceLevel,
    deadline,
  } = req.body;

  if (!title || !description || !category || !country || !city || !location) {
    return next(new ErrorHandler("Please provide full job details.", 400));
  }

  if ((!salaryFrom || !salaryTo) && !fixedSalary) {
    return next(
      new ErrorHandler(
        "Please either provide fixed salary or ranged salary.",
        400
      )
    );
  }

  if (salaryFrom && salaryTo && fixedSalary) {
    return next(
      new ErrorHandler("Cannot Enter Fixed and Ranged Salary together.", 400)
    );
  }
  const postedBy = req.user._id;
  const job = await Job.create({
    title,
    description,
    category,
    country,
    city,
    location,
    fixedSalary,
    salaryFrom,
    salaryTo,
    requiredSkills,
    jobType,
    experienceLevel,
    deadline,
    postedBy,
  });
  res.status(200).json({
    success: true,
    message: "Job Posted Successfully!",
    job,
  });
});

export const getMyJobs = catchAsyncErrors(async (req, res, next) => {
  const { role } = req.user;
  if (role === "Job Seeker") {
    return next(
      new ErrorHandler("Job Seeker not allowed to access this resource.", 400)
    );
  }
  const myJobs = await Job.find({ postedBy: req.user._id });
  res.status(200).json({
    success: true,
    myJobs,
  });
});

export const updateJob = catchAsyncErrors(async (req, res, next) => {
  const { role } = req.user;
  if (role === "Job Seeker") {
    return next(
      new ErrorHandler("Job Seeker not allowed to access this resource.", 400)
    );
  }
  const { id } = req.params;
  let job = await Job.findById(id);
  if (!job) {
    return next(new ErrorHandler("OOPS! Job not found.", 404));
  }
  // Only the employer who owns the job can update it
  if (job.postedBy.toString() !== req.user._id.toString()) {
    return next(new ErrorHandler("You are not authorized to update this job.", 403));
  }
  // Only an allow-list of job fields may be updated — never postedBy/_id/
  // jobPostedOn or anything a client simply stuffed into the body.
  const allowedUpdates = [
    "title",
    "description",
    "category",
    "country",
    "city",
    "location",
    "fixedSalary",
    "salaryFrom",
    "salaryTo",
    "expired",
    "deadline",
    "requiredSkills",
    "jobType",
    "experienceLevel",
  ];
  const updates = {};
  for (const key of allowedUpdates) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  job = await Job.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });
  res.status(200).json({
    success: true,
    message: "Job Updated!",
    job,
  });
});

export const deleteJob = catchAsyncErrors(async (req, res, next) => {
  const { role } = req.user;
  if (role === "Job Seeker") {
    return next(
      new ErrorHandler("Job Seeker not allowed to access this resource.", 400)
    );
  }
  const { id } = req.params;
  const job = await Job.findById(id);
  if (!job) {
    return next(new ErrorHandler("OOPS! Job not found.", 404));
  }
  // Only the employer who owns the job can delete it
  if (job.postedBy.toString() !== req.user._id.toString()) {
    return next(new ErrorHandler("You are not authorized to delete this job.", 403));
  }
  await job.deleteOne();
  res.status(200).json({
    success: true,
    message: "Job Deleted!",
  });
});

export const getSingleJob = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  try {
    const job = await Job.findById(id);
    if (!job) {
      return next(new ErrorHandler("Job not found.", 404));
    }
    res.status(200).json({
      success: true,
      job,
    });
  } catch (error) {
    return next(new ErrorHandler(`Invalid ID / CastError`, 404));
  }
});

// ---- Saved jobs (Part C Phase 6, seeker-only) ----

export const saveJob = catchAsyncErrors(async (req, res, next) => {
  if (req.user.role === "Employer") {
    return next(new ErrorHandler("Employer not allowed to access this resource.", 400));
  }
  const { id } = req.params;
  const job = await Job.findById(id);
  if (!job) {
    return next(new ErrorHandler("OOPS! Job not found.", 404));
  }
  try {
    await SavedJob.create({ user: req.user._id, job: id });
  } catch (error) {
    // Duplicate = already saved -> idempotent 200, anything else is real.
    if (error.code !== 11000) throw error;
  }
  res.status(200).json({
    success: true,
    message: "Job saved.",
    saved: true,
  });
});

export const unsaveJob = catchAsyncErrors(async (req, res, next) => {
  if (req.user.role === "Employer") {
    return next(new ErrorHandler("Employer not allowed to access this resource.", 400));
  }
  // deleteMany on zero matches is still a success -> idempotent 200
  await SavedJob.deleteMany({ user: req.user._id, job: req.params.id });
  res.status(200).json({
    success: true,
    message: "Job removed from saved.",
    saved: false,
  });
});

export const getSavedJobs = catchAsyncErrors(async (req, res, next) => {
  if (req.user.role === "Employer") {
    return next(new ErrorHandler("Employer not allowed to access this resource.", 400));
  }
  const rows = await SavedJob.find({ user: req.user._id }).sort({ createdAt: -1 });
  const ids = rows.map((row) => row.job);
  // Jobs deleted since being saved simply drop out of the list.
  const jobs = ids.length ? await Job.find({ _id: { $in: ids } }) : [];
  res.status(200).json({
    success: true,
    jobs,
  });
});
