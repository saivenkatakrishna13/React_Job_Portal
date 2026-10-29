import React, { Suspense, useContext, useEffect } from "react";
import "./App.css";
import { Context } from "./main";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import api from "./utils/api";
import Navbar from "./components/Layout/Navbar";
import Footer from "./components/Layout/Footer";
import GreetingBanner from "./components/Layout/GreetingBanner";
import ProtectedRoute from "./components/Layout/ProtectedRoute";

// Page-level code splitting (Part C Phase 7): each route's code loads on
// demand so the entry chunk stays small.
const Login = React.lazy(() => import("./components/Auth/Login"));
const Register = React.lazy(() => import("./components/Auth/Register"));
const Home = React.lazy(() => import("./components/Home/Home"));
const Jobs = React.lazy(() => import("./components/Job/Jobs"));
const JobDetails = React.lazy(() => import("./components/Job/JobDetails"));
const Application = React.lazy(() => import("./components/Application/Application"));
const MyApplications = React.lazy(() => import("./components/Application/MyApplications"));
const PostJob = React.lazy(() => import("./components/Job/PostJob"));
const NotFound = React.lazy(() => import("./components/NotFound/NotFound"));
const MyJobs = React.lazy(() => import("./components/Job/MyJobs"));
const CandidateDashboard = React.lazy(
  () => import("./components/Candidate/CandidateDashboard")
);
const RecruiterDashboard = React.lazy(
  () => import("./components/Recruiter/RecruiterDashboard")
);

const PageSpinner = () => (
  <div
    className="min-h-[60vh] flex items-center justify-center"
    role="status"
    aria-label="Loading page"
  >
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
  </div>
);

const App = () => {
  const { isAuthorized, setIsAuthorized, setUser, setAuthLoading } = useContext(Context);
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await api.get("/user/getuser");
        setUser(response.data.user);
        setIsAuthorized(true);
      } catch (error) {
        setIsAuthorized(false);
      } finally {
        setAuthLoading(false);
      }
    };
    fetchUser();
  }, []);

  return (
    <>
      <BrowserRouter>
        <Navbar />
        {/* One-time personalized greeting banner, shown after login only */}
        <GreetingBanner />
        <Suspense fallback={<PageSpinner />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<Home />} />
            <Route path="/job/getall" element={<ProtectedRoute><Jobs /></ProtectedRoute>} />
            <Route path="/job/:id" element={<ProtectedRoute><JobDetails /></ProtectedRoute>} />
            <Route path="/candidate/dashboard" element={<ProtectedRoute requiredRole="Job Seeker"><CandidateDashboard /></ProtectedRoute>} />
            <Route path="/recruiter/dashboard" element={<ProtectedRoute requiredRole="Employer"><RecruiterDashboard /></ProtectedRoute>} />
            <Route path="/application/:id" element={<ProtectedRoute requiredRole="Job Seeker"><Application /></ProtectedRoute>} />
            <Route path="/applications/me" element={<ProtectedRoute><MyApplications /></ProtectedRoute>} />
            <Route path="/job/post" element={<ProtectedRoute requiredRole="Employer"><PostJob /></ProtectedRoute>} />
            <Route path="/job/me" element={<ProtectedRoute requiredRole="Employer"><MyJobs /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <Footer />
        <Toaster />
      </BrowserRouter>
    </>
  );
};

export default App;
