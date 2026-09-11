import React from "react";
import { FaFilePdf, FaBrain, FaHandshake, FaPaperPlane } from "react-icons/fa";

import { motion } from "framer-motion";
import { fadeIn, staggerContainer } from "../../utils/animations";

const HowItWorks = () => {
  return (
    <div className="py-20 bg-white dark:bg-gray-900 overflow-hidden relative transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          variants={fadeIn("up")}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="text-center"
        >
          <h2 className="text-base text-blue-600 dark:text-blue-500 font-semibold tracking-wide uppercase">The AI Workflow</h2>
          <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            How It Works
          </p>
          <p className="mt-4 max-w-2xl text-xl text-gray-500 dark:text-gray-400 mx-auto">
            Experience a frictionless job search driven by cutting-edge AI.
          </p>
        </motion.div>

        <div className="mt-20">
          <motion.div 
            variants={staggerContainer(0.2)}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-10"
          >
            
            {/* Step 1 */}
            <motion.div variants={fadeIn("up")} className="relative text-center group">
              <div className="flex items-center justify-center w-20 h-20 mx-auto bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl shadow-sm group-hover:scale-110 transition-transform duration-300">
                <FaFilePdf size={32} />
              </div>
              <h3 className="mt-6 text-lg font-bold text-gray-900 dark:text-white">1. Upload Resume</h3>
              <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
                Simply upload your PDF resume. No need to manually fill out endless forms.
              </p>
              {/* Connector line */}
              <div className="hidden md:block absolute top-10 left-[60%] w-full h-0.5 bg-gray-200 dark:bg-gray-800 -z-10"></div>
            </motion.div>

            {/* Step 2 */}
            <motion.div variants={fadeIn("up")} className="relative text-center group">
              <div className="flex items-center justify-center w-20 h-20 mx-auto bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl shadow-sm group-hover:scale-110 transition-transform duration-300">
                <FaBrain size={32} />
              </div>
              <h3 className="mt-6 text-lg font-bold text-gray-900 dark:text-white">2. AI Analysis</h3>
              <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
                NVIDIA NIM extracts your skills, assesses your experience level, and identifies your strengths.
              </p>
              {/* Connector line */}
              <div className="hidden md:block absolute top-10 left-[60%] w-full h-0.5 bg-gray-200 dark:bg-gray-800 -z-10"></div>
            </motion.div>

            {/* Step 3 */}
            <motion.div variants={fadeIn("up")} className="relative text-center group">
              <div className="flex items-center justify-center w-20 h-20 mx-auto bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl shadow-sm group-hover:scale-110 transition-transform duration-300">
                <FaHandshake size={32} />
              </div>
              <h3 className="mt-6 text-lg font-bold text-gray-900 dark:text-white">3. Smart Matching</h3>
              <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
                Our engine compares your profile against thousands of jobs to find the perfect fit.
              </p>
              {/* Connector line */}
              <div className="hidden md:block absolute top-10 left-[60%] w-full h-0.5 bg-gray-200 dark:bg-gray-800 -z-10"></div>
            </motion.div>

            {/* Step 4 */}
            <motion.div variants={fadeIn("up")} className="relative text-center group">
              <div className="flex items-center justify-center w-20 h-20 mx-auto bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl shadow-sm group-hover:scale-110 transition-transform duration-300">
                <FaPaperPlane size={32} />
              </div>
              <h3 className="mt-6 text-lg font-bold text-gray-900 dark:text-white">4. 1-Click Apply</h3>
              <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
                Apply instantly to high-match jobs. Employers see your AI score automatically.
              </p>
            </motion.div>

          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;
