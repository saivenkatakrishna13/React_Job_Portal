import React, { useContext, useState } from "react";
import { MdOutlineMailOutline } from "react-icons/md";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { Link, Navigate } from "react-router-dom";
import { FaRegUser } from "react-icons/fa";
import api from "../../utils/api";
import toast from "react-hot-toast";
import { Context } from "../../main";

import { motion } from "framer-motion";
import { fadeIn, staggerContainer, floatAnimation } from "../../utils/animations";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { isAuthorized, setIsAuthorized } = useContext(Context);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post(
        "/user/login",
        { email, password, role },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      toast.success(data.message);
      setEmail("");
      setPassword("");
      setRole("");
      setIsAuthorized(true);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to login");
    } finally {
      setLoading(false);
    }
  };

  if(isAuthorized){
    return <Navigate to={'/'}/>
  }

  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300 py-12 px-4 sm:px-6 lg:px-8 mt-16">
      <motion.div 
        variants={fadeIn("up", 0.1)}
        initial="hidden"
        animate="show"
        className="max-w-5xl w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden flex border border-gray-100 dark:border-gray-700"
      >
        
        {/* Form Section */}
        <motion.div 
          variants={staggerContainer(0.1, 0.2)}
          initial="hidden"
          animate="show"
          className="w-full lg:w-1/2 px-8 py-12 sm:px-12 flex flex-col justify-center"
        >
          <motion.div variants={fadeIn("down")} className="text-center mb-10">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2">
              Welcome Back
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Log in to continue to CareerBridge
            </p>
          </motion.div>
          
          <form className="space-y-6" onSubmit={handleLogin}>
            {/* Role Select */}
            <motion.div variants={fadeIn("right")}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Login As</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaRegUser className="text-gray-400 dark:text-gray-500" />
                </div>
                <select 
                  value={role} 
                  onChange={(e) => setRole(e.target.value)}
                  className="pl-10 block w-full rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 border px-3 py-3.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-blue-400"
                  required
                >
                  <option value="">Select Role</option>
                  <option value="Employer">Employer</option>
                  <option value="Job Seeker">Job Seeker</option>
                </select>
              </div>
            </motion.div>

            {/* Email Input */}
            <motion.div variants={fadeIn("right")}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MdOutlineMailOutline className="text-gray-400 dark:text-gray-500 text-xl" />
                </div>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 block w-full rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 border px-3 py-3.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-blue-400"
                  required
                />
              </div>
            </motion.div>

            {/* Password Input */}
            <motion.div variants={fadeIn("right")}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 border px-3 py-3.5 pr-10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-blue-400"
                  required
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none transition-colors"
                  >
                    {showPassword ? <AiOutlineEyeInvisible size={20} /> : <AiOutlineEye size={20} />}
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Submit Button */}
            <motion.button 
              variants={fadeIn("up")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit" 
              disabled={loading}
              className="mt-4 w-full flex justify-center py-3.5 px-4 border border-transparent rounded-lg shadow-sm text-base font-bold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Logging in...
                </div>
              ) : "Login"}
            </motion.button>
            
            <motion.p variants={fadeIn("up")} className="text-center text-sm text-gray-600 dark:text-gray-400 mt-6">
              Don't have an account?{" "}
              <Link to={"/register"} className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition-colors">
                Register Now
              </Link>
            </motion.p>
          </form>
        </motion.div>

        {/* Image Section */}
        <div className="hidden lg:block w-1/2 bg-blue-50 dark:bg-gray-900 relative border-l border-blue-100 dark:border-gray-800">
          <div className="absolute inset-0 flex items-center justify-center p-12">
            <motion.img 
              variants={floatAnimation}
              initial="hidden"
              animate="show"
              src="/login.png" 
              alt="login illustration" 
              className="object-contain w-full h-full drop-shadow-xl"
            />
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default Login;
