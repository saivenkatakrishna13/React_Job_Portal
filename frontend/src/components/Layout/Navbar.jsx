import React, { useContext, useEffect, useState } from "react";
import { Context } from "../../main";
import { ThemeContext } from "../../context/ThemeContext";
import { Link, useNavigate } from "react-router-dom";
import api from "../../utils/api";
import toast from "react-hot-toast";
import { GiHamburgerMenu } from "react-icons/gi";
import { AiOutlineClose } from "react-icons/ai";
import { Sun, Moon, Bell } from "lucide-react";

const navLinkClass =
  "text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors";
const mobileLinkClass =
  "block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800";

const Navbar = () => {
  const [show, setShow] = useState(false);
  const { isAuthorized, setIsAuthorized, user, setUser, setGreeting } =
    useContext(Context);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const navigateTo = useNavigate();

  // Notification bell (Part C Phase 9): unread badge + dropdown panel.
  // The bell renders TWICE (desktop menu + mobile top row), so outside-click
  // detection uses a data attribute instead of a ref — a single ref would
  // point at only one instance and count clicks in the other as "outside",
  // closing the panel before its own click could fire.
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      const res = await api.get("/notifications");
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch {
      // Badge simply stays as-is if the fetch fails (e.g. session expired).
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setNotifOpen(false);
    }
  }, [isAuthorized]);

  // Close the panel when clicking anywhere outside a bell instance.
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!event.target.closest || !event.target.closest("[data-notif-bell]")) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const toggleNotifications = () => {
    setNotifOpen((open) => {
      const next = !open;
      if (next) fetchNotifications(); // refresh whenever the panel opens
      return next;
    });
  };

  const markAllRead = async () => {
    try {
      await api.put("/notifications/read-all");
      setNotifications((items) => items.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      toast.error("Could not mark notifications as read.");
    }
  };

  const handleLogout = async () => {
    try {
      const response = await api.get("/user/logout");
      toast.success(response.data.message);
    } catch (error) {
      toast.error(error.response?.data?.message || "Logged out.");
    } finally {
      setUser({});
      // Reset the one-time greeting with the session (report §8.2).
      setGreeting(null);
      setIsAuthorized(false);
      navigateTo("/login");
    }
  };

  const themeToggleButton = (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      aria-label="Toggle Dark Mode"
    >
      {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );

  // Bell + dropdown. Rendered in BOTH the desktop menu and the mobile top
  // row (same pattern as the theme toggle).
  const notificationsBell = isAuthorized ? (
    <div className="relative" data-notif-bell="">
      <button
        onClick={toggleNotifications}
        aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
        aria-expanded={notifOpen}
        className="relative p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center"
            aria-hidden="true"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {notifOpen && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">Notifications</h4>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline focus:outline-none"
              >
                Mark all as read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400 text-center">
                You're all caught up.
              </p>
            ) : (
              <ul>
                {notifications.map((n) => (
                  <li
                    key={n._id}
                    className={`px-4 py-3 border-b border-gray-50 dark:border-gray-700/50 last:border-0 ${n.read ? "" : "bg-blue-50/60 dark:bg-blue-900/10"}`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.read && (
                        <span className="mt-1.5 h-2 w-2 rounded-full bg-blue-500 shrink-0" aria-hidden="true" />
                      )}
                      <div className={n.read ? "pl-4" : ""}>
                        <p className="text-sm text-gray-800 dark:text-gray-200">{n.message}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {new Date(n.createdAt).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  ) : null;

  // Logged-out visitors still get the full sticky bar (landing page needs a
  // role-aware CTA: Login/Register) — it no longer disappears for guests.
  return (
    <nav className="fixed w-full z-50 top-0 transition-colors duration-300 backdrop-blur-md bg-white/80 dark:bg-gray-900/90 border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link
              to="/"
              className="text-2xl font-extrabold text-blue-600 dark:text-blue-500 tracking-tight focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
            >
              Career<span className="text-gray-900 dark:text-white">Bridge</span>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex md:items-center md:space-x-8">
            <Link to={"/"} className={navLinkClass}>HOME</Link>
            <Link to={"/job/getall"} className={navLinkClass}>ALL JOBS</Link>

            {isAuthorized ? (
              <>
                <Link to={"/applications/me"} className={navLinkClass}>
                  {user && user.role === "Employer" ? "APPLICANTS" : "MY APPLICATIONS"}
                </Link>
                {user && user.role === "Employer" ? (
                  <>
                    <Link to={"/recruiter/dashboard"} className={navLinkClass}>DASHBOARD</Link>
                    <Link to={"/job/post"} className={navLinkClass}>POST JOB</Link>
                    <Link to={"/job/me"} className={navLinkClass}>MY JOBS</Link>
                  </>
                ) : (
                  <Link to={"/candidate/dashboard"} className={navLinkClass}>DASHBOARD</Link>
                )}
                {notificationsBell}
                {themeToggleButton}
                <button
                  onClick={handleLogout}
                  className="ml-4 inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-all hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                  LOGOUT
                </button>
              </>
            ) : (
              <>
                {themeToggleButton}
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center px-4 py-2 rounded-full text-sm font-medium text-blue-600 dark:text-blue-400 border border-blue-600 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center px-4 py-2 rounded-full shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-all hover:shadow-md"
                >
                  Register
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden space-x-4">
            {notificationsBell}
            {themeToggleButton}
            <button
              onClick={() => setShow(!show)}
              className="text-gray-700 dark:text-gray-300 hover:text-blue-600 focus:outline-none"
              aria-label={show ? "Close menu" : "Open menu"}
              aria-expanded={show}
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
            <Link to={"/"} onClick={() => setShow(false)} className={mobileLinkClass}>HOME</Link>
            <Link to={"/job/getall"} onClick={() => setShow(false)} className={mobileLinkClass}>ALL JOBS</Link>

            {isAuthorized ? (
              <>
                <Link to={"/applications/me"} onClick={() => setShow(false)} className={mobileLinkClass}>
                  {user && user.role === "Employer" ? "APPLICANTS" : "MY APPLICATIONS"}
                </Link>
                {user && user.role === "Employer" ? (
                  <>
                    <Link to={"/recruiter/dashboard"} onClick={() => setShow(false)} className={mobileLinkClass}>DASHBOARD</Link>
                    <Link to={"/job/post"} onClick={() => setShow(false)} className={mobileLinkClass}>POST JOB</Link>
                    <Link to={"/job/me"} onClick={() => setShow(false)} className={mobileLinkClass}>MY JOBS</Link>
                  </>
                ) : (
                  <Link to={"/candidate/dashboard"} onClick={() => setShow(false)} className={mobileLinkClass}>DASHBOARD</Link>
                )}
                <button
                  onClick={() => { handleLogout(); setShow(false); }}
                  className="mt-4 w-full text-left block px-3 py-2 rounded-md text-base font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  LOGOUT
                </button>
              </>
            ) : (
              <div className="flex gap-3 px-3 py-2">
                <Link
                  to="/login"
                  onClick={() => setShow(false)}
                  className="flex-1 text-center px-4 py-2 rounded-full text-sm font-medium text-blue-600 border border-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-400 dark:hover:bg-blue-900/30"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setShow(false)}
                  className="flex-1 text-center px-4 py-2 rounded-full text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
