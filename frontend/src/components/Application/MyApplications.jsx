import React, { useContext, useEffect, useState } from "react";
import { Context } from "../../main";
import api from "../../utils/api";
import toast from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import ResumeModal from "./ResumeModal";
import { FaTrash, FaFilePdf, FaEye, FaChevronRight, FaRobot } from "react-icons/fa";
import { Sparkles, Info } from "lucide-react";
import { motion } from "framer-motion";
import { fadeIn, staggerContainer } from "../../utils/animations";

const MyApplications = () => {
  const { user } = useContext(Context);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [resumeImageUrl, setResumeImageUrl] = useState("");
  const { isAuthorized } = useContext(Context);
  const navigateTo = useNavigate();
  const [searchParams] = useSearchParams();
  const targetJobId = searchParams.get("jobId");

  useEffect(() => {
    const fetchApplications = async () => {
      setLoading(true);
      try {
        if (user && user.role === "Employer") {
          const res = await api.get("/application/employer/getall");
          let apps = res.data.applications || [];
          if (targetJobId) {
            apps = apps.filter(app => app.jobId && (app.jobId._id === targetJobId || app.jobId === targetJobId));
          }
          setApplications(apps);
        } else {
          const res = await api.get("/application/jobseeker/getall");
          setApplications(res.data.applications || []);
        }
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to load applications");
        setApplications([]);
      } finally {
        setLoading(false);
      }
    };
    fetchApplications();
  }, [isAuthorized, user, targetJobId]);

  const deleteApplication = async (id) => {
    try {
      const res = await api.delete(`/application/delete/${id}`);
      toast.success(res.data.message);
      setApplications((prev) => prev.filter((app) => app._id !== id));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to withdraw application");
    }
  };

  const openModal = (imageUrl) => {
    setResumeImageUrl(imageUrl);
    setModalOpen(true);
  };

  const updateStatus = async (id, newStatus) => {
    try {
      const res = await api.put(`/application/status/${id}`, { status: newStatus });
      toast.success(res.data.message);
      setApplications((prev) => 
        prev.map(app => app._id === id ? { ...app, status: newStatus } : app)
      );
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update status");
    }
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  return (
    <section className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 py-12 px-4 sm:px-6 lg:px-8 mt-16">
      <div className="max-w-7xl mx-auto">
        <motion.div 
          variants={fadeIn("up")}
          initial="hidden"
          animate="show"
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight sm:text-5xl">
            {user && user.role === "Job Seeker" ? "Application Tracker" : "AI Candidate Ranking"}
          </h1>
          <p className="mt-4 text-xl text-gray-500 dark:text-gray-400">
            {user && user.role === "Job Seeker" ? "Monitor the status of your active applications" : "Review applicants sorted by AI Match"}
          </p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
          </div>
        ) : applications.length <= 0 ? (
          <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              {user && user.role === "Employer" ? "No applications yet." : "No applications yet."}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {user && user.role === "Employer"
                ? targetJobId
                  ? "No candidates have applied to this job yet."
                  : "Post jobs and candidates will start applying."
                : "Browse jobs and apply!"}
            </p>
            {user && user.role === "Employer" ? (
              !targetJobId && (
                <button
                  onClick={() => navigateTo("/job/post")}
                  className="mt-6 inline-flex items-center px-5 py-2.5 rounded-lg shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  Post Your First Job
                </button>
              )
            ) : (
              <button
                onClick={() => navigateTo("/job/getall")}
                className="mt-6 inline-flex items-center px-5 py-2.5 rounded-lg shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                Browse Jobs
              </button>
            )}
          </div>
        ) : (
          <motion.div 
            variants={staggerContainer(0.1)}
            initial="hidden"
            animate="show"
            className={user?.role === "Employer" ? "space-y-0" : "grid grid-cols-1 lg:grid-cols-2 gap-8"}
          >
            {user?.role === "Employer" && (
              <div className="bg-white dark:bg-gray-800 rounded-t-2xl shadow-sm border-b-0 border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <div className="col-span-3">Candidate</div>
                  <div className="col-span-2 text-center">AI Match</div>
                  <div className="col-span-4">Key Skills</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-1 text-right">Resume</div>
                </div>
              </div>
            )}
            
            {/* Sort applications by match score if Employer */}
            {[...applications].sort((a, b) => user?.role === "Employer" ? ((b.aiMatchScore || 0) - (a.aiMatchScore || 0)) : 0).map((element, index, arr) => {
              return user && user.role === "Job Seeker" ? (
                <JobSeekerCard key={element._id} element={element} deleteApplication={deleteApplication} openModal={openModal} />
              ) : (
                <EmployerTableRow 
                  key={element._id} 
                  element={element} 
                  openModal={openModal} 
                  updateStatus={updateStatus} 
                  isLast={index === arr.length - 1} 
                />
              );
            })}
          </motion.div>
        )}
      </div>
      {modalOpen && <ResumeModal imageUrl={resumeImageUrl} onClose={closeModal} />}
    </section>
  );
};

export default MyApplications;

const JobSeekerCard = ({ element, deleteApplication, openModal }) => {
  const statusLevels = {
    "Applied": 1,
    "Under Review": 2,
    "Shortlisted": 3,
    "Interview": 4,
    "Selected": 5,
    "Rejected": -1
  };
  
  const currentLevel = statusLevels[element.status || "Applied"] || 1;

  return (
    <motion.div 
      variants={fadeIn("up")}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col hover:shadow-xl transition-shadow duration-300"
    >
      <div className="p-6">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">{element.jobId?.title || element.name}</h3>
        </div>
        
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Applied on {new Date(element.createdAt || Date.now()).toLocaleDateString()}</p>
        
        {/* Tracking Timeline */}
        <div className="mb-8">
          <div className="relative">
            {/* Background Bar */}
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
            </div>
            
            <div className="relative flex justify-between">
              {['Applied', 'Reviewing', 'Shortlisted', 'Interview', 'Selected'].map((step, idx) => {
                const stepLevel = idx + 1;
                const isCompleted = currentLevel >= stepLevel;
                const isCurrent = currentLevel === stepLevel;
                const isRejected = currentLevel === -1;
                
                let bgColor = "bg-gray-200 dark:bg-gray-700";
                let textColor = "text-gray-400 dark:text-gray-500";
                let checkColor = "text-transparent";
                
                if (isRejected && stepLevel === 1) {
                  bgColor = "bg-red-500";
                  textColor = "text-red-600 dark:text-red-400";
                } else if (isRejected && stepLevel > 1) {
                  bgColor = "bg-gray-200 dark:bg-gray-700";
                } else if (isCompleted) {
                  bgColor = "bg-blue-600";
                  textColor = "text-gray-900 dark:text-gray-200";
                  checkColor = "text-white";
                }
                
                return (
                  <div key={step} className="bg-white dark:bg-gray-800 px-2 flex flex-col items-center">
                    <span className={`h-6 w-6 rounded-full ${bgColor} flex items-center justify-center ring-4 ring-white dark:ring-gray-800 transition-colors`}>
                      {isCompleted && !isRejected && <svg className={`h-4 w-4 ${checkColor}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>}
                    </span>
                    <span className={`mt-2 text-[10px] font-bold ${textColor} uppercase tracking-wider`}>
                      {step}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-6">
          <p><span className="font-semibold text-gray-900 dark:text-gray-200">Email:</span> {element.email}</p>
          <p><span className="font-semibold text-gray-900 dark:text-gray-200">Phone:</span> {element.phone}</p>
        </div>
        
        <button 
          onClick={() => deleteApplication(element._id)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
        >
          <FaTrash className="mr-2" /> Withdraw Application
        </button>
      </div>
    </motion.div>
  );
};

const EmployerTableRow = ({ element, openModal, updateStatus, isLast }) => {
  const [showExplanation, setShowExplanation] = useState(false);

  return (
    <motion.div 
      variants={fadeIn("up")}
      className={`grid grid-cols-12 gap-4 px-6 py-5 bg-white dark:bg-gray-800 border-x border-gray-100 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors items-center ${isLast ? 'border-b rounded-b-2xl shadow-sm' : 'border-b border-gray-100 dark:border-gray-700'}`}
    >
      
      {/* Candidate Name & Contact */}
      <div className="col-span-12 md:col-span-3 flex flex-col">
        <h3 className="text-base font-bold text-gray-900 dark:text-white">{element.name}</h3>
        <a href={`mailto:${element.email}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline truncate">{element.email}</a>
      </div>

      {/* AI Match Score & Explanation Toggle */}
      <div className="col-span-12 md:col-span-2 flex flex-col justify-center items-center relative">
        {element.aiMatchScore !== undefined ? (
          <div className="flex flex-col items-center">
            <span className={`px-3 py-1 rounded-full text-sm font-bold flex items-center shadow-sm cursor-pointer hover:opacity-80 transition-opacity
              ${element.aiMatchScore >= 80 ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800' : 
                element.aiMatchScore >= 50 ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800' : 
                'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'}`}
              onMouseEnter={() => setShowExplanation(true)}
              onMouseLeave={() => setShowExplanation(false)}
            >
              <Sparkles className="w-3 h-3 mr-1" />
              {element.aiMatchScore}% Match
            </span>
            
            {showExplanation && element.aiExplanation && (
              <div className="absolute z-10 top-10 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl"
                   onMouseEnter={() => setShowExplanation(true)}
                   onMouseLeave={() => setShowExplanation(false)}>
                <div className="flex items-center mb-1 border-b border-gray-700 pb-1">
                  <FaRobot className="mr-1 text-blue-400" /> <span className="font-bold">AI Explanation</span>
                </div>
                {element.aiExplanation}
              </div>
            )}
          </div>
        ) : (
          <span className="text-xs text-gray-400 font-medium">Pending Analysis</span>
        )}
      </div>

      {/* Skills Extracted */}
      <div className="col-span-12 md:col-span-4">
        {element.matchingSkills && element.matchingSkills.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {element.matchingSkills.slice(0, 3).map((skill, i) => (
               <span key={i} className="px-2 py-0.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-medium rounded border border-green-100 dark:border-green-800 truncate max-w-[100px]">
                {skill}
              </span>
            ))}
            {element.matchingSkills.length > 3 && (
              <span className="px-2 py-0.5 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs font-medium rounded border border-gray-200 dark:border-gray-600">
                +{element.matchingSkills.length - 3}
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs text-gray-400 dark:text-gray-500">No matching skills detected</span>
        )}
        
        {element.missingSkills && element.missingSkills.length > 0 && (
          <p className="text-xs text-red-500 dark:text-red-400 mt-1 truncate">
            Missing: {element.missingSkills.slice(0, 2).join(", ")}
          </p>
        )}
      </div>

      {/* Status Select */}
      <div className="col-span-12 md:col-span-2">
        <select 
          value={element.status || "Applied"} 
          onChange={(e) => updateStatus(element._id, e.target.value)}
          className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 border px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 font-medium text-gray-700 dark:text-gray-200 shadow-sm"
        >
          <option value="Applied">Applied</option>
          <option value="Under Review">Under Review</option>
          <option value="Shortlisted">Shortlisted</option>
          <option value="Interview">Interview</option>
          <option value="Selected">Selected</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

      {/* View Resume Action */}
      <div className="col-span-12 md:col-span-1 flex justify-end">
        {element.resume?.url?.endsWith(".pdf") ? (
          <a href={element.resume.url} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors bg-gray-50 dark:bg-gray-700/50 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg">
            <FaFilePdf size={20} />
          </a>
        ) : (
          <button onClick={() => openModal(element.resume?.url)} className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors bg-gray-50 dark:bg-gray-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg">
            <FaEye size={20} />
          </button>
        )}
      </div>
    </motion.div>
  );
};
