import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { fadeIn, staggerContainer } from "../../utils/animations";
import api from "../../utils/api";
import Skeleton from "../ui/Skeleton";
import EmptyState from "../ui/EmptyState";
import { MapPin, CalendarDays, ArrowRight, RefreshCw } from "lucide-react";

export const salaryLabel = (job) => {
  if (job.fixedSalary) return `₹${Number(job.fixedSalary).toLocaleString("en-IN")}`;
  if (job.salaryFrom && job.salaryTo) {
    return `₹${Number(job.salaryFrom).toLocaleString("en-IN")} – ₹${Number(job.salaryTo).toLocaleString("en-IN")}`;
  }
  return "Not disclosed";
};

const postedLabel = (iso) => {
  if (!iso) return "";
  const days = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
  if (days === 0) return "Posted today";
  if (days === 1) return "Posted yesterday";
  if (days < 30) return `Posted ${days} days ago`;
  return `Posted on ${new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
};

const JobCard = ({ job }) => (
  <article className="flex flex-col bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-900/60 transition-all duration-300 h-full">
    <div className="flex items-start justify-between gap-3 mb-3">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-snug">
        {job.title}
      </h3>
      <span className="flex-shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
        {job.jobType}
      </span>
    </div>
    <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mb-3">
      <MapPin size={14} aria-hidden="true" />
      {job.city}, {job.country} · {job.category}
    </p>
    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-4">
      {salaryLabel(job)}
    </p>
    <div className="mt-auto flex items-center justify-between text-sm">
      <span className="text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
        <CalendarDays size={14} aria-hidden="true" />
        {postedLabel(job.jobPostedOn)}
      </span>
      <Link
        to={`/job/${job._id}`}
        className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
      >
        View <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </div>
  </article>
);

const FeaturedJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [state, setState] = useState("loading"); // loading | ready | error

  const load = async () => {
    setState("loading");
    try {
      const { data } = await api.get("/job/getall?limit=6");
      setJobs(data.jobs || []);
      setState("ready");
    } catch (error) {
      setState("error");
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <section
      aria-labelledby="featured-jobs-heading"
      className="py-20 bg-white dark:bg-gray-900 transition-colors duration-300"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={fadeIn("up")}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="text-center mb-12"
        >
          <h2
            id="featured-jobs-heading"
            className="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl tracking-tight"
          >
            Latest Jobs
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-gray-500 dark:text-gray-400 mx-auto">
            Fresh openings posted by employers on CareerBridge, updated live.
          </p>
        </motion.div>

        {state === "loading" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        )}

        {state === "error" && (
          <div className="max-w-xl mx-auto">
            <EmptyState
              title="We couldn't load jobs right now"
              description="Something went wrong while fetching the latest openings. Please try again in a moment."
              action={
                <button
                  onClick={load}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                  <RefreshCw size={16} aria-hidden="true" /> Try again
                </button>
              }
            />
          </div>
        )}

        {state === "ready" && jobs.length === 0 && (
          <div className="max-w-xl mx-auto">
            <EmptyState
              title="No jobs posted yet"
              description="Be the first — employers can post a job in minutes and start receiving AI-scored applicants."
              action={
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
                >
                  Post the first job
                </Link>
              }
            />
          </div>
        )}

        {state === "ready" && jobs.length > 0 && (
          <motion.div
            variants={staggerContainer(0.08)}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {jobs.map((job) => (
              <motion.div key={job._id} variants={fadeIn("up")} className="h-full">
                <JobCard job={job} />
              </motion.div>
            ))}
          </motion.div>
        )}

        {state === "ready" && jobs.length > 0 && (
          <div className="mt-10 text-center">
            <Link
              to="/job/getall"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-semibold hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Browse all jobs <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedJobs;
