import React, { useContext, useEffect, useState } from "react";
import api from "../../utils/api";
import { Link, Navigate } from "react-router-dom";
import { Context } from "../../main";
import { Search, Filter, MapPin, DollarSign, Sparkles, Briefcase, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { fadeIn, staggerContainer } from "../../utils/animations";

const Jobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isAuthorized, user } = useContext(Context);
  
  // Filter States
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [jobType, setJobType] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.append("search", search);
      if (category) queryParams.append("category", category);
      if (location) queryParams.append("location", location);
      if (jobType) queryParams.append("jobType", jobType);
      if (experienceLevel) queryParams.append("experienceLevel", experienceLevel);

      const res = await api.get(`/job/getall?${queryParams.toString()}`);
      setJobs(res.data.jobs || []);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchJobs();
  };

  const getMatchScore = (job) => {
    if (!user?.resumeAnalysis?.technicalSkills || !job.requiredSkills || job.requiredSkills.length === 0) {
      return null;
    }
    const userSkills = user.resumeAnalysis.technicalSkills.map(s => s.toLowerCase());
    const jobSkills = job.requiredSkills.map(s => s.toLowerCase());
    const matchCount = jobSkills.filter(s => userSkills.includes(s)).length;
    return Math.round((matchCount / jobSkills.length) * 100);
  };

  return (
    <section className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 py-12 px-4 sm:px-6 lg:px-8 mt-16">
      <div className="max-w-7xl mx-auto">
        <motion.div 
          variants={fadeIn("up")}
          initial="hidden"
          animate="show"
          className="text-center mb-10"
        >
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight sm:text-5xl">Explore Opportunities</h1>
          <p className="mt-4 text-xl text-gray-500 dark:text-gray-400">Discover your next career move with AI-powered matching.</p>
        </motion.div>

        {/* Search Bar */}
        <motion.form 
          variants={fadeIn("up", 0.1)}
          initial="hidden"
          animate="show"
          onSubmit={handleSearch} 
          className="mb-8"
        >
          <div className="flex shadow-md rounded-full bg-white dark:bg-gray-800 overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                type="text"
                placeholder="Search jobs by title or keyword..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="block w-full bg-white dark:bg-gray-800 pl-11 pr-3 py-4 border-transparent focus:ring-0 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 sm:text-lg"
              />
            </div>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-bold py-4 px-8 transition-colors">
              Search
            </button>
          </div>
        </motion.form>
        
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <motion.div 
            variants={fadeIn("right", 0.2)}
            initial="hidden"
            animate="show"
            className="w-full lg:w-1/4"
          >
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 sticky top-24 transition-colors duration-300">
              <div className="flex items-center mb-6 border-b border-gray-100 dark:border-gray-700 pb-4">
                <Filter className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-2" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Filters</h2>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 border px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-colors">
                    <option value="">All Categories</option>
                    <option value="Graphics & Design">Graphics & Design</option>
                    <option value="Mobile App Development">Mobile App Development</option>
                    <option value="Frontend Web Development">Frontend Web Development</option>
                    <option value="MERN Stack Development">MERN Stack Development</option>
                    <option value="Account & Finance">Account & Finance</option>
                    <option value="Artificial Intelligence">Artificial Intelligence</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Location</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MapPin className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    </div>
                    <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Remote, NY" className="block w-full pl-9 rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 border px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-colors" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Job Type</label>
                  <select value={jobType} onChange={(e) => setJobType(e.target.value)} className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 border px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-colors">
                    <option value="">Any Type</option>
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Internship">Internship</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Experience Level</label>
                  <select value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)} className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 border px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-colors">
                    <option value="">Any Level</option>
                    <option value="Entry">Entry Level</option>
                    <option value="Mid">Mid Level</option>
                    <option value="Senior">Senior Level</option>
                    <option value="Lead">Lead Level</option>
                  </select>
                </div>
                
                <button onClick={fetchJobs} className="w-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 font-bold py-2 px-4 rounded-lg transition-colors border border-blue-200 dark:border-blue-800">
                  Apply Filters
                </button>
              </div>
            </div>
          </motion.div>

          {/* Job Listings */}
          <motion.div 
            variants={fadeIn("left", 0.3)}
            initial="hidden"
            animate="show"
            className="w-full lg:w-3/4"
          >
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
              </div>
            ) : jobs.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center transition-colors">
                <Briefcase className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No jobs found</h3>
                <p className="text-gray-500 dark:text-gray-400">Try adjusting your search or filters to find what you're looking for.</p>
                <button onClick={() => {setSearch(''); setCategory(''); setLocation(''); setJobType(''); setExperienceLevel(''); fetchJobs();}} className="mt-6 text-blue-600 dark:text-blue-400 font-medium hover:underline">
                  Clear all filters
                </button>
              </div>
            ) : (
              <motion.div 
                variants={staggerContainer(0.1)}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 gap-6"
              >
                {jobs.map((element) => {
                  const matchScore = getMatchScore(element);
                  return (
                    <motion.div 
                      variants={fadeIn("up")}
                      className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 dark:border-gray-700 p-6 flex flex-col md:flex-row md:items-center justify-between group relative overflow-hidden" 
                      key={element._id}
                    >
                      <div className="flex-grow">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{element.title}</h3>
                          {user?.role === "Job Seeker" && matchScore !== null && (
                            <span className="hidden md:inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 shadow-sm transition-colors">
                              <Sparkles className="h-3 w-3 mr-1 text-green-500 dark:text-green-400" />
                              {matchScore}% Match
                            </span>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-y-2 text-sm text-gray-600 dark:text-gray-300 mb-4">
                          <span className="font-semibold text-gray-800 dark:text-gray-200 mr-4">Company Name</span>
                          <span className="flex items-center mr-4"><MapPin className="w-4 h-4 mr-1 text-gray-400 dark:text-gray-500" />{element.city}, {element.country}</span>
                          {element.fixedSalary ? (
                            <span className="flex items-center mr-4"><DollarSign className="w-4 h-4 mr-1 text-gray-400 dark:text-gray-500" />{element.fixedSalary}</span>
                          ) : element.salaryFrom && element.salaryTo ? (
                            <span className="flex items-center mr-4"><DollarSign className="w-4 h-4 mr-1 text-gray-400 dark:text-gray-500" />{element.salaryFrom} - {element.salaryTo}</span>
                          ) : null}
                          <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded text-xs transition-colors">{element.jobType || "Full-time"}</span>
                          <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded text-xs ml-2 transition-colors">{element.experienceLevel || "Mid Level"}</span>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mt-4">
                          {element.requiredSkills && element.requiredSkills.map((skill, index) => (
                            <span key={index} className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium rounded-md border border-blue-100 dark:border-blue-800 transition-colors">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div className="mt-6 md:mt-0 md:ml-6 flex-shrink-0 flex items-center justify-between">
                        {user?.role === "Job Seeker" && matchScore !== null && (
                          <span className="md:hidden inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 transition-colors">
                            <Sparkles className="h-3 w-3 mr-1" />
                            {matchScore}% Match
                          </span>
                        )}
                        <Link 
                          to={`/job/${element._id}`}
                          className="inline-flex items-center justify-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors shadow-sm ml-auto"
                        >
                          View Details <ChevronRight className="ml-1 w-4 h-4" />
                        </Link>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Jobs;
