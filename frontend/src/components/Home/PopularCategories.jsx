import React from "react";
import {
  MdOutlineDesignServices,
  MdOutlineWebhook,
  MdAccountBalance,
  MdOutlineAnimation,
} from "react-icons/md";
import { TbAppsFilled } from "react-icons/tb";
import { FaReact } from "react-icons/fa";
import { GiArtificialIntelligence } from "react-icons/gi";
import { IoGameController } from "react-icons/io5";

import { motion } from "framer-motion";
import { fadeIn, staggerContainer } from "../../utils/animations";

const PopularCategories = () => {
  const categories = [
    {
      id: 1,
      title: "Graphics & Design",
      subTitle: "305 Open Positions",
      icon: <MdOutlineDesignServices size={32} className="text-blue-600 dark:text-blue-400" />,
    },
    {
      id: 2,
      title: "Mobile App Dev",
      subTitle: "500 Open Positions",
      icon: <TbAppsFilled size={32} className="text-indigo-600 dark:text-indigo-400" />,
    },
    {
      id: 3,
      title: "Frontend Web Dev",
      subTitle: "200 Open Positions",
      icon: <MdOutlineWebhook size={32} className="text-emerald-600 dark:text-emerald-400" />,
    },
    {
      id: 4,
      title: "MERN Stack Dev",
      subTitle: "1000+ Open Positions",
      icon: <FaReact size={32} className="text-blue-500 dark:text-blue-300" />,
    },
    {
      id: 5,
      title: "Account & Finance",
      subTitle: "150 Open Positions",
      icon: <MdAccountBalance size={32} className="text-purple-600 dark:text-purple-400" />,
    },
    {
      id: 6,
      title: "Artificial Intelligence",
      subTitle: "867 Open Positions",
      icon: <GiArtificialIntelligence size={32} className="text-pink-600 dark:text-pink-400" />,
    },
    {
      id: 7,
      title: "Video Animation",
      subTitle: "50 Open Positions",
      icon: <MdOutlineAnimation size={32} className="text-orange-500 dark:text-orange-400" />,
    },
    {
      id: 8,
      title: "Game Development",
      subTitle: "80 Open Positions",
      icon: <IoGameController size={32} className="text-red-500 dark:text-red-400" />,
    },
  ];
  return (
    <div className="py-20 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          variants={fadeIn("up")}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl tracking-tight">Popular Categories</h2>
          <p className="mt-4 max-w-2xl text-xl text-gray-500 dark:text-gray-400 mx-auto">Explore high-demand roles across various industries.</p>
        </motion.div>
        <motion.div 
          variants={staggerContainer(0.1)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {categories.map((element) => {
            return (
              <motion.div 
                variants={fadeIn("up")}
                className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:border-blue-100 dark:hover:border-blue-900/50 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer group" 
                key={element.id}
              >
                <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  {element.icon}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{element.title}</h3>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{element.subTitle}</p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
};

export default PopularCategories;
