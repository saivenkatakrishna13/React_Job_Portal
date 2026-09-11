import React, { useContext, useEffect, useState } from "react";
import { Context } from "../../main";
import api from "../../utils/api";
import toast from "react-hot-toast";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  LineChart, Line
} from "recharts";
import { Briefcase, Users, CheckSquare, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { fadeIn, staggerContainer } from "../../utils/animations";

const RecruiterDashboard = () => {
  const { user } = useContext(Context);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [jobsRes, appsRes] = await Promise.all([
          api.get("/job/getmyjobs"),
          api.get("/application/employer/getall")
        ]);
        
        setJobs(jobsRes.data.myJobs || []);
        setApplications(appsRes.data.applications || []);
      } catch (error) {
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Compute analytics from fetched data
  const totalJobs = jobs.length;
  const activeJobs = jobs.filter((j) => !j.expired).length;
  const totalApps = applications.length;
  
  const statusCounts = applications.reduce((acc, app) => {
    const status = app.status || "Applied";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, { "Applied": 0, "Under Review": 0, "Shortlisted": 0, "Interview": 0, "Selected": 0, "Rejected": 0 });

  // Generate mock chart data since we don't track historical time series in DB yet
  const applicationsOverTime = [
    { name: 'Mon', apps: 4 },
    { name: 'Tue', apps: 7 },
    { name: 'Wed', apps: 5 },
    { name: 'Thu', apps: 12 },
    { name: 'Fri', apps: totalApps > 28 ? totalApps - 28 : 8 },
    { name: 'Sat', apps: 2 },
    { name: 'Sun', apps: 3 },
  ];

  // Real AI match score distribution (only for applications that have been scored)
  const scoreDistribution = [
    { range: '0-50%', count: 0 },
    { range: '51-70%', count: 0 },
    { range: '71-85%', count: 0 },
    { range: '86-100%', count: 0 },
  ];

  applications.forEach(app => {
    if (app.aiMatchScore == null) return; // skip unscored
    const score = app.aiMatchScore;
    if (score <= 50) scoreDistribution[0].count++;
    else if (score <= 70) scoreDistribution[1].count++;
    else if (score <= 85) scoreDistribution[2].count++;
    else scoreDistribution[3].count++;
  });

  const scoredCount = applications.filter(a => a.aiMatchScore != null).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex justify-center items-center transition-colors duration-300">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  return (
    <section className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 mt-16 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Recruiter Dashboard</h1>
            <p className="mt-1 text-gray-500 dark:text-gray-400">Welcome back, {user?.name}. Here is your recruitment overview.</p>
          </div>
          <div className="mt-4 md:mt-0 flex flex-wrap gap-3">
            <Link to="/job/post" className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none transition-colors">
              Post New Job
            </Link>
            <Link to="/job/me" className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none transition-colors">
              Manage My Jobs
            </Link>
            <Link to="/applications/me" className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none transition-colors">
              View Candidates
            </Link>
          </div>
        </div>

        {/* KPI Cards */}
        <motion.div 
          variants={staggerContainer(0.1)}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5 mb-8"
        >
          <motion.div variants={fadeIn("up")} className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-2xl border border-gray-100 dark:border-gray-700 flex items-center p-6 hover:shadow-md transition-all duration-300">
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 mr-5">
              <Briefcase size={28} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Total Jobs Posted</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalJobs}</p>
            </div>
          </motion.div>

          <motion.div variants={fadeIn("up")} className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-2xl border border-gray-100 dark:border-gray-700 flex items-center p-6 hover:shadow-md transition-all duration-300">
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mr-5">
              <Briefcase size={28} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Active Jobs</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{activeJobs}</p>
            </div>
          </motion.div>
          
          <motion.div variants={fadeIn("up")} className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-2xl border border-gray-100 dark:border-gray-700 flex items-center p-6 hover:shadow-md transition-all duration-300">
            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 mr-5">
              <Users size={28} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Total Applications</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalApps}</p>
            </div>
          </motion.div>

          <motion.div variants={fadeIn("up")} className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-2xl border border-gray-100 dark:border-gray-700 flex items-center p-6 hover:shadow-md transition-all duration-300">
            <div className="p-3 rounded-xl bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 mr-5">
              <Clock size={28} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Shortlisted / Interviews</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {(statusCounts["Shortlisted"] || 0) + (statusCounts["Interview"] || 0)}
              </p>
            </div>
          </motion.div>

          <motion.div variants={fadeIn("up")} className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-2xl border border-gray-100 dark:border-gray-700 flex items-center p-6 hover:shadow-md transition-all duration-300">
            <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 mr-5">
              <CheckSquare size={28} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Selected Hires</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{statusCounts["Selected"] || 0}</p>
            </div>
          </motion.div>
        </motion.div>

        {/* Charts Section */}
        <motion.div 
          variants={staggerContainer(0.2)}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8"
        >
          {/* Line Chart */}
          <motion.div variants={fadeIn("right")} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors duration-300">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Applications Over Time</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={applicationsOverTime} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" strokeOpacity={0.1} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', backgroundColor: '#1f2937', color: '#fff' }}
                  />
                  <Line type="monotone" dataKey="apps" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, stroke: '#3b82f6', fill: '#1f2937' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Bar Chart */}
          <motion.div variants={fadeIn("left")} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors duration-300">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Match Score Distribution</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scoreDistribution} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" strokeOpacity={0.1} />
                  <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', backgroundColor: '#1f2937', color: '#fff' }}
                    cursor={{ fill: 'rgba(243, 244, 246, 0.1)' }}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </motion.div>

        {/* Recent Activity Table */}
        <motion.div 
          variants={fadeIn("up")}
          initial="hidden"
          animate="show"
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors duration-300"
        >
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center transition-colors">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent Applications</h3>
            <Link to="/applications/me" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300">View all applications</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800 transition-colors">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Candidate</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Job Applied</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">AI Match</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Skills</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 transition-colors">
                {applications.slice(0, 8).map((app) => (
                  <tr key={app._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">{app.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{app.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700 dark:text-gray-300">{app.jobId?.title || "—"}</div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">{app.jobId?.location || ""}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {app.aiMatchScore != null ? (
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          app.aiMatchScore >= 80 ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-400'
                          : app.aiMatchScore >= 60 ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-400'
                          : 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-400'
                        }`}>
                          {app.aiMatchScore}%
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500 italic">PDF required</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {app.matchingSkills?.slice(0,2).map((s, i) => (
                          <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400">✓ {s}</span>
                        ))}
                        {app.missingSkills?.slice(0,1).map((s, i) => (
                          <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400">✗ {s}</span>
                        ))}
                        {!app.matchingSkills?.length && <span className="text-xs text-gray-400 dark:text-gray-500">—</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        app.status === 'Selected'    ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-400'
                        : app.status === 'Rejected'  ? 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-400'
                        : app.status === 'Interview' ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-400'
                        : app.status === 'Shortlisted' ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-400'
                        : 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-400'
                      }`}>
                        {app.status || "Applied"}
                      </span>
                    </td>
                  </tr>
                ))}
                {applications.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                      No applications received yet. <Link to="/job/post" className="text-blue-600 dark:text-blue-400 hover:underline">Post a job</Link> to start receiving candidates.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default RecruiterDashboard;
