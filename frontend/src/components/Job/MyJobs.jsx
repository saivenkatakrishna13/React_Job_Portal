import api from "../../utils/api";
import React, { useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FaCheck } from "react-icons/fa6";
import { RxCross2 } from "react-icons/rx";
import { Context } from "../../main";
import { useNavigate } from "react-router-dom";

const MyJobs = () => {
  const [myJobs, setMyJobs] = useState([]);
  const [editingMode, setEditingMode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const { isAuthorized, user } = useContext(Context);

  const navigateTo = useNavigate();

  const fetchJobs = async () => {
    try {
      const { data } = await api.get("/job/getmyjobs");
      setMyJobs(data.myJobs || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch jobs");
      setMyJobs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleEnableEdit = (jobId) => {
    setEditingMode(jobId);
  };

  const handleDisableEdit = () => {
    setEditingMode(null);
    // Discard unsaved local edits by refetching the persisted jobs
    fetchJobs();
  };

  const handleUpdateJob = async (jobId) => {
    const updatedJob = myJobs.find((job) => job._id === jobId);
    setUpdatingId(jobId);
    try {
      const res = await api.put(`/job/update/${jobId}`, updatedJob);
      toast.success(res.data.message);
      // Sync with the persisted document returned by the backend
      if (res.data.job) {
        setMyJobs((prevJobs) => prevJobs.map((job) => (job._id === jobId ? res.data.job : job)));
      }
      setEditingMode(null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update job");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleExpired = async (job) => {
    setUpdatingId(job._id);
    try {
      const res = await api.put(`/job/update/${job._id}`, { expired: !job.expired });
      toast.success(!job.expired ? "Job closed. It no longer accepts applications." : "Job reopened.");
      if (res.data.job) {
        setMyJobs((prevJobs) => prevJobs.map((j) => (j._id === job._id ? res.data.job : j)));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update job status");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteJob = async (jobId) => {
    try {
      const res = await api.delete(`/job/delete/${jobId}`);
      toast.success(res.data.message);
      setMyJobs((prevJobs) => prevJobs.filter((job) => job._id !== jobId));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete job");
    }
  };

  const handleInputChange = (jobId, field, value) => {
    setMyJobs((prevJobs) =>
      prevJobs.map((job) =>
        job._id === jobId ? { ...job, [field]: value } : job
      )
    );
  };

  return (
    <section className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 py-12 px-4 sm:px-6 lg:px-8 mt-16">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight sm:text-5xl">Your Posted Jobs</h1>
          <p className="mt-4 text-xl text-gray-500 dark:text-gray-400">Manage, edit, and track the jobs you've posted.</p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
          </div>
        ) : myJobs.length > 0 ? (
          <div className="space-y-8">
            {myJobs.map((element) => (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors" key={element._id}>
                <div className="px-6 py-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center transition-colors">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white flex-1 truncate pr-4">
                    {editingMode === element._id ? (
                      <input
                        type="text"
                        value={element.title}
                        onChange={(e) => handleInputChange(element._id, "title", e.target.value)}
                        className="w-full rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-1 focus:ring-2 focus:ring-blue-500 transition-colors"
                      />
                    ) : (
                      element.title
                    )}
                  </h3>
                  <div className="flex space-x-2 shrink-0">
                    {editingMode === element._id ? (
                      <>
                        <button onClick={() => handleUpdateJob(element._id)} disabled={updatingId === element._id} className="p-2 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/60 transition-colors disabled:opacity-60">
                          <FaCheck size={20} />
                        </button>
                        <button onClick={() => handleDisableEdit()} className="p-2 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors">
                          <RxCross2 size={20} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => handleEnableEdit(element._id)} className="px-4 py-2 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 rounded-lg font-medium hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors">
                          Edit
                        </button>
                        <button onClick={() => navigateTo(`/applications/me?jobId=${element._id}`)} className="px-4 py-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 rounded-lg font-medium hover:bg-indigo-200 dark:hover:bg-indigo-900/60 transition-colors">
                          View Applicants
                        </button>
                        <button onClick={() => handleToggleExpired(element)} disabled={updatingId === element._id} className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-60 ${element.expired ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/60" : "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/60"}`}>
                          {element.expired ? "Reopen" : "Close Job"}
                        </button>
                        <button onClick={() => handleDeleteJob(element._id)} className="px-4 py-2 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 rounded-lg font-medium hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors">
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Category</label>
                      <select
                        value={element.category}
                        disabled={editingMode !== element._id}
                        onChange={(e) => handleInputChange(element._id, "category", e.target.value)}
                        className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border px-3 py-2 focus:ring-2 focus:ring-blue-500 disabled:opacity-70 disabled:bg-transparent disabled:border-transparent disabled:px-0 transition-colors"
                      >
                        <option value="Graphics & Design">Graphics & Design</option>
                        <option value="Mobile App Development">Mobile App Development</option>
                        <option value="Frontend Web Development">Frontend Web Development</option>
                        <option value="MERN Stack Development">MERN STACK Development</option>
                        <option value="Account & Finance">Account & Finance</option>
                        <option value="Artificial Intelligence">Artificial Intelligence</option>
                        <option value="Video Animation">Video Animation</option>
                        <option value="MEAN Stack Development">MEAN STACK Development</option>
                        <option value="MEVN Stack Development">MEVN STACK Development</option>
                        <option value="Data Entry Operator">Data Entry Operator</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Country</label>
                      <input
                        type="text"
                        disabled={editingMode !== element._id}
                        value={element.country}
                        onChange={(e) => handleInputChange(element._id, "country", e.target.value)}
                        className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border px-3 py-2 focus:ring-2 focus:ring-blue-500 disabled:opacity-70 disabled:bg-transparent disabled:border-transparent disabled:px-0 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">City</label>
                      <input
                        type="text"
                        disabled={editingMode !== element._id}
                        value={element.city}
                        onChange={(e) => handleInputChange(element._id, "city", e.target.value)}
                        className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border px-3 py-2 focus:ring-2 focus:ring-blue-500 disabled:opacity-70 disabled:bg-transparent disabled:border-transparent disabled:px-0 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Salary</label>
                      {element.fixedSalary ? (
                        <input
                          type="number"
                          disabled={editingMode !== element._id}
                          value={element.fixedSalary}
                          onChange={(e) => handleInputChange(element._id, "fixedSalary", e.target.value)}
                          className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border px-3 py-2 focus:ring-2 focus:ring-blue-500 disabled:opacity-70 disabled:bg-transparent disabled:border-transparent disabled:px-0 transition-colors"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            disabled={editingMode !== element._id}
                            value={element.salaryFrom}
                            onChange={(e) => handleInputChange(element._id, "salaryFrom", e.target.value)}
                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border px-3 py-2 focus:ring-2 focus:ring-blue-500 disabled:opacity-70 disabled:bg-transparent disabled:border-transparent disabled:px-0 transition-colors"
                          />
                          <span className="text-gray-400 dark:text-gray-500">-</span>
                          <input
                            type="number"
                            disabled={editingMode !== element._id}
                            value={element.salaryTo}
                            onChange={(e) => handleInputChange(element._id, "salaryTo", e.target.value)}
                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border px-3 py-2 focus:ring-2 focus:ring-blue-500 disabled:opacity-70 disabled:bg-transparent disabled:border-transparent disabled:px-0 transition-colors"
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
                      <select
                        value={element.expired}
                        onChange={(e) => handleInputChange(element._id, "expired", e.target.value === "true")}
                        disabled={editingMode !== element._id}
                        className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border px-3 py-2 focus:ring-2 focus:ring-blue-500 disabled:opacity-70 disabled:bg-transparent disabled:border-transparent disabled:px-0 transition-colors"
                      >
                        <option value={false}>Active</option>
                        <option value={true}>Expired</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Job Type</label>
                      <select
                        value={element.jobType || "Full-time"}
                        disabled={editingMode !== element._id}
                        onChange={(e) => handleInputChange(element._id, "jobType", e.target.value)}
                        className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border px-3 py-2 focus:ring-2 focus:ring-blue-500 disabled:opacity-70 disabled:bg-transparent disabled:border-transparent disabled:px-0 transition-colors"
                      >
                        <option value="Full-time">Full-time</option>
                        <option value="Part-time">Part-time</option>
                        <option value="Contract">Contract</option>
                        <option value="Internship">Internship</option>
                        <option value="Remote">Remote</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Experience</label>
                      <select
                        value={element.experienceLevel || "Entry"}
                        disabled={editingMode !== element._id}
                        onChange={(e) => handleInputChange(element._id, "experienceLevel", e.target.value)}
                        className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border px-3 py-2 focus:ring-2 focus:ring-blue-500 disabled:opacity-70 disabled:bg-transparent disabled:border-transparent disabled:px-0 transition-colors"
                      >
                        <option value="Entry">Entry Level</option>
                        <option value="Mid">Mid Level</option>
                        <option value="Senior">Senior Level</option>
                        <option value="Lead">Lead Level</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4 border-t border-gray-100 dark:border-gray-700 pt-6 transition-colors">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Required Skills (Comma separated)</label>
                      <input
                        type="text"
                        value={Array.isArray(element.requiredSkills) ? element.requiredSkills.join(", ") : element.requiredSkills || ""}
                        disabled={editingMode !== element._id}
                        onChange={(e) => handleInputChange(element._id, "requiredSkills", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                        className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border px-3 py-2 focus:ring-2 focus:ring-blue-500 disabled:opacity-70 disabled:bg-transparent disabled:border-transparent disabled:px-0 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Location / Address</label>
                      <textarea
                        value={element.location}
                        rows={2}
                        disabled={editingMode !== element._id}
                        onChange={(e) => handleInputChange(element._id, "location", e.target.value)}
                        className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border px-3 py-2 focus:ring-2 focus:ring-blue-500 disabled:opacity-70 disabled:bg-transparent disabled:border-transparent disabled:px-0 resize-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Description</label>
                      <textarea
                        rows={4}
                        value={element.description}
                        disabled={editingMode !== element._id}
                        onChange={(e) => handleInputChange(element._id, "description", e.target.value)}
                        className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border px-3 py-2 focus:ring-2 focus:ring-blue-500 disabled:opacity-70 disabled:bg-transparent disabled:border-transparent disabled:px-0 resize-none transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
            <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No jobs posted</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by creating a new job posting.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default MyJobs;
