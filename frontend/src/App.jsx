import React, { useContext, useEffect } from "react";
import "./App.css";
import { Context } from "./main";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Login from "./components/Auth/Login";
import Register from "./components/Auth/Register";
import { Toaster } from "react-hot-toast";
import api from "./utils/api";
import Navbar from "./components/Layout/Navbar";
import Footer from "./components/Layout/Footer";
import Home from "./components/Home/Home";
import Jobs from "./components/Job/Jobs";
import JobDetails from "./components/Job/JobDetails";
import Application from "./components/Application/Application";
import MyApplications from "./components/Application/MyApplications";
import PostJob from "./components/Job/PostJob";
import NotFound from "./components/NotFound/NotFound";
import MyJobs from "./components/Job/MyJobs";
import ProtectedRoute from "./components/Layout/ProtectedRoute";
import CandidateDashboard from "./components/Candidate/CandidateDashboard";
import RecruiterDashboard from "./components/Recruiter/RecruiterDashboard";

const App = () => {
  const { isAuthorized, setIsAuthorized, setUser } = useContext(Context);
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await api.get("/user/getuser");
        setUser(response.data.user);
        setIsAuthorized(true);
      } catch (error) {
        setIsAuthorized(false);
      }
    };
    fetchUser();
  }, []);

  return (
    <>
      <BrowserRouter>
        <Navbar />
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
        <Footer />
        <Toaster />
      </BrowserRouter>
    </>
  );
};

export default App;
