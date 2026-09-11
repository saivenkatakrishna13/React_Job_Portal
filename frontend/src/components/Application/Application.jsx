import api from "../../utils/api";
import React, { useContext, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { Context } from "../../main";
import { motion } from "framer-motion";
import { fadeIn } from "../../utils/animations";
import { CheckCircle } from "lucide-react";

const Application = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fileError, setFileError] = useState("");

  const { isAuthorized, user } = useContext(Context);
  const navigateTo = useNavigate();
  const { id } = useParams();

  // Function to handle file input changes with validation
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setFileError("");
    
    if (!file) {
      setResume(null);
      return;
    }
    
    // Check file type
    const allowedTypes = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      setFileError("Please select a valid file (PNG, JPEG, WEBP, or PDF)");
      setResume(null);
      return;
    }
    
    // Check file size (limit to 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setFileError("File size should be less than 2MB");
      setResume(null);
      return;
    }
    
    setResume(file);
  };

  const handleApplication = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!name || !email || !phone || !address || !coverLetter) {
      toast.error("Please fill in all fields");
      return;
    }
    
    if (!resume && !user?.resumeText) {
      setFileError("Please upload your resume");
      return;
    }
    
    setLoading(true);
    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);
    formData.append("phone", phone);
    formData.append("address", address);
    formData.append("coverLetter", coverLetter);
    formData.append("jobId", id);
    if (resume) {
      formData.append("resume", resume);
    }

    try {
      const { data } = await api.post("/application/post", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setName("");
      setEmail("");
      setCoverLetter("");
      setPhone("");
      setAddress("");
      setResume(null);
      toast.success(data.message);
      navigateTo("/applications/me");
    } catch (error) {
      const errorMessage = error.response?.data?.message || 
        "Something went wrong. Please try again later.";
      toast.error(errorMessage);
      
      // Show specific message for Cloudinary errors
      if (errorMessage.includes("Cloudinary") || errorMessage.includes("api_key")) {
        toast.error("File upload service is currently unavailable. Please check backend config.");
      }
    } finally {
      setLoading(false);
    }
  };

  const hasSavedResume = !!user?.resumeText;

  return (
    <section className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 mt-16">
      <motion.div 
        variants={fadeIn("up")}
        initial="hidden"
        animate="show"
        className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100"
      >
        <div className="px-6 py-8 sm:p-10 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <h3 className="text-3xl font-extrabold text-gray-900 tracking-tight">Application Form</h3>
          <p className="mt-2 text-sm text-gray-500">Please provide your details to apply.</p>
        </div>

        <form onSubmit={handleApplication} className="px-6 py-8 sm:p-10 space-y-6">
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
            
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
              <input
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border-gray-300 bg-gray-50 border px-4 py-2.5 focus:ring-2 focus:ring-blue-500 transition-all"
                required
              />
            </div>

            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Email</label>
              <input
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border-gray-300 bg-gray-50 border px-4 py-2.5 focus:ring-2 focus:ring-blue-500 transition-all"
                required
              />
            </div>

            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="number"
                placeholder="+1 234 567 8900"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border-gray-300 bg-gray-50 border px-4 py-2.5 focus:ring-2 focus:ring-blue-500 transition-all"
                required
              />
            </div>

            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Address</label>
              <input
                type="text"
                placeholder="123 Main St, City"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-lg border-gray-300 bg-gray-50 border px-4 py-2.5 focus:ring-2 focus:ring-blue-500 transition-all"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Cover Letter</label>
              <textarea
                placeholder="Why are you a good fit for this role?"
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                rows={6}
                className="w-full rounded-lg border-gray-300 bg-gray-50 border px-4 py-3 focus:ring-2 focus:ring-blue-500 transition-all"
                required
              />
            </div>

            <div className="sm:col-span-2 border-t border-gray-200 pt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Upload Resume</label>
              
              {hasSavedResume && !resume && (
                <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium text-green-800">Saved Resume Found</h4>
                    <p className="mt-1 text-sm text-green-700">
                      We will automatically attach the resume you uploaded to your profile. You can upload a new one below if you prefer.
                    </p>
                  </div>
                </div>
              )}

              <div className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg transition-colors bg-gray-50 ${resume ? 'border-blue-500' : 'border-gray-300 hover:border-blue-400'}`}>
                <div className="space-y-1 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="flex text-sm text-gray-600 justify-center">
                    <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 px-2 py-1 shadow-sm border border-gray-200">
                      <span>{hasSavedResume ? "Upload alternative file" : "Upload a file"}</span>
                      <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={handleFileChange} />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">PDF, PNG, JPG, WEBP up to 2MB</p>
                  {resume && <p className="text-sm font-medium text-blue-600 mt-2">Selected: {resume.name}</p>}
                </div>
              </div>
              {fileError && <p className="text-red-500 text-sm mt-2">{fileError}</p>}
            </div>
          </div>

          <div className="pt-6">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-lg shadow-md text-base font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? "Submitting Application..." : "Send Application"}
            </button>
          </div>
        </form>
      </motion.div>
    </section>
  );
};

export default Application;