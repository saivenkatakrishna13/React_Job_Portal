import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

// Short rotating value-prop lines (Part C — auth UX upgrade, report §8.1).
const VALUE_PROPS = [
  "AI-matched jobs in seconds.",
  "Know your skill gaps before you apply.",
  "Interview prep tailored to the role.",
  "Track every application in one place.",
];

const AuthBrandPanel = ({
  accent = "from-blue-600 via-indigo-600 to-purple-700",
}) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setIndex((i) => (i + 1) % VALUE_PROPS.length),
      3000
    );
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className={`hidden lg:flex w-1/2 relative overflow-hidden bg-gradient-to-br ${accent}`}
      aria-hidden="true"
    >
      {/* soft decorative glows */}
      <div className="absolute -top-16 -left-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-20 -right-10 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

      <div className="relative z-10 flex h-full flex-col justify-center p-12">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/70">
          CareerBridge
        </p>

        <div className="mt-5 min-h-[7.5rem]">
          <AnimatePresence mode="wait">
            <motion.h3
              key={index}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="text-3xl font-extrabold leading-snug text-white"
            >
              {VALUE_PROPS[index]}
            </motion.h3>
          </AnimatePresence>
        </div>

        <div className="mt-6 flex gap-2">
          {VALUE_PROPS.map((line, i) => (
            <span
              key={line}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index ? "w-7 bg-white" : "w-3 bg-white/40"
              }`}
            />
          ))}
        </div>

        <p className="mt-10 text-sm text-white/70">
          Resume analysis, skill gaps and interview questions — all in one
          place.
        </p>
      </div>
    </div>
  );
};

export default AuthBrandPanel;
