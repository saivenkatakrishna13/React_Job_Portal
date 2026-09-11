import React, { useContext, useState, useRef } from "react";
import { FaBrain, FaCrosshairs } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { fadeIn, staggerContainer, scaleUp } from "../../utils/animations";
import { Context } from "../../main";
import api from "../../utils/api";
import toast from "react-hot-toast";
import { UploadCloud, Loader2, X, CheckCircle, Zap } from "lucide-react";

const HeroSection = () => {
  const { isAuthorized, user, setUser } = useContext(Context);
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const fileInputRef = useRef(null);

  // Fix 4: Use real AI matches from user context if available
  const realMatches = (() => {
    const skills = user?.resumeAnalysis?.technicalSkills || [];
    if (skills.length === 0 || !user?.resumeAnalysis) return null;
    return [
      { pct: user.resumeAnalysis.score || "--", label: "Your Resume Score", sub: `${skills.slice(0, 2).join(", ")} and more`, color: "green" },
      { pct: skills.length, label: "Skills Detected", sub: `${skills.slice(0, 3).join(" · ")}`, color: "blue" },
      { pct: user.resumeAnalysis.experienceYears ?? "--", label: "Years Experience", sub: user.resumeAnalysis.strengths?.[0] || "Detected from resume", color: "indigo" },
    ];
  })();

  // Placeholder cards shown to guests / users without a resume
  const placeholderMatches = [
    { pct: "94%", label: "Senior React Developer", sub: "Match based on 12 shared skills", color: "green" },
    { pct: "89%", label: "Frontend Lead", sub: "Match based on experience level", color: "blue" },
    { pct: "76%", label: "Full Stack Engineer", sub: "Missing: Node.js (Skill gap)", color: "yellow" },
  ];

  const displayMatches = realMatches || placeholderMatches;

  const colorMap = {
    green:  "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400",
    blue:   "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400",
    indigo: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400",
    yellow: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600 dark:text-yellow-400",
  };

  const handleUploadClick = () => {
    if (!isAuthorized) {
      toast("Please log in to upload your resume.", { icon: "🔒" });
      navigate("/login");
      return;
    }
    if (user?.role === "Employer") {
      toast("Resume upload is for Job Seekers only.");
      return;
    }
    setShowModal(true);
    setFile(null);
    setDone(false);
    setAnalysis(null);
  };

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (f && f.type === "application/pdf") setFile(f);
    else if (f) toast.error("Please select a PDF file.");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.type === "application/pdf") setFile(f);
    else toast.error("Please drop a PDF file.");
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("resume", file);
    try {
      await api.post("/user/upload-resume", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Resume uploaded! Running AI analysis...");

      const aiRes = await api.post("/ai/analyze-resume");
      const freshAnalysis = aiRes.data.analysis;
      setAnalysis(freshAnalysis);

      // Refresh global user context so dashboard & hero both see fresh data
      const userRes = await api.get("/user/getuser");
      setUser(userRes.data.user);

      setDone(true);
      toast.success(`Analysis complete! Score: ${freshAnalysis.score}/100`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Analysis failed. Try again.");
    } finally {
      setUploading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setFile(null);
    setDone(false);
    setAnalysis(null);
  };

  return (
    <>
      <div className="relative bg-white dark:bg-gray-900 overflow-hidden pt-16 transition-colors duration-300">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 pb-8 bg-white dark:bg-gray-900 sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32">

            <svg className="hidden lg:block absolute right-0 inset-y-0 h-full w-48 text-white dark:text-gray-900 transform translate-x-1/2 transition-colors duration-300"
              fill="currentColor" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <polygon points="50,0 100,0 50,100 0,100" />
            </svg>

            <motion.main
              variants={staggerContainer(0.2)}
              initial="hidden"
              animate="show"
              className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28"
            >
              <div className="sm:text-center lg:text-left">
                <motion.div variants={fadeIn("down")} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 mb-4 border border-blue-200 dark:border-blue-800">
                  <FaBrain className="mr-2" /> Powered by NVIDIA NIM AI
                </motion.div>

                <motion.h1 variants={fadeIn("right")} className="text-4xl tracking-tight font-extrabold text-gray-900 dark:text-white sm:text-5xl md:text-6xl">
                  <span className="block xl:inline">Find Jobs That Match</span>{" "}
                  <span className="block text-blue-600 dark:text-blue-500">Your True Potential</span>
                </motion.h1>

                <motion.p variants={fadeIn("right")} className="mt-3 text-base text-gray-500 dark:text-gray-400 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                  Stop blindly applying. Upload your resume and let our AI instantly discover
                  opportunities that perfectly fit your unique skills, experience, and career trajectory.
                </motion.p>

                <motion.div variants={fadeIn("up")} className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start gap-3">
                  {/* Fix 6: Real upload flow from home page */}
                  <button
                    onClick={handleUploadClick}
                    className="w-full sm:w-auto flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 transition-colors md:py-4 md:text-lg md:px-10 shadow"
                  >
                    <UploadCloud className="mr-2" size={20} />
                    {isAuthorized && user?.resumeAnalysis ? "Re-analyze Resume" : "Upload Resume"}
                  </button>
                  <Link
                    to="/job/getall"
                    className="mt-3 sm:mt-0 w-full sm:w-auto flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors md:py-4 md:text-lg md:px-10"
                  >
                    Explore Jobs
                  </Link>
                </motion.div>

                {/* Show score badge if user already has analysis */}
                {isAuthorized && user?.resumeAnalysis && (
                  <motion.div variants={fadeIn("up")} className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm font-medium">
                    <CheckCircle size={14} />
                    Resume scored {user.resumeAnalysis.score}/100 · {user.resumeAnalysis.technicalSkills?.length || 0} skills detected
                  </motion.div>
                )}
              </div>
            </motion.main>
          </div>
        </div>

        {/* Fix 4: Right panel — real data if logged in with analysis, placeholders otherwise */}
        <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2 bg-gray-50 dark:bg-gray-800 flex items-center justify-center p-8 transition-colors duration-300">
          <motion.div
            variants={scaleUp(0.4)}
            initial="hidden"
            animate="show"
            className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 border border-gray-100 dark:border-gray-700 relative overflow-hidden transition-colors duration-300"
          >
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-blue-100 dark:bg-blue-900/20 blur-2xl"></div>
            <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-32 h-32 rounded-full bg-indigo-100 dark:bg-indigo-900/20 blur-2xl"></div>

            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 relative z-10 flex items-center">
              <FaCrosshairs className="text-blue-500 mr-2" />
              {realMatches ? "Your AI Analysis" : "AI Matching Engine"}
            </h3>
            {!realMatches && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-5 relative z-10">
                {isAuthorized ? "Upload your resume to see your real scores" : "Log in and upload your resume to see real matches"}
              </p>
            )}

            <motion.div
              variants={staggerContainer(0.15, 0.6)}
              initial="hidden"
              animate="show"
              className="space-y-4 relative z-10"
            >
              {displayMatches.map((item, i) => (
                <motion.div key={i} variants={fadeIn("up")} className={`bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center shadow-sm ${i > 0 ? "opacity-" + (100 - i * 15) : ""}`}>
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center mr-4 flex-shrink-0 ${colorMap[item.color]}`}>
                    <span className="font-bold text-sm">{item.pct}</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{item.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[180px]">{item.sub}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {!realMatches && (
              <button
                onClick={handleUploadClick}
                className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors relative z-10"
              >
                <Zap size={16} /> Get Your Real Scores
              </button>
            )}
          </motion.div>
        </div>
      </div>

      {/* Fix 6: Upload Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center gap-2">
                  <Zap className="text-blue-600 dark:text-blue-400" size={20} />
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">AI Resume Analyzer</h2>
                </div>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6">
                {done && analysis ? (
                  /* Success state */
                  <div className="text-center">
                    <CheckCircle className="mx-auto h-14 w-14 text-green-500 mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Analysis Complete!</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">NVIDIA NIM has analyzed your resume</p>
                    <div className="grid grid-cols-3 gap-3 mb-6">
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
                        <p className="text-2xl font-extrabold text-blue-700 dark:text-blue-400">{analysis.score}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Score / 100</p>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center">
                        <p className="text-2xl font-extrabold text-green-700 dark:text-green-400">{analysis.technicalSkills?.length || 0}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Skills Found</p>
                      </div>
                      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 text-center">
                        <p className="text-2xl font-extrabold text-purple-700 dark:text-purple-400">{analysis.experienceYears ?? "?"}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Yrs Exp.</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center mb-6">
                      {analysis.technicalSkills?.slice(0, 6).map((s, i) => (
                        <span key={i} className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">{s}</span>
                      ))}
                    </div>
                    <button
                      onClick={() => { closeModal(); navigate("/candidate/dashboard"); }}
                      className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
                    >
                      View Full Dashboard →
                    </button>
                  </div>
                ) : uploading ? (
                  /* Uploading/analyzing state */
                  <div className="text-center py-6">
                    <Loader2 className="mx-auto h-12 w-12 text-blue-500 animate-spin mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">NVIDIA NIM is analyzing...</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Extracting skills, scoring experience, computing job matches</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Usually takes 10–20 seconds</p>
                  </div>
                ) : (
                  /* Upload state */
                  <>
                    <div
                      onDrop={handleDrop}
                      onDragOver={(e) => e.preventDefault()}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors mb-4 ${
                        file
                          ? "border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/10"
                          : "border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 bg-gray-50 dark:bg-gray-800/50"
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf"
                        onChange={handleFile}
                        className="hidden"
                      />
                      {file ? (
                        <>
                          <CheckCircle className="mx-auto h-10 w-10 text-green-500 mb-2" />
                          <p className="text-sm font-semibold text-green-700 dark:text-green-400">{file.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{(file.size / 1024).toFixed(0)} KB · Click to change</p>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="mx-auto h-10 w-10 text-gray-400 dark:text-gray-500 mb-2" />
                          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Drop your PDF here or click to browse</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">PDF files only</p>
                        </>
                      )}
                    </div>

                    <button
                      onClick={handleAnalyze}
                      disabled={!file || uploading}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors"
                    >
                      <Zap size={18} />
                      {file ? "Analyze with NVIDIA NIM AI" : "Select a PDF first"}
                    </button>
                    <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-3">
                      Your resume is processed securely. Text is extracted for AI analysis only.
                    </p>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default HeroSection;
