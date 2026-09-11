import React, { useContext, useState } from "react";
import api from "../../utils/api";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { Context } from "../../main";
import Select from "react-select";

// Static comprehensive list of countries
const countryOptions = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "East Timor", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Korea, North", "Korea, South", "Kosovo", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
].map(c => ({ value: c, label: c }));

const PostJob = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [country, setCountry] = useState(null);
  const [city, setCity] = useState("");
  const [location, setLocation] = useState("");
  const [salaryFrom, setSalaryFrom] = useState("");
  const [salaryTo, setSalaryTo] = useState("");
  const [fixedSalary, setFixedSalary] = useState("");
  const [salaryType, setSalaryType] = useState("default");
  const [requiredSkills, setRequiredSkills] = useState("");
  const [jobType, setJobType] = useState("Full-time");
  const [experienceLevel, setExperienceLevel] = useState("Entry");
  const [submitting, setSubmitting] = useState(false);

  const { isAuthorized, user } = useContext(Context);
  const navigateTo = useNavigate();

  const handleJobPost = async (e) => {
    e.preventDefault();
    if (submitting) return; // prevent duplicate job creation on repeated clicks
    if (!country) {
      toast.error("Please select a country");
      return;
    }

    if (salaryType === "Fixed Salary") {
      setSalaryFrom("");
      setSalaryTo("");
    } else if (salaryType === "Ranged Salary") {
      setFixedSalary("");
    } else {
      setSalaryFrom("");
      setSalaryTo("");
      setFixedSalary("");
    }
    
    setSubmitting(true);
    try {
      const payload = {
        title, description, category, country: country.value, city, location,
        requiredSkills: requiredSkills.split(",").map(s => s.trim()).filter(Boolean),
        jobType, experienceLevel,
      };

      if (salaryType === "Fixed Salary") {
        payload.fixedSalary = fixedSalary;
      } else if (salaryType === "Ranged Salary") {
        payload.salaryFrom = salaryFrom;
        payload.salaryTo = salaryTo;
      }

      const res = await api.post("/job/post", payload, { 
        headers: { "Content-Type": "application/json" } 
      });
      toast.success(res.data.message);
      navigateTo("/job/me");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to post job");
    } finally {
      setSubmitting(false);
    }
  };

  // Custom styles for react-select to match tailwind
  const selectStyles = {
    control: (base, state) => ({
      ...base,
      padding: '4px',
      borderRadius: '0.5rem',
      borderColor: state.isFocused ? '#3b82f6' : '#d1d5db',
      backgroundColor: 'transparent',
      boxShadow: state.isFocused ? '0 0 0 2px rgba(59, 130, 246, 0.5)' : 'none',
      '&:hover': {
        borderColor: state.isFocused ? '#3b82f6' : '#9ca3af'
      }
    }),
    menu: (base) => ({
      ...base,
      borderRadius: '0.5rem',
      overflow: 'hidden',
      zIndex: 50
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#eff6ff' : 'white',
      color: state.isSelected ? 'white' : '#111827',
      '&:active': {
        backgroundColor: '#3b82f6',
        color: 'white'
      }
    })
  };

  return (
    <section className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 mt-16 transition-colors duration-300">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700">
        <div className="px-6 py-8 sm:p-10 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20">
          <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Post a New Job</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Fill in the details below to attract top talent to your organization.</p>
        </div>

        <form onSubmit={handleJobPost} className="px-6 py-8 sm:p-10 space-y-8">
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
            
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Job Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white border px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="e.g. Senior Software Engineer"
                required
              />
            </div>

            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white border px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              >
                <option value="">Select Category</option>
                <option value="Graphics & Design">Graphics & Design</option>
                <option value="Mobile App Development">Mobile App Development</option>
                <option value="Frontend Web Development">Frontend Web Development</option>
                <option value="Business Development Executive">Business Development Executive</option>
                <option value="Account & Finance">Account & Finance</option>
                <option value="Artificial Intelligence">Artificial Intelligence</option>
                <option value="Video Animation">Video Animation</option>
                <option value="MEAN Stack Development">MEAN STACK Development</option>
                <option value="MERN Stack Development">MERN STACK Development</option>
                <option value="Data Entry Operator">Data Entry Operator</option>
              </select>
            </div>

            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Country</label>
              <div className="dark:text-gray-900">
                <Select
                  options={countryOptions}
                  value={country}
                  onChange={setCountry}
                  placeholder="Search Country..."
                  styles={selectStyles}
                  classNamePrefix="react-select"
                />
              </div>
            </div>

            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white border px-4 py-2.5 focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="City"
                required
              />
            </div>

            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location Details</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white border px-4 py-2.5 focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="Office Address or 'Remote'"
                required
              />
            </div>

            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Required Skills</label>
              <input
                type="text"
                value={requiredSkills}
                onChange={(e) => setRequiredSkills(e.target.value)}
                className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white border px-4 py-2.5 focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="React, Node.js, Python"
                required
              />
            </div>

            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Job Type</label>
              <select
                value={jobType}
                onChange={(e) => setJobType(e.target.value)}
                className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white border px-4 py-2.5 focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
                <option value="Remote">Remote</option>
              </select>
            </div>

            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Experience Level</label>
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
                className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white border px-4 py-2.5 focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option value="Entry">Entry Level</option>
                <option value="Mid">Mid Level</option>
                <option value="Senior">Senior Level</option>
                <option value="Lead">Lead Level</option>
              </select>
            </div>

            <div className="sm:col-span-2 border-t border-gray-200 dark:border-gray-700 pt-6 mt-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Salary Structure</label>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <select
                  value={salaryType}
                  onChange={(e) => setSalaryType(e.target.value)}
                  className="sm:col-span-1 w-full rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white border px-4 py-2.5 focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option value="default">Select Salary Type</option>
                  <option value="Fixed Salary">Fixed Salary</option>
                  <option value="Ranged Salary">Ranged Salary</option>
                </select>

                <div className="sm:col-span-2">
                  {salaryType === "default" && (
                    <p className="text-red-500 text-sm mt-2">Please select a salary type.</p>
                  )}
                  {salaryType === "Fixed Salary" && (
                    <input
                      type="number"
                      placeholder="Enter Fixed Salary Amount"
                      value={fixedSalary}
                      onChange={(e) => setFixedSalary(e.target.value)}
                      className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white border px-4 py-2.5 focus:ring-2 focus:ring-blue-500 transition-all"
                      required
                    />
                  )}
                  {salaryType === "Ranged Salary" && (
                    <div className="flex gap-4">
                      <input
                        type="number"
                        placeholder="From"
                        value={salaryFrom}
                        onChange={(e) => setSalaryFrom(e.target.value)}
                        className="w-1/2 rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white border px-4 py-2.5 focus:ring-2 focus:ring-blue-500 transition-all"
                        required
                      />
                      <input
                        type="number"
                        placeholder="To"
                        value={salaryTo}
                        onChange={(e) => setSalaryTo(e.target.value)}
                        className="w-1/2 rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white border px-4 py-2.5 focus:ring-2 focus:ring-blue-500 transition-all"
                        required
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="sm:col-span-2 border-t border-gray-200 dark:border-gray-700 pt-6 mt-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Job Description</label>
              <textarea
                rows="8"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the responsibilities, requirements, and benefits..."
                className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white border px-4 py-3 focus:ring-2 focus:ring-blue-500 transition-all"
                required
              />
            </div>
          </div>

          <div className="pt-4">
            <button 
              type="submit" 
              disabled={submitting}
              className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-lg shadow-md text-base font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? "Posting Job..." : "Post Job Now"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};

export default PostJob;
