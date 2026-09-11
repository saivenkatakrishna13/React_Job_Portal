import React from "react";
import { FaMicrosoft, FaApple } from "react-icons/fa";
import { SiTesla } from "react-icons/si";

import { motion } from "framer-motion";
import { fadeIn, staggerContainer } from "../../utils/animations";

const PopularCompanies = () => {
  const companies = [
    {
      id: 1,
      title: "Microsoft",
      location: "Redmond, Washington",
      openPositions: 10,
      icon: <FaMicrosoft size={36} className="text-blue-600 dark:text-blue-400" />,
    },
    {
      id: 2,
      title: "Tesla",
      location: "Austin, Texas",
      openPositions: 5,
      icon: <SiTesla size={36} className="text-red-600 dark:text-red-400" />,
    },
    {
      id: 3,
      title: "Apple",
      location: "Cupertino, California",
      openPositions: 20,
      icon: <FaApple size={36} className="text-gray-900 dark:text-gray-100" />,
    },
  ];
  return (
    <div className="py-20 bg-white dark:bg-gray-900 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          variants={fadeIn("up")}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl tracking-tight">Top Companies</h2>
          <p className="mt-4 max-w-2xl text-xl text-gray-500 dark:text-gray-400 mx-auto">Join the world's leading organizations.</p>
        </motion.div>
        <motion.div 
          variants={staggerContainer(0.15)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {companies.map((element) => {
            return (
              <motion.div 
                variants={fadeIn("up")}
                className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 flex flex-col justify-between group" 
                key={element.id}
              >
                <div>
                  <div className="w-16 h-16 bg-gray-50 dark:bg-gray-700 rounded-2xl flex items-center justify-center mb-6 border border-gray-100 dark:border-gray-600 group-hover:scale-110 transition-transform duration-300">
                    {element.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{element.title}</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">{element.location}</p>
                </div>
                <button className="w-full py-3 px-4 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-medium rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-blue-600 dark:hover:bg-blue-500 hover:text-white dark:hover:text-white hover:border-blue-600 dark:hover:border-blue-500 transition-colors duration-300">
                  Open Positions: {element.openPositions}
                </button>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
};

export default PopularCompanies;
