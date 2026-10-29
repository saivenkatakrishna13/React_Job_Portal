import React, { useContext, useState } from "react";
import { MdOutlineMailOutline } from "react-icons/md";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { Link, Navigate } from "react-router-dom";
import api from "../../utils/api";
import toast from "react-hot-toast";
import { Context } from "../../main";

import { motion } from "framer-motion";
import { fadeIn, staggerContainer } from "../../utils/animations";
import AuthBrandPanel from "./AuthBrandPanel";
import { buildGreeting } from "../Layout/GreetingBanner";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ROLE_OPTIONS = [
  { value: "Job Seeker", label: "Continue as Job Seeker" },
  { value: "Employer", label: "Continue as Employer" },
];

// Field-level validation runs on blur and on submit (report §8.1: inline
// validation instead of error text appearing only after submit).
const validateField = (field, value) => {
  if (field === "role") return value ? "" : "Choose how you want to continue.";
  if (field === "email") {
    if (!value.trim()) return "Enter your email address.";
    if (!EMAIL_RE.test(value.trim())) return "That doesn't look like a valid email address.";
    return "";
  }
  if (field === "password") return value ? "" : "Enter your password.";
  return "";
};

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  // Inline validation state: touched/submit reveals per-field errors.
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const { isAuthorized, setIsAuthorized, setUser, setGreeting } = useContext(Context);

  const setFieldError = (field, value) =>
    setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));

  const handleLogin = async (e) => {
    e.preventDefault();
    const nextErrors = {
      role: validateField("role", role),
      email: validateField("email", email),
      password: validateField("password", password),
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    setFormError("");
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
      let signedInUser = data.user;
      try {
        const userRes = await api.get("/user/getuser");
        signedInUser = userRes.data.user;
        setUser(signedInUser);
      } catch (userError) {
        setUser(data.user);
      }

      // One-time personalized greeting (report §8.2): real role-aware counts,
      // fetched once at login so the banner is ready when the app lands.
      try {
        const greeting = await buildGreeting(signedInUser);
        setGreeting(greeting ? { pending: true, ...greeting } : null);
      } catch {
        setGreeting(null);
      }

      setIsAuthorized(true);
    } catch (error) {
      // Friendly inline message for credential failures instead of a raw 401
      // payload; genuine server/transport errors keep their own message.
      const status = error.response?.status;
      setFormError(
        status === 400 || status === 401 || status === 404
          ? "That email/password combo doesn't match our records."
          : error.response?.data?.message || "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  if (isAuthorized) {
    return <Navigate to={'/'} />;
  }

  const emailFloated = emailFocused || email.length > 0;
  const passwordFloated = passwordFocused || password.length > 0;

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
          className="w-full lg:w-1/2 px-6 py-10 sm:px-12 sm:py-12 flex flex-col justify-center"
        >
          <motion.div variants={fadeIn("down")} className="text-center mb-8">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2">
              Welcome Back
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Log in to continue to CareerBridge
            </p>
          </motion.div>

          <form className="space-y-5" onSubmit={handleLogin} noValidate>
            {/* Role: segmented control — the choice is visible at a glance */}
            <motion.div variants={fadeIn("right")}>
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Login as
              </span>
              <div
                role="group"
                aria-label="Choose account type"
                className="grid grid-cols-2 gap-1.5 p-1.5 rounded-xl bg-gray-100 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600"
              >
                {ROLE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={role === option.value}
                    onClick={() => {
                      setRole(option.value);
                      setFieldError("role", option.value);
                    }}
                    className={`px-2 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      role === option.value
                        ? "bg-blue-600 text-white shadow"
                        : "text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-600"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {errors.role && (
                <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{errors.role}</p>
              )}
            </motion.div>

            {/* Email: floating label */}
            <motion.div variants={fadeIn("right")}>
              <div className="relative">
                <input
                  id="login-email"
                  type="email"
                  placeholder=" "
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setFieldError("email", e.target.value);
                  }}
                  onBlur={() => {
                    setEmailFocused(false);
                    setFieldError("email", email);
                  }}
                  onFocus={() => setEmailFocused(true)}
                  aria-invalid={Boolean(errors.email)}
                  aria-label="Email address"
                  className={`peer block w-full rounded-lg border bg-gray-50 dark:bg-gray-700 pl-11 pr-4 pt-6 pb-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${
                    errors.email
                      ? "border-red-400 focus:ring-red-400"
                      : "border-gray-300 dark:border-gray-600 focus:ring-blue-500 hover:border-blue-400"
                  }`}
                />
                <label
                  htmlFor="login-email"
                  className={`pointer-events-none absolute left-11 transition-all duration-150 ${
                    emailFloated
                      ? "top-1.5 text-xs"
                      : "top-4 text-sm"
                  } ${
                    emailFocused
                      ? "text-blue-600 dark:text-blue-400 font-medium"
                      : "text-gray-400 dark:text-gray-500"
                  }`}
                >
                  Email address
                </label>
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <MdOutlineMailOutline className="text-gray-400 dark:text-gray-500 text-xl" />
                </div>
              </div>
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{errors.email}</p>
              )}
            </motion.div>

            {/* Password: floating label + show/hide */}
            <motion.div variants={fadeIn("right")}>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder=" "
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setFieldError("password", e.target.value);
                  }}
                  onBlur={() => {
                    setPasswordFocused(false);
                    setFieldError("password", password);
                  }}
                  onFocus={() => setPasswordFocused(true)}
                  aria-invalid={Boolean(errors.password)}
                  aria-label="Password"
                  className={`peer block w-full rounded-lg border bg-gray-50 dark:bg-gray-700 pl-4 pr-11 pt-6 pb-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${
                    errors.password
                      ? "border-red-400 focus:ring-red-400"
                      : "border-gray-300 dark:border-gray-600 focus:ring-blue-500 hover:border-blue-400"
                  }`}
                />
                <label
                  htmlFor="login-password"
                  className={`pointer-events-none absolute left-4 transition-all duration-150 ${
                    passwordFloated
                      ? "top-1.5 text-xs"
                      : "top-4 text-sm"
                  } ${
                    passwordFocused
                      ? "text-blue-600 dark:text-blue-400 font-medium"
                      : "text-gray-400 dark:text-gray-500"
                  }`}
                >
                  Password
                </label>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none transition-colors"
                  >
                    {showPassword ? <AiOutlineEyeInvisible size={20} /> : <AiOutlineEye size={20} />}
                  </button>
                </div>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{errors.password}</p>
              )}
            </motion.div>

            {/* Friendly inline error for bad credentials */}
            {formError && (
              <motion.div
                variants={fadeIn("down", 0)}
                initial="hidden"
                animate="show"
                role="alert"
                className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300"
              >
                {formError}
              </motion.div>
            )}

            {/* Submit Button */}
            <motion.button
              variants={fadeIn("up")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="mt-2 w-full flex justify-center py-3.5 px-4 border border-transparent rounded-lg shadow-sm text-base font-bold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
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

        {/* Brand Section: gradient + rotating value-prop lines (§8.1) */}
        <AuthBrandPanel accent="from-blue-600 via-indigo-600 to-purple-700" />
      </motion.div>
    </section>
  );
};

export default Login;
