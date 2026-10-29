import React, { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { fadeIn, staggerContainer } from "../../utils/animations";
import { Context } from "../../main";
import { Search, MapPin, Briefcase, Sparkles, ArrowRight } from "lucide-react";

const JOB_TYPES = ["", "Remote", "Internship", "Full-time"];
const QUICK_CHIPS = ["Remote", "Internship", "Full-time"];

const HeroSection = () => {
  const navigate = useNavigate();
  const { isAuthorized, user } = useContext(Context);
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [jobType, setJobType] = useState("");

  const goToJobs = (params) => {
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v))
    ).toString();
    navigate(`/job/getall${query ? `?${query}` : ""}`);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    goToJobs({ search: keyword.trim(), location: location.trim(), jobType });
  };

  const dashboardLink =
    user && user.role === "Employer" ? "/recruiter/dashboard" : "/candidate/dashboard";

  return (
    <section
      aria-labelledby="hero-heading"
      className="relative overflow-hidden pt-24 pb-20 sm:pt-28 sm:pb-24 bg-gradient-to-br from-blue-50 via-indigo-50 to-white dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 transition-colors duration-300"
    >
      {/* Decorative gradient blobs */}
      <div aria-hidden="true" className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-blue-400/20 dark:bg-blue-600/10 blur-3xl" />
      <div aria-hidden="true" className="absolute -bottom-32 -left-24 w-96 h-96 rounded-full bg-indigo-400/20 dark:bg-indigo-600/10 blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={staggerContainer(0.15)}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
        >
          {/* Copy + search */}
          <div className="text-center lg:text-left">
            <motion.p
              variants={fadeIn("up")}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 mb-6"
            >
              <Sparkles size={14} aria-hidden="true" /> Powered by Groq AI
            </motion.p>

            <motion.h1
              variants={fadeIn("up")}
              id="hero-heading"
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-tight"
            >
              Find Jobs That Match{" "}
              <span className="text-blue-600 dark:text-blue-400">Your True Potential</span>
            </motion.h1>

            <motion.p
              variants={fadeIn("up", 0.1)}
              className="mt-6 text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto lg:mx-0"
            >
              Stop blindly applying. Upload your resume and let our AI instantly
              discover opportunities that fit your skills, experience, and career
              trajectory.
            </motion.p>

            {/* Search bar */}
            <motion.form
              variants={fadeIn("up", 0.15)}
              onSubmit={handleSearch}
              role="search"
              aria-label="Job search"
              className="mt-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-3 flex flex-col sm:flex-row gap-3"
            >
              <div className="flex items-center flex-1 gap-2 px-3 py-2">
                <Search size={18} className="text-gray-400 flex-shrink-0" aria-hidden="true" />
                <label htmlFor="hero-keyword" className="sr-only">Keyword</label>
                <input
                  id="hero-keyword"
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Job title or keyword"
                  className="w-full bg-transparent border-0 focus:ring-0 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none"
                />
              </div>
              <div className="hidden sm:block w-px bg-gray-200 dark:bg-gray-700 self-stretch" aria-hidden="true" />
              <div className="flex items-center flex-1 gap-2 px-3 py-2">
                <MapPin size={18} className="text-gray-400 flex-shrink-0" aria-hidden="true" />
                <label htmlFor="hero-location" className="sr-only">Location</label>
                <input
                  id="hero-location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Location"
                  className="w-full bg-transparent border-0 focus:ring-0 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none"
                />
              </div>
              <div className="hidden sm:block w-px bg-gray-200 dark:bg-gray-700 self-stretch" aria-hidden="true" />
              <div className="flex items-center gap-2 px-3 py-2">
                <Briefcase size={18} className="text-gray-400 flex-shrink-0" aria-hidden="true" />
                <label htmlFor="hero-jobtype" className="sr-only">Job type</label>
                <select
                  id="hero-jobtype"
                  value={jobType}
                  onChange={(e) => setJobType(e.target.value)}
                  className="bg-transparent border-0 focus:ring-0 text-gray-900 dark:text-white outline-none pr-6"
                >
                  {JOB_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type || "Any type"}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-800"
              >
                Search
              </button>
            </motion.form>

            {/* Quick filter chips */}
            <motion.div variants={fadeIn("up", 0.2)} className="mt-4 flex flex-wrap justify-center lg:justify-start gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400 self-center mr-1">Quick filters:</span>
              {QUICK_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => goToJobs({ jobType: chip })}
                  className="px-4 py-1.5 rounded-full text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  {chip}
                </button>
              ))}
            </motion.div>

            {/* CTAs */}
            <motion.div variants={fadeIn("up", 0.25)} className="mt-8 flex flex-col sm:flex-row justify-center lg:justify-start gap-4">
              <button
                type="button"
                onClick={() => goToJobs({})}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold hover:opacity-90 transition-opacity shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                Find Jobs <ArrowRight size={18} aria-hidden="true" />
              </button>
              {isAuthorized ? (
                <Link
                  to={dashboardLink}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-semibold hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  My Dashboard
                </Link>
              ) : (
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-blue-600 text-blue-600 dark:border-blue-400 font-semibold hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  Post a Job
                </Link>
              )}
            </motion.div>

            {/* Trust line */}
            <motion.p variants={fadeIn("up", 0.3)} className="mt-6 text-sm text-gray-500 dark:text-gray-400">
              Join <span className="font-semibold text-gray-700 dark:text-gray-200">12,000+</span> job
              seekers and <span className="font-semibold text-gray-700 dark:text-gray-200">850+</span>{" "}
              companies already hiring on CareerBridge.
            </motion.p>
          </div>

          {/* Illustration: gradient visual with floating match cards */}
          <motion.div
            variants={fadeIn("right", 0.2)}
            aria-hidden="true"
            className="hidden lg:block"
          >
            <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-8 shadow-2xl">
              <div className="bg-white/95 dark:bg-gray-900/95 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">AI Match</span>
                  <span className="text-2xl font-extrabold text-gray-900 dark:text-white">94%</span>
                </div>
                <p className="font-semibold text-gray-900 dark:text-white">Senior React Developer</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Match based on 12 shared skills</p>
                <div className="mt-3 h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                  <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 w-[94%]" />
                </div>
              </div>
              <div className="absolute -bottom-6 -left-6 bg-white/95 dark:bg-gray-900/95 rounded-2xl p-4 shadow-xl w-56">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Skill Gap</span>
                  <span className="text-lg font-extrabold text-gray-900 dark:text-white">2</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">Missing: Docker, AWS</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
