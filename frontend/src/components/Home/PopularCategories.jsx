import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { fadeIn, staggerContainer } from "../../utils/animations";
import api from "../../utils/api";
import Skeleton from "../ui/Skeleton";
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
import { Briefcase } from "lucide-react";

// Map known category names to a matching icon; unknown ones fall back to a
// generic briefcase so newly posted categories still render.
const ICONS = {
  "Graphics & Design": <MdOutlineDesignServices size={28} className="text-blue-600 dark:text-blue-400" />,
  "Mobile App Development": <TbAppsFilled size={28} className="text-indigo-600 dark:text-indigo-400" />,
  "Frontend Web Development": <MdOutlineWebhook size={28} className="text-emerald-600 dark:text-emerald-400" />,
  "MERN Stack Development": <FaReact size={28} className="text-blue-500 dark:text-blue-300" />,
  "Account & Finance": <MdAccountBalance size={28} className="text-purple-600 dark:text-purple-400" />,
  "Artificial Intelligence": <GiArtificialIntelligence size={28} className="text-pink-600 dark:text-pink-400" />,
  "Video Animation": <MdOutlineAnimation size={28} className="text-orange-500 dark:text-orange-400" />,
  "Game Development": <IoGameController size={28} className="text-red-500 dark:text-red-400" />,
};

const PopularCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data } = await api.get("/job/getall?limit=1000");
        if (cancelled) return;
        const counts = {};
        for (const job of data.jobs || []) {
          if (!job.category) continue;
          counts[job.category] = (counts[job.category] || 0) + 1;
        }
        const sorted = Object.entries(counts)
          .map(([title, count]) => ({ title, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8);
        setCategories(sorted);
      } catch (error) {
        if (!cancelled) setCategories([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasCategories = categories.length > 0;

  return (
    <section
      aria-labelledby="categories-heading"
      className="py-20 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 transition-colors duration-300"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={fadeIn("up")}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="text-center mb-14"
        >
          <h2
            id="categories-heading"
            className="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl tracking-tight"
          >
            Browse by Category
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-gray-500 dark:text-gray-400 mx-auto">
            Explore high-demand roles across various industries — every count is a live opening on CareerBridge.
          </p>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" aria-hidden="true">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 space-y-4">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : !hasCategories ? (
          <div className="text-center py-10">
            <Briefcase size={40} className="mx-auto text-gray-400 mb-4" aria-hidden="true" />
            <p className="text-gray-500 dark:text-gray-400">
              Categories will appear here as soon as employers post jobs.
            </p>
          </div>
        ) : (
          <motion.div
            variants={staggerContainer(0.08)}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {categories.map((category) => (
              <motion.div key={category.title} variants={fadeIn("up")}>
                <Link
                  to={`/job/getall?category=${encodeURIComponent(category.title)}`}
                  className="block bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:border-blue-100 dark:hover:border-blue-900/50 transition-all duration-300 transform hover:-translate-y-1 group h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <div className="w-14 h-14 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                    {ICONS[category.title] || (
                      <Briefcase size={28} className="text-gray-500 dark:text-gray-400" />
                    )}
                  </div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {category.title}
                  </h3>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {category.count} Open {category.count === 1 ? "Position" : "Positions"}
                  </p>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default PopularCategories;
