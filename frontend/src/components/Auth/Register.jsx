import React, { useContext, useState } from "react";
import { FaPencilAlt } from "react-icons/fa";
import { MdOutlineMailOutline } from "react-icons/md";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { FaPhoneFlip } from "react-icons/fa6";
import { Link, Navigate } from "react-router-dom";
import api from "../../utils/api";
import toast from "react-hot-toast";
import { Context } from "../../main";

import { motion } from "framer-motion";
import { fadeIn, staggerContainer } from "../../utils/animations";
import AuthBrandPanel from "./AuthBrandPanel";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ROLE_OPTIONS = [
  { value: "Job Seeker", label: "Continue as Job Seeker" },
  { value: "Employer", label: "Continue as Employer" },
];

// Inline validation mirrors the server rules (userSchema: name 3–30, valid
// email, phone, password 8–32) so errors surface on blur, not after submit.
const validateField = (field, value) => {
  if (field === "role") return value ? "" : "Choose how you want to continue.";
  if (field === "name") {
    const v = String(value).trim();
    if (!v) return "Enter your full name.";
    if (v.length < 3) return "Name must be at least 3 characters.";
    if (v.length > 30) return "Name cannot exceed 30 characters.";
    return "";
  }
  if (field === "email") {
    if (!String(value).trim()) return "Enter your email address.";
    if (!EMAIL_RE.test(String(value).trim())) return "That doesn't look like a valid email address.";
    return "";
  }
  if (field === "phone") {
    const digits = String(value).replace(/\D/g, "");
    if (!digits) return "Enter your phone number.";
    if (digits.length < 10 || digits.length > 15) return "Enter a valid phone number (10–15 digits).";
    return "";
  }
  if (field === "password") {
    if (!value) return "Create a password.";
    if (value.length < 8) return "Password must be at least 8 characters.";
    if (value.length > 32) return "Password cannot exceed 32 characters.";
    return "";
  }
  return "";
};

// Register-only strength meter (§8.1): length first (the server minimum),
// then character variety.
const strengthOf = (pwd) => {
  if (!pwd) return 0;
  if (pwd.length < 8) return 1;
  let score = 2;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score += 1;
  if (/\d/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) score += 1;
  return score;
};

const STRENGTH_LEVELS = [
  { label: "", color: "bg-gray-300 dark:bg-gray-600" },
  { label: "Too short", color: "bg-red-500" },
  { label: "Fair", color: "bg-orange-500" },
  { label: "Good", color: "bg-yellow-500" },
  { label: "Strong", color: "bg-green-500" },
];

const Register = () => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [focus, setFocus] = useState({});

  const { isAuthorized, setIsAuthorized, user, setUser } = useContext(Context);

  const setFieldError = (field, value) =>
    setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));

  const handleRegister = async (e) => {
    e.preventDefault();
    const nextErrors = {
      role: validateField("role", role),
      name: validateField("name", name),
      email: validateField("email", email),
      phone: validateField("phone", phone),
      password: validateField("password", password),
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    setFormError("");
    setLoading(true);
    try {
      const { data } = await api.post(
        "/user/register",
        { name, phone, email, role, password },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      toast.success(data.message);
      setName("");
      setEmail("");
      setPassword("");
      setPhone("");
      setRole("");
      try {
        const userRes = await api.get("/user/getuser");
        setUser(userRes.data.user);
      } catch (userError) {
        setUser(data.user);
      }
      setIsAuthorized(true);
    } catch (error) {
      setFormError(
        error.response?.data?.message || "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  if (isAuthorized) {
    return <Navigate to={'/'} />;
  }

  const strength = strengthOf(password);
  const floated = (field, value) => Boolean(focus[field]) || String(value).length > 0;
  const labelClass = (field, value) =>
    `pointer-events-none absolute left-11 transition-all duration-150 ${
      floated(field, value) ? "top-1.5 text-xs" : "top-4 text-sm"
    } ${
      focus[field]
        ? "text-indigo-600 dark:text-indigo-400 font-medium"
        : "text-gray-400 dark:text-gray-500"
    }`;
  const inputClass = (field) =>
    `peer block w-full rounded-lg border bg-gray-50 dark:bg-gray-700 pl-11 pr-4 pt-6 pb-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${
      errors[field]
        ? "border-red-400 focus:ring-red-400"
        : "border-gray-300 dark:border-gray-600 focus:ring-indigo-500 hover:border-indigo-400"
    }`;

  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300 py-12 px-4 sm:px-6 lg:px-8 mt-16">
      <motion.div
        variants={fadeIn("up", 0.1)}
        initial="hidden"
        animate="show"
        className="max-w-5xl w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden flex flex-row-reverse border border-gray-100 dark:border-gray-700"
      >
        {/* Form Section */}
        <motion.div
          variants={staggerContainer(0.1, 0.2)}
          initial="hidden"
          animate="show"
          className="w-full lg:w-1/2 px-6 py-10 sm:px-12 flex flex-col justify-center"
        >
          <motion.div variants={fadeIn("down")} className="text-center mb-6">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2">
              Create an Account
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Join CareerBridge to find your dream job
            </p>
          </motion.div>

          <form className="space-y-4" onSubmit={handleRegister} noValidate>
            {/* Role: segmented control */}
            <motion.div variants={fadeIn("right")}>
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Register as
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
                    className={`px-2 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                      role === option.value
                        ? "bg-indigo-600 text-white shadow"
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

            {/* Name */}
            <motion.div variants={fadeIn("right")}>
              <div className="relative">
                <input
                  id="reg-name"
                  type="text"
                  placeholder=" "
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setFieldError("name", e.target.value);
                  }}
                  onBlur={() => {
                    setFocus((f) => ({ ...f, name: false }));
                    setFieldError("name", name);
                  }}
                  onFocus={() => setFocus((f) => ({ ...f, name: true }))}
                  aria-invalid={Boolean(errors.name)}
                  aria-label="Full name"
                  className={inputClass("name")}
                />
                <label htmlFor="reg-name" className={labelClass("name", name)}>
                  Full name
                </label>
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <FaPencilAlt className="text-gray-400 dark:text-gray-500" />
                </div>
              </div>
              {errors.name && (
                <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{errors.name}</p>
              )}
            </motion.div>

            {/* Email */}
            <motion.div variants={fadeIn("right")}>
              <div className="relative">
                <input
                  id="reg-email"
                  type="email"
                  placeholder=" "
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setFieldError("email", e.target.value);
                  }}
                  onBlur={() => {
                    setFocus((f) => ({ ...f, email: false }));
                    setFieldError("email", email);
                  }}
                  onFocus={() => setFocus((f) => ({ ...f, email: true }))}
                  aria-invalid={Boolean(errors.email)}
                  aria-label="Email address"
                  className={inputClass("email")}
                />
                <label htmlFor="reg-email" className={labelClass("email", email)}>
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

            {/* Phone */}
            <motion.div variants={fadeIn("right")}>
              <div className="relative">
                <input
                  id="reg-phone"
                  type="number"
                  placeholder=" "
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (errors.phone) setFieldError("phone", e.target.value);
                  }}
                  onBlur={() => {
                    setFocus((f) => ({ ...f, phone: false }));
                    setFieldError("phone", phone);
                  }}
                  onFocus={() => setFocus((f) => ({ ...f, phone: true }))}
                  aria-invalid={Boolean(errors.phone)}
                  aria-label="Phone number"
                  className={inputClass("phone")}
                />
                <label htmlFor="reg-phone" className={labelClass("phone", phone)}>
                  Phone number
                </label>
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <FaPhoneFlip className="text-gray-400 dark:text-gray-500" />
                </div>
              </div>
              {errors.phone && (
                <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{errors.phone}</p>
              )}
            </motion.div>

            {/* Password + strength meter (register only) */}
            <motion.div variants={fadeIn("right")}>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  placeholder=" "
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setFieldError("password", e.target.value);
                  }}
                  onBlur={() => {
                    setFocus((f) => ({ ...f, password: false }));
                    setFieldError("password", password);
                  }}
                  onFocus={() => setFocus((f) => ({ ...f, password: true }))}
                  aria-invalid={Boolean(errors.password)}
                  aria-label="Password"
                  className={`peer block w-full rounded-lg border bg-gray-50 dark:bg-gray-700 pl-4 pr-11 pt-6 pb-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${
                    errors.password
                      ? "border-red-400 focus:ring-red-400"
                      : "border-gray-300 dark:border-gray-600 focus:ring-indigo-500 hover:border-indigo-400"
                  }`}
                />
                <label
                  htmlFor="reg-password"
                  className={`pointer-events-none absolute left-4 transition-all duration-150 ${
                    floated("password", password) ? "top-1.5 text-xs" : "top-4 text-sm"
                  } ${
                    focus.password
                      ? "text-indigo-600 dark:text-indigo-400 font-medium"
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

              {password.length > 0 && (
                <div className="mt-2 flex items-center gap-2" aria-hidden="true">
                  <div className="flex flex-1 gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <span
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                          strength > i ? STRENGTH_LEVELS[strength].color : "bg-gray-200 dark:bg-gray-600"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-16 text-right">
                    {STRENGTH_LEVELS[strength].label}
                  </span>
                </div>
              )}

              {errors.password && (
                <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{errors.password}</p>
              )}
            </motion.div>

            {/* Inline server error */}
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
              className="mt-1 w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating your account...
                </div>
              ) : "Register"}
            </motion.button>

            <motion.p variants={fadeIn("up")} className="text-center text-sm text-gray-600 dark:text-gray-400 mt-3">
              Already have an account?{" "}
              <Link to={"/login"} className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors">
                Login Now
              </Link>
            </motion.p>
          </form>
        </motion.div>

        {/* Brand Section: gradient + rotating value-prop lines (§8.1) */}
        <AuthBrandPanel accent="from-indigo-600 via-blue-600 to-cyan-700" />
      </motion.div>
    </section>
  );
};

export default Register;
