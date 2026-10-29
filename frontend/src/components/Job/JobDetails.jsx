import React, { useContext, useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import api from "../../utils/api";
import { Context } from "../../main";
import { Sparkles, CheckCircle, XCircle, AlertCircle, RefreshCw, Briefcase, MapPin, DollarSign, Lightbulb, Bookmark, BookmarkCheck, CalendarClock, Target, MessageSquare } from "lucide-react";
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
  // Saved-job toggle (Part C Phase 9): server is the source of truth via GET /job/saved.
  const [isSaved, setIsSaved] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  // Skill-gap + interview-question panels, fetched on demand (never auto:
  // each is a real AI call).
  const [skillGap, setSkillGap] = useState(null);
  const [loadingGap, setLoadingGap] = useState(false);
  const [gapError, setGapError] = useState("");
  const [questions, setQuestions] = useState(null);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [questionsError, setQuestionsError] = useState("");
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

      // Saved state comes from the server so a reload keeps the bookmark.
      api
        .get("/job/saved")
        .then((res) => {
          setIsSaved((res.data.jobs || []).some((j) => j._id === id));
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

  const toggleSave = async () => {
    if (saveLoading) return;
    setSaveLoading(true);
    try {
      if (isSaved) {
        await api.delete(`/job/save/${id}`);
        setIsSaved(false);
        toast.success("Job removed from saved jobs.");
      } else {
        await api.post(`/job/save/${id}`);
        setIsSaved(true);
        toast.success("Job saved to your list.");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update saved job.");
    } finally {
      setSaveLoading(false);
    }
  };

  const analyzeSkillGap = async () => {
    if (!user?.resumeText) {
      toast.error("Please upload your resume in the Dashboard first to analyze the skill gap.");
      return;
    }
    setLoadingGap(true);
    setGapError("");
    try {
      const res = await api.post("/ai/skill-gap", { jobId: id });
      setSkillGap(res.data.skillGapData);
    } catch (error) {
      setGapError(error.response?.data?.message || "Skill gap analysis is unavailable right now. Please try again.");
    } finally {
      setLoadingGap(false);
    }
  };

  const generateQuestions = async () => {
    if (!user?.resumeText) {
      toast.error("Please upload your resume in the Dashboard first to generate interview questions.");
      return;
    }
    setLoadingQuestions(true);
    setQuestionsError("");
    try {
      const res = await api.post("/ai/interview-questions", { jobId: id });
      setQuestions(res.data.questions || []);
    } catch (error) {
      setQuestionsError(error.response?.data?.message || "Question generation is unavailable right now. Please try again.");
    } finally {
      setLoadingQuestions(false);
    }
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
                <div className="flex flex-col sm:flex-row sm:gap-12 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Posted On</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{job.jobPostedOn ? new Date(job.jobPostedOn).toLocaleDateString() : 'Recently'}</dd>
                  </div>
                  {job.deadline && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center"><CalendarClock size={16} className="mr-1" /> Application Deadline</dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                        {new Date(job.deadline).toLocaleDateString()}
                        {(() => {
                          const daysLeft = Math.ceil((new Date(job.deadline) - Date.now()) / 86400000);
                          if (daysLeft < 0) return <span className="ml-2 font-semibold text-red-500">Closed</span>;
                          if (daysLeft <= 7) return <span className="ml-2 font-semibold text-amber-600 dark:text-amber-400">Closes in {daysLeft} day{daysLeft === 1 ? "" : "s"}</span>;
                          return null;
                        })()}
                      </dd>
                    </div>
                  )}
                </div>
              </div>
            </dl>

            <div className="mt-10 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-t border-gray-200 dark:border-gray-700 pt-6">
              {user && user.role === "Employer" ? (
                <span className="text-gray-500 dark:text-gray-400 text-sm italic">You are viewing this as an Employer.</span>
              ) : (
                <>
                  <button
                    onClick={toggleSave}
                    disabled={saveLoading}
                    aria-pressed={isSaved}
                    className={`inline-flex items-center px-5 py-3 rounded-lg border text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed
                      ${isSaved
                        ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 focus:ring-blue-500'
                        : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-gray-400'}`}
                  >
                    {isSaved ? <BookmarkCheck size={18} className="mr-2" /> : <Bookmark size={18} className="mr-2" />}
                    {saveLoading ? "Saving..." : isSaved ? "Saved" : "Save Job"}
                  </button>
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
                </>
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
                    <p className="text-xs text-gray-500 dark:text-gray-400">Groq is comparing your skills to the job description.</p>
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

            {/* Skill Gap panel (Part C Phase 9): on-demand AI call */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700">
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                  <Target className="mr-2 text-amber-600 dark:text-amber-400" size={20} /> Skill Gap
                </h3>
              </div>
              <div className="p-6">
                {loadingGap ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <RefreshCw className="animate-spin h-7 w-7 text-amber-500 mb-3" />
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Comparing your resume to this role...</p>
                  </div>
                ) : skillGap ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">You Already Have</h4>
                      {skillGap.haveSkills?.length ? (
                        <div className="flex flex-wrap gap-2">
                          {skillGap.haveSkills.map((skill, i) => (
                            <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800">
                              {skill}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">None detected</p>
                      )}
                    </div>
                    <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Gaps to Close</h4>
                      {skillGap.missingSkills?.length ? (
                        <ul className="space-y-2">
                          {skillGap.missingSkills.map((skill, i) => (
                            <li key={i}>
                              <span className="flex items-center text-sm font-medium text-gray-800 dark:text-gray-200">
                                <XCircle className="text-amber-500 mr-2 shrink-0" size={15} />
                                {skill}
                              </span>
                              {skillGap.whyItMatters?.[skill] && (
                                <p className="ml-6 mt-0.5 text-xs text-gray-500 dark:text-gray-400">{skillGap.whyItMatters[skill]}</p>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-green-600 dark:text-green-400 flex items-center">
                          <CheckCircle size={16} className="mr-1" /> No gaps found for this role.
                        </p>
                      )}
                    </div>
                    <button
                      onClick={analyzeSkillGap}
                      className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 focus:outline-none transition-colors"
                    >
                      Re-analyze
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">See which skills you already have and which gaps to close before applying.</p>
                    <button
                      onClick={analyzeSkillGap}
                      className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 focus:outline-none transition-colors"
                    >
                      Analyze Skill Gap
                    </button>
                  </div>
                )}
                {gapError && (
                  <p role="alert" className="mt-3 text-xs text-red-500 text-center">{gapError}</p>
                )}
              </div>
            </div>

            {/* Interview questions panel (Part C Phase 9): on-demand AI call */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700">
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-sky-50 to-blue-50 dark:from-sky-900/20 dark:to-blue-900/20">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                  <MessageSquare className="mr-2 text-sky-600 dark:text-sky-400" size={20} /> Interview Prep
                </h3>
              </div>
              <div className="p-6">
                {loadingQuestions ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <RefreshCw className="animate-spin h-7 w-7 text-sky-500 mb-3" />
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Preparing questions for this role...</p>
                  </div>
                ) : questions?.length ? (
                  <div>
                    <ol className="space-y-4">
                      {questions.map((q, i) => (
                        <li key={i} className="border-b border-gray-100 dark:border-gray-700 pb-3 last:border-0 last:pb-0">
                          <div className="flex items-start gap-2">
                            <span className="shrink-0 h-5 w-5 rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 text-xs font-bold flex items-center justify-center">
                              {i + 1}
                            </span>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{q.question}</p>
                          </div>
                          {q.type && (
                            <span className="ml-7 mt-1.5 inline-block px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wide bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                              {q.type}
                            </span>
                          )}
                          {q.tip && (
                            <p className="ml-7 mt-1 text-xs text-gray-500 dark:text-gray-400 italic">Tip: {q.tip}</p>
                          )}
                        </li>
                      ))}
                    </ol>
                    <button
                      onClick={generateQuestions}
                      className="mt-4 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 focus:outline-none transition-colors"
                    >
                      Regenerate
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Get 6 tailored technical, behavioral and role-specific questions to practice before applying.</p>
                    <button
                      onClick={generateQuestions}
                      className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 focus:outline-none transition-colors"
                    >
                      Generate Interview Questions
                    </button>
                  </div>
                )}
                {questionsError && (
                  <p role="alert" className="mt-3 text-xs text-red-500 text-center">{questionsError}</p>
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
