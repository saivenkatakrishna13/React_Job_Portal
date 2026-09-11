import React, { useContext, useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import api from "../../utils/api";
import { Context } from "../../main";
import { Sparkles, CheckCircle, XCircle, AlertCircle, RefreshCw, Briefcase, MapPin, DollarSign, Lightbulb } from "lucide-react";
import toast from "react-hot-toast";
import { motion, animate, useMotionValue, useTransform } from "framer-motion";
import { fadeIn } from "../../utils/animations";

function Counter({ from = 0, to }) {
  const count = useMotionValue(from);
  const rounded = useTransform(count, (latest) => Math.round(latest));

  useEffect(() => {
    const controls = animate(count, to, { duration: 1.5, ease: "easeOut" });
    return controls.stop;
  }, [to]);

  return <motion.span>{rounded}</motion.span>;
}

const JobDetails = () => {
  const { id } = useParams();
  const [job, setJob] = useState({});
  const [aiMatch, setAiMatch] = useState(null);
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const navigateTo = useNavigate();

  const { isAuthorized, user } = useContext(Context);

  useEffect(() => {
    api
      .get(`/job/${id}`)
      .then((res) => {
        setJob(res.data.job);
        // Automatically check match if user is a Job Seeker and has a resume
        if (user?.role === "Job Seeker" && user?.resumeText) {
          checkMatch(res.data.job._id);
        }
      })
      .catch((error) => {
        navigateTo("/notfound");
      });

    // Check if user has already applied
    if (user?.role === "Job Seeker") {
      api
        .get("/application/jobseeker/getall")
        .then((res) => {
          const applied = res.data.applications.some(app => app.jobId._id === id || app.jobId === id);
          setHasApplied(applied);
        })
        .catch(() => {});
    }
  }, [id, navigateTo, user]);

  const checkMatch = async (jobId) => {
    setLoadingMatch(true);
    try {
      const res = await api.post("/ai/match-job", { jobId });
      setAiMatch(res.data.matchData);
    } catch (error) {
      console.error("AI Match failed", error);
    } finally {
      setLoadingMatch(false);
    }
  };

  const manuallyCheckMatch = () => {
    if (!user?.resumeText) {
      toast.error("Please upload your resume in the Dashboard first to get an AI Match score.");
      return;
    }
    checkMatch(job._id);
  };

  const handleApply = async () => {
    if (!user?.resumeText) {
      toast.error("Please upload your resume in the Dashboard before applying.");
      return;
    }
    
    setIsApplying(true);
    try {
      const { data } = await api.post("/application/post", { jobId: job._id });
      toast.success(data.message || "Application submitted successfully!");
      setHasApplied(true);
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Something went wrong. Please try again later.";
      toast.error(errorMessage);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <section className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 py-12 px-4 sm:px-6 lg:px-8 mt-16">
      <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-8">
        
        {/* Main Job Details */}
        <motion.div 
          variants={fadeIn("right")}
          initial="hidden"
          animate="show"
          className="flex-grow bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700"
        >
          <div className="px-6 py-8 sm:p-10 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
            <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">{job.title}</h3>
            <p className="mt-2 text-lg text-blue-600 dark:text-blue-400 font-medium">{job.category}</p>
          </div>
          
          <div className="px-6 py-8 sm:p-10">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center"><MapPin size={16} className="mr-1" /> Location</dt>
                <dd className="mt-1 text-base text-gray-900 dark:text-white">{job.city}, {job.country}</dd>
              </div>
              
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center"><Briefcase size={16} className="mr-1" /> Job Type & Level</dt>
                <dd className="mt-1 text-base text-gray-900 dark:text-white">{job.jobType} &bull; {job.experienceLevel}</dd>
              </div>

              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center"><DollarSign size={16} className="mr-1" /> Salary</dt>
                <dd className="mt-1 text-base text-gray-900 dark:text-white">
                  {job.fixedSalary ? (
                    <span>${job.fixedSalary}</span>
                  ) : (
                    <span>
                      ${job.salaryFrom} - ${job.salaryTo}
                    </span>
                  )}
                </dd>
              </div>

              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Required Skills</dt>
                <dd className="mt-1 flex flex-wrap gap-2">
                  {job.requiredSkills && job.requiredSkills.map((skill, index) => (
                    <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      {skill}
                    </span>
                  ))}
                </dd>
              </div>

              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Description</dt>
                <dd className="mt-2 text-base text-gray-900 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{job.description}</dd>
              </div>

              <div className="sm:col-span-2 border-t border-gray-200 dark:border-gray-700 pt-6">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Posted On</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">{job.jobPostedOn ? new Date(job.jobPostedOn).toLocaleDateString() : 'Recently'}</dd>
              </div>
            </dl>

            <div className="mt-10 flex justify-end border-t border-gray-200 dark:border-gray-700 pt-6">
              {user && user.role === "Employer" ? (
                <span className="text-gray-500 dark:text-gray-400 text-sm italic">You are viewing this as an Employer.</span>
              ) : (
                <button 
                  onClick={handleApply}
                  disabled={hasApplied || isApplying}
                  className={`inline-flex items-center px-8 py-4 border border-transparent text-lg font-bold rounded-lg shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors
                    ${hasApplied 
                      ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'}`}
                >
                  {isApplying ? "Applying..." : hasApplied ? "Already Applied" : "Apply Now"}
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* AI Match Sidebar */}
        {user?.role === "Job Seeker" && (
          <motion.div 
            variants={fadeIn("left")}
            initial="hidden"
            animate="show"
            className="w-full lg:w-80 flex-shrink-0 space-y-6"
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700">
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                  <Sparkles className="mr-2 text-green-600 dark:text-green-400" size={20} /> Your AI Match
                </h3>
              </div>
              
              <div className="p-6">
                {loadingMatch ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <RefreshCw className="animate-spin h-8 w-8 text-green-500 mb-4" />
                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Analyzing match potential...</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">NVIDIA NIM is comparing your skills to the job description.</p>
                  </div>
                ) : aiMatch ? (
                  <div>
                    <div className="flex flex-col items-center justify-center mb-6">
                      <div className="relative inline-flex items-center justify-center">
                        <svg className="w-32 h-32 transform -rotate-90">
                          <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-gray-200 dark:text-gray-700" />
                          <motion.circle 
                            cx="64" cy="64" r="56" 
                            stroke="currentColor" 
                            strokeWidth="12" 
                            fill="transparent" 
                            strokeDasharray="351.858" 
                            initial={{ strokeDashoffset: 351.858 }}
                            animate={{ strokeDashoffset: 351.858 - (351.858 * (aiMatch.matchScore || aiMatch.score || 0)) / 100 }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className={
                              (aiMatch.matchScore || aiMatch.score || 0) >= 80 ? "text-green-500" :
                              (aiMatch.matchScore || aiMatch.score || 0) >= 60 ? "text-yellow-500" : "text-red-500"
                            } 
                          />
                        </svg>
                        <span className="absolute text-3xl font-extrabold text-gray-900 dark:text-white">
                          <Counter to={aiMatch.matchScore || aiMatch.score || 0} />%
                        </span>
                      </div>
                      <p className="mt-2 font-bold text-gray-800 dark:text-gray-200">
                        {(aiMatch.matchScore || aiMatch.score || 0) >= 80 ? "Excellent Match" :
                         (aiMatch.matchScore || aiMatch.score || 0) >= 60 ? "Good Match" : "Fair Match"}
                      </p>
                    </div>

                    <div className="space-y-4 border-t border-gray-100 dark:border-gray-700 pt-4">
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Matching Skills</h4>
                        {aiMatch.matchingSkills?.length > 0 ? (
                          <ul className="space-y-1">
                            {aiMatch.matchingSkills.map((skill, i) => (
                              <li key={i} className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                                <CheckCircle className="text-green-500 mr-2 shrink-0" size={16} />
                                {skill}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-gray-500 dark:text-gray-400">None detected</p>
                        )}
                      </div>

                      <div className="pt-2">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Missing Skills</h4>
                        {aiMatch.missingSkills?.length > 0 ? (
                          <ul className="space-y-1">
                            {aiMatch.missingSkills.map((skill, i) => (
                              <li key={i} className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                                <XCircle className="text-red-400 mr-2 shrink-0" size={16} />
                                {skill}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-green-600 dark:text-green-400 flex items-center">
                            <CheckCircle size={16} className="mr-1"/> You meet all requirements!
                          </p>
                        )}
                      </div>
                      
                      {aiMatch.explanation && (
                        <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 italic">
                          "{aiMatch.explanation}"
                        </div>
                      )}
                    </div>

                    {/* AI Interview Prep Link CTA */}
                    {aiMatch.missingSkills?.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-100 dark:border-blue-800">
                          <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300 flex items-center mb-2">
                            <Lightbulb size={16} className="mr-1" /> AI Interview Prep
                          </h4>
                          <p className="text-xs text-blue-800 dark:text-blue-400 mb-3">
                            You're missing some skills. Our AI suggests preparing to answer how you plan to learn <strong>{aiMatch.missingSkills[0]}</strong>.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <AlertCircle className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-3" />
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">See how well your resume matches this specific role before applying.</p>
                    <button 
                      onClick={manuallyCheckMatch}
                      className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none transition-colors"
                    >
                      Check My Match
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default JobDetails;
