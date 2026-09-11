import React, { useContext, useState } from "react";
import { Context } from "../../main";
import { ThemeContext } from "../../context/ThemeContext";
import { Link, useNavigate } from "react-router-dom";
import api from "../../utils/api";
import toast from "react-hot-toast";
import { GiHamburgerMenu } from "react-icons/gi";
import { AiOutlineClose } from "react-icons/ai"; 
import { Sun, Moon } from "lucide-react";

const Navbar = () => {
  const [show, setShow] = useState(false);
  const { isAuthorized, setIsAuthorized, user, setUser } = useContext(Context);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const navigateTo = useNavigate();

  const handleLogout = async () => {
    try {
      const response = await api.get("/user/logout");
      toast.success(response.data.message);
    } catch (error) {
      toast.error(error.response?.data?.message || "Logged out.");
    } finally {
      setUser({});
      setIsAuthorized(false);
      navigateTo("/login");
    }
  };

  if (!isAuthorized) {
    return null;
  }

  return (
    <nav className="fixed w-full z-50 top-0 transition-colors duration-300 backdrop-blur-md bg-white/80 dark:bg-gray-900/90 border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="text-2xl font-extrabold text-blue-600 dark:text-blue-500 tracking-tight">
              Career<span className="text-gray-900 dark:text-white">Bridge</span>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex md:items-center md:space-x-8">
            <Link to={"/"} className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">HOME</Link>
            <Link to={"/job/getall"} className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">ALL JOBS</Link>
            <Link to={"/applications/me"} className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">
              {user && user.role === "Employer" ? "APPLICANTS" : "MY APPLICATIONS"}
            </Link>

            {user && user.role === "Employer" ? (
              <>
                <Link to={"/recruiter/dashboard"} className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">DASHBOARD</Link>
                <Link to={"/job/post"} className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">POST JOB</Link>
                <Link to={"/job/me"} className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">MY JOBS</Link>
              </>
            ) : (
              <Link to={"/candidate/dashboard"} className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">DASHBOARD</Link>
            )}
            
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none"
              aria-label="Toggle Dark Mode"
            >
              {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <button 
              onClick={handleLogout} 
              className="ml-4 inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 transition-all hover:shadow-md"
            >
              LOGOUT
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden space-x-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none"
            >
              {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button 
              onClick={() => setShow(!show)}
              className="text-gray-700 dark:text-gray-300 hover:text-blue-600 focus:outline-none"
            >
              {show ? <AiOutlineClose size={24} /> : <GiHamburgerMenu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {show && (
        <div className="md:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 flex flex-col">
            <Link to={"/"} onClick={() => setShow(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800">HOME</Link>
            <Link to={"/job/getall"} onClick={() => setShow(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800">ALL JOBS</Link>
            <Link to={"/applications/me"} onClick={() => setShow(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800">
              {user && user.role === "Employer" ? "APPLICANTS" : "MY APPLICATIONS"}
            </Link>

            {user && user.role === "Employer" ? (
              <>
                <Link to={"/recruiter/dashboard"} onClick={() => setShow(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800">DASHBOARD</Link>
                <Link to={"/job/post"} onClick={() => setShow(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800">POST JOB</Link>
                <Link to={"/job/me"} onClick={() => setShow(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800">MY JOBS</Link>
              </>
            ) : (
              <Link to={"/candidate/dashboard"} onClick={() => setShow(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800">DASHBOARD</Link>
            )}

            <button 
              onClick={() => { handleLogout(); setShow(false); }} 
              className="mt-4 w-full text-left block px-3 py-2 rounded-md text-base font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              LOGOUT
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
