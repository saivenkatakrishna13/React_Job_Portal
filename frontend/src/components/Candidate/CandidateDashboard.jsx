import React, { useContext, useState, useEffect, useRef } from "react";
import { Context } from "../../main";
import api from "../../utils/api";
import toast from "react-hot-toast";
import {
  FileText, Activity, Star, CheckCircle, XCircle,
  ChevronRight, UploadCloud, TrendingUp, AlertCircle, Loader2,
  RefreshCw, Zap, Award
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion, animate, useMotionValue, useTransform } from "framer-motion";
import { fadeIn, staggerContainer } from "../../utils/animations";

// Animated counter for score
function Counter({ from = 0, to }) {
  const count = useMotionValue(from);
  const rounded = useTransform(count, (latest) => Math.round(latest));
  useEffect(() => {
    const controls = animate(count, to, { duration: 1.5, ease: "easeOut" });
    return controls.stop;
  }, [to]);
  return <motion.span>{rounded}</motion.span>;
}

// Pipeline stage order
const STAGES = ["Applied", "Under Review", "Shortlisted", "Interview", "Selected"];

const stageColor = (stage, active, achieved) => {
  if (!achieved && !active) return "bg-gray-200 dark:bg-gray-700 ring-white dark:ring-gray-800";
  if (stage === "Selected") return "bg-green-500 ring-white dark:ring-gray-800";
  if (stage === "Rejected") return "bg-red-500 ring-white dark:ring-gray-800";
  return "bg-blue-600 ring-white dark:ring-gray-800";
};

const statusBadge = (status) => {
  const map = {
    "Applied": "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300",
    "Under Review": "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300",
    "Shortlisted": "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300",
    "Interview": "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300",
    "Selected": "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300",
    "Rejected": "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300",
  };
  return map[status] || map["Applied"];
};

const CandidateDashboard = () => {
  const { user, setUser } = useContext(Context);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [applications, setApplications] = useState([]);
  const [topMatches, setTopMatches] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const fileInputRef = useRef(null);

  // Skill overlap match score (local fast calculation)
  const getMatchScore = (job, userSkillsArray) => {
    if (!userSkillsArray || !job.requiredSkills || job.requiredSkills.length === 0) return 0;
    const userSkills = userSkillsArray.map(s => s.toLowerCase());
    const jobSkills = job.requiredSkills.map(s => s.toLowerCase());
    const matchCount = jobSkills.filter(s => userSkills.includes(s)).length;
    return Math.round((matchCount / jobSkills.length) * 100);
  };

  // Load data on mount + whenever user changes
  useEffect(() => {
    // Restore analysis from user context (persists across reloads via getUser)
    if (user?.resumeAnalysis) {
      setAnalysis(user.resumeAnalysis);
    }

    const fetchData = async () => {
      setDataLoading(true);
      try {
        const [appsRes, jobsRes] = await Promise.all([
          api.get("/application/jobseeker/getall"),
          api.get("/job/getall"),
        ]);

        const apps = appsRes.data.applications || [];
        setApplications(apps);

        const allJobs = jobsRes.data.jobs || [];
        const skills = user?.resumeAnalysis?.technicalSkills || [];

        if (skills.length > 0) {
          const scoredJobs = allJobs
            .map(job => ({ ...job, match: getMatchScore(job, skills) }))
            .filter(j => j.match > 0)
            .sort((a, b) => b.match - a.match);
          setTopMatches(scoredJobs.slice(0, 3));
        } else {
          setTopMatches(allJobs.slice(0, 3).map(j => ({ ...j, match: 0 })));
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      } finally {
        setDataLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
    } else if (selectedFile) {
      toast.error("Please upload a PDF file.");
      e.target.value = "";
    }
  };

  // Fix 1: Upload + analyze + refresh user context
  const uploadResume = async () => {
    if (!file) { toast.error("Please select a PDF file first."); return; }
    setLoading(true);
    const formData = new FormData();
    formData.append("resume", file);

    try {
      // Step 1: Upload PDF, extract text, save to user.resumeText
      await api.post("/user/upload-resume", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Resume uploaded! Running AI analysis...");

      // Step 2: NVIDIA NIM analyzes resumeText
      const aiRes = await api.post("/ai/analyze-resume");
      const freshAnalysis = aiRes.data.analysis;
      setAnalysis(freshAnalysis);

      // Step 3: Refresh user in global context so resumeAnalysis persists
      const userRes = await api.get("/user/getuser");
      setUser(userRes.data.user);

      toast.success("AI analysis complete! Your resume score is ready.");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Step 4: Re-score jobs with new skills
      const jobsRes = await api.get("/job/getall");
      const allJobs = jobsRes.data.jobs || [];
      const skills = freshAnalysis?.technicalSkills || [];
      if (skills.length > 0) {
        const scoredJobs = allJobs
          .map(job => ({ ...job, match: getMatchScore(job, skills) }))
          .filter(j => j.match > 0)
          .sort((a, b) => b.match - a.match);
        setTopMatches(scoredJobs.slice(0, 3));
      }
    } catch (error) {
      console.error("Upload/analysis error:", error);
      toast.error(error.response?.data?.message || "Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Fix 3: Compute pipeline stage from most recent application
  const mostRecentApp = applications[0] || null;
  const currentStageIndex = mostRecentApp
    ? STAGES.indexOf(mostRecentApp.status || "Applied")
    : -1;

  // Fix 2: Real top match count
  const realMatchCount = topMatches.filter(j => j.match > 0).length;

  return (
    <section className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 py-12 px-4 sm:px-6 lg:px-8 mt-16">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Welcome, {user?.name?.split(" ")[0] || "Candidate"}
            </h1>
            <p className="mt-1 text-gray-500 dark:text-gray-400">
              {analysis
                ? `Resume scored ${analysis.score}/100 · ${applications.length} active application${applications.length !== 1 ? "s" : ""}`
                : "Upload your resume to unlock AI-powered job matching."}
            </p>
          </div>
        </div>

        {/* Fix 2 — KPI Cards with real data */}
        <motion.div
          variants={staggerContainer(0.1)}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8"
        >
          {/* Resume Score */}
          <motion.div variants={fadeIn("up")} className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-2xl border border-gray-100 dark:border-gray-700 flex items-center p-6 hover:shadow-md transition-shadow">
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mr-5">
              <FileText size={28} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Resume Score</p>
              <div className="flex items-baseline">
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {analysis?.score ?? "--"}
                </p>
                <p className="ml-1 text-sm font-medium text-gray-500 dark:text-gray-400">/100</p>
              </div>
            </div>
          </motion.div>

          {/* Active Applications — REAL count */}
          <motion.div variants={fadeIn("up")} className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-2xl border border-gray-100 dark:border-gray-700 flex items-center p-6 hover:shadow-md transition-shadow">
            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 mr-5">
              <Activity size={28} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Active Applications</p>
              <div className="flex items-baseline">
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {dataLoading ? "..." : applications.length}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Top AI Matches — REAL count from skill overlap */}
          <motion.div variants={fadeIn("up")} className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-2xl border border-gray-100 dark:border-gray-700 flex items-center p-6 hover:shadow-md transition-shadow">
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 mr-5">
              <Star size={28} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">AI Job Matches</p>
              <div className="flex items-baseline">
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {analysis ? realMatchCount : "--"}
                </p>
                {!analysis && <p className="ml-2 text-xs text-gray-400 dark:text-gray-500">upload resume</p>}
              </div>
            </div>
          </motion.div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Column */}
          <motion.div variants={fadeIn("right", 0.2)} initial="hidden" animate="show" className="lg:col-span-2 space-y-8">

            {/* Resume Analyzer Widget */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                  <Zap className="mr-2 text-blue-600 dark:text-blue-400" size={20} />
                  AI Resume Analyzer
                </h3>
                {analysis && (
                  <button
                    onClick={() => { setAnalysis(null); setFile(null); }}
                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 transition-colors"
                  >
                    <RefreshCw size={12} /> Re-upload
                  </button>
                )}
              </div>
              <div className="p-6">
                {!analysis ? (
                  <div className="text-center py-8">
                    {loading ? (
                      <>
                        <Loader2 className="mx-auto h-12 w-12 text-blue-500 animate-spin mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                          NVIDIA NIM is analyzing your resume...
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-2 max-w-sm mx-auto text-sm">
                          Extracting skills, scoring experience, computing job compatibility.
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">This takes 10–20 seconds</p>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                          Upload your resume for AI insights
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto text-sm">
                          Get a score, extract your skills, and let NVIDIA NIM match you with perfect jobs.
                        </p>
                        <div className="flex flex-col items-center max-w-xs mx-auto gap-3">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf"
                            onChange={handleFileChange}
                            className="block w-full text-sm text-gray-500 dark:text-gray-400
                              file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0
                              file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/30
                              file:text-blue-700 dark:file:text-blue-400 hover:file:bg-blue-100
                              dark:hover:file:bg-blue-900/50 cursor-pointer"
                          />
                          {file && (
                            <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                              ✓ {file.name}
                            </p>
                          )}
                          <button
                            onClick={uploadResume}
                            disabled={loading || !file}
                            className="w-full inline-flex justify-center items-center px-4 py-2.5 border border-transparent
                              rounded-full shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700
                              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                              disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {file ? "Analyze Resume with AI" : "Select a PDF first"}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="flex flex-wrap md:flex-nowrap gap-6">
                      {/* Score Ring */}
                      <div className="w-full md:w-1/3 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-100 dark:border-blue-900/30">
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
                              animate={{ strokeDashoffset: 351.858 - (351.858 * (analysis.score || 0)) / 100 }}
                              transition={{ duration: 1.5, ease: "easeOut" }}
                              className={analysis.score >= 80 ? "text-green-500" : analysis.score >= 60 ? "text-yellow-500" : "text-blue-600 dark:text-blue-400"}
                            />
                          </svg>
                          <span className="absolute text-3xl font-extrabold text-blue-700 dark:text-blue-400">
                            <Counter to={analysis.score || 0} />
                          </span>
                        </div>
                        <p className="mt-4 font-bold text-gray-800 dark:text-gray-200 text-lg">Overall Score</p>
                        <div className="mt-2 text-center">
                          <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
                            {analysis.candidateType || "Student / Entry Level"}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
                            Professional Experience: {analysis.experienceYears || 0} years
                          </p>
                        </div>
                      </div>

                      {/* Skills + Strengths + Suggested */}
                      <div className="w-full md:w-2/3 space-y-4">
                        <div>
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-2 flex items-center">
                            <CheckCircle className="text-green-500 mr-2" size={16} /> Technical Skills
                          </h4>
                          <motion.div variants={staggerContainer(0.05)} initial="hidden" animate="show" className="flex flex-wrap gap-2">
                            {analysis.technicalSkills?.slice(0, 10).map((skill, i) => (
                              <motion.span variants={fadeIn("up")} key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                                {skill}
                              </motion.span>
                            ))}
                          </motion.div>
                        </div>

                        {analysis.strengths?.length > 0 && (
                          <div className="pt-2">
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-2 flex items-center">
                              <TrendingUp className="text-blue-500 mr-2" size={16} /> Strengths
                            </h4>
                            <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1 list-disc pl-5">
                              {analysis.strengths.slice(0, 3).map((s, i) => <li key={i}>{s}</li>)}
                            </ul>
                          </div>
                        )}

                        {analysis.education?.length > 0 && (
                          <div className="pt-2">
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-2 flex items-center">
                              <Award className="text-purple-500 mr-2" size={16} /> Education
                            </h4>
                            <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                              {analysis.education.map((edu, i) => (
                                <li key={i} className="bg-purple-50 dark:bg-purple-900/10 p-2 rounded-lg border border-purple-100 dark:border-purple-800">
                                  <span className="font-semibold">{edu.degree} {edu.field ? `in ${edu.field}` : ""}</span>
                                  <br/>
                                  <span className="text-xs text-gray-500">{edu.institution} {edu.year ? `(${edu.year})` : ""}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {analysis.projects?.length > 0 && (
                          <div className="pt-2">
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-2 flex items-center">
                              <Activity className="text-indigo-500 mr-2" size={16} /> Projects
                            </h4>
                            <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                              {analysis.projects.map((proj, i) => (
                                <li key={i} className="bg-indigo-50 dark:bg-indigo-900/10 p-2 rounded-lg border border-indigo-100 dark:border-indigo-800">
                                  <span className="font-semibold">{proj.name}</span>
                                  {proj.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{proj.description}</p>}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {analysis.suggestedSkills?.length > 0 && (
                          <div className="pt-2">
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-2 flex items-center">
                              <AlertCircle className="text-red-500 mr-2" size={16} /> Skill Gaps
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {analysis.suggestedSkills.slice(0, 6).map((skill, i) => (
                                <span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Fix 3 — Application Pipeline driven by real status */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Your Application Pipeline</h3>
                <Link to="/applications/me" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500">View all</Link>
              </div>
              <div className="p-6">
                {applications.length === 0 ? (
                  <div className="text-center py-6">
                    <Award className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">No applications yet. Browse jobs and apply!</p>
                    <Link to="/job/getall" className="mt-3 inline-block text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">Browse Jobs →</Link>
                  </div>
                ) : (
                  <>
                    {/* Pipeline visual — driven by most recent application status */}
                    <div className="mb-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                        Most recent: <span className="font-semibold text-gray-700 dark:text-gray-300">{mostRecentApp?.jobId?.title || mostRecentApp?.name}</span>
                      </p>
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                          <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                        </div>
                        <div className="relative flex justify-between">
                          {STAGES.map((stage, idx) => {
                            const achieved = currentStageIndex >= idx;
                            const active = currentStageIndex === idx;
                            return (
                              <div key={stage} className="bg-white dark:bg-gray-800 px-2 flex flex-col items-center">
                                <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-4 transition-all duration-500 ${stageColor(stage, active, achieved)}`}>
                                  {achieved && <CheckCircle className="text-white" size={16} />}
                                </span>
                                <span className={`mt-2 text-xs font-medium ${achieved ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500"}`}>
                                  {stage}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Recent applications list */}
                    <div className="mt-6 space-y-0 divide-y divide-gray-100 dark:divide-gray-700">
                      {applications.slice(0, 3).map(app => (
                        <div key={app._id} className="flex justify-between items-center py-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {app.jobId?.title || app.name}
                              <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                                {app.jobId?.category || ""}
                              </span>
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {app.jobId?.location || "Remote"}
                              {app.aiMatchScore ? ` · ${app.aiMatchScore}% AI match` : ""}
                            </p>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge(app.status || "Applied")}`}>
                            {app.status || "Applied"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>

          {/* Right Column */}
          <motion.div variants={fadeIn("left", 0.3)} initial="hidden" animate="show" className="space-y-8">

            {/* Top AI Matches */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                  <Star className="mr-2 text-amber-500" size={20} /> Top AI Job Matches
                </h3>
              </div>
              <div className="p-0">
                {!analysis ? (
                  <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                    Upload your resume to see personalized AI job matches.
                  </div>
                ) : topMatches.length === 0 ? (
                  <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                    No skill-matched jobs found yet. <Link to="/job/getall" className="text-blue-600 dark:text-blue-400 hover:underline">Browse all jobs →</Link>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                    {topMatches.map((job) => (
                      <li key={job._id} className="p-5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <div className="flex justify-between items-start mb-1">
                          <div>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{job.title}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{job.companyName || "Company"} · {job.location || "Remote"}</p>
                          </div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold ${job.match >= 70 ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                              : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300"
                            }`}>
                            {job.match}% Match
                          </span>
                        </div>
                        <Link to={`/job/${job._id}`} className="mt-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 flex items-center">
                          View Role <ChevronRight size={14} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-center">
                  <Link to="/job/getall" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500">
                    Explore all jobs →
                  </Link>
                </div>
              </div>
            </div>

            {/* AI Skill Gap Analysis */}
            {analysis?.suggestedSkills?.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">AI Skill Gap Analysis</h3>
                </div>
                <div className="p-6">
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    Based on your resume, learning these skills could unlock significantly more opportunities:
                  </p>
                  <ul className="space-y-2">
                    {analysis.suggestedSkills.slice(0, 5).map((skill, i) => (
                      <li key={i} className="flex items-start">
                        <XCircle className="text-red-400 mr-2 shrink-0 mt-0.5" size={16} />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          <span className="font-semibold text-gray-900 dark:text-white">{skill}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  {analysis.weaknesses?.length > 0 && (
                    <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700">
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">Areas to Improve</p>
                      <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc pl-4">
                        {analysis.weaknesses.slice(0, 3).map((w, i) => <li key={i}>{w}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default CandidateDashboard;
