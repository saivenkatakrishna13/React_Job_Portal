import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import { Job } from "../models/jobSchema.js";
import ErrorHandler from "../middlewares/error.js";

export const getAllJobs = catchAsyncErrors(async (req, res, next) => {
  const { search, category, location, jobType, experienceLevel, salaryMin, salaryMax, skills, page = 1, limit = 10 } = req.query;
  
  let query = { expired: false };

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  if (category) query.category = category;
  if (location) query.location = { $regex: location, $options: "i" };
  if (jobType) query.jobType = jobType;
  if (experienceLevel) query.experienceLevel = experienceLevel;
  
  if (salaryMin || salaryMax) {
    query.$or = query.$or || [];
    let salaryQuery = {};
    if (salaryMin) salaryQuery.$gte = Number(salaryMin);
    if (salaryMax) salaryQuery.$lte = Number(salaryMax);
    
    query.$or.push({ fixedSalary: salaryQuery });
    query.$or.push({ salaryFrom: { $lte: salaryMax || 9999999 }, salaryTo: { $gte: salaryMin || 0 } });
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
  job = await Job.findByIdAndUpdate(id, req.body, {
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
