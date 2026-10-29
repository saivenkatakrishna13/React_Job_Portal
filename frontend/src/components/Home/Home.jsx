import React, { useContext } from "react";
import { Link } from "react-router-dom";
import { Context } from "../../main";
import HeroSection from "./HeroSection";
import StatsStrip from "./StatsStrip";
import FeaturedJobs from "./FeaturedJobs";
import HowItWorks from "./HowItWorks";
import PopularCategories from "./PopularCategories";
import { motion } from "framer-motion";
import { fadeIn } from "../../utils/animations";
import { ArrowRight } from "lucide-react";

// Public landing page (Part B section 2): logged-out visitors see the full
// page with Register CTAs instead of being redirected to /login.
const Home = () => {
  const { authLoading } = useContext(Context);

  if (authLoading) {
    return (
      <div
        className="min-h-screen flex justify-center items-center"
        role="status"
        aria-label="Loading"
      >
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  return (
    <section className="homePage page min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <HeroSection />
      <StatsStrip />
      <FeaturedJobs />
      <HowItWorks />
      <PopularCategories />

      {/* Final CTA band */}
      <div className="bg-blue-600 dark:bg-blue-700 transition-colors duration-300">
        <motion.div
          variants={fadeIn("up")}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center"
        >
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Ready to bridge to your next role?
          </h2>
          <p className="mt-4 text-lg text-blue-100 max-w-2xl mx-auto">
            Create your free account, upload your resume, and let our AI match
            you with jobs that actually fit — or start hiring in minutes.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-white text-blue-700 font-semibold hover:bg-blue-50 transition-colors shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-600"
            >
              Get Started Free <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center px-8 py-3.5 rounded-xl border-2 border-white text-white font-semibold hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Sign In
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Home;
