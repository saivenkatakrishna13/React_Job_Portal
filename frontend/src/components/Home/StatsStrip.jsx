import React, { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { fadeIn } from "../../utils/animations";

const STATS = [
  { value: 12400, suffix: "+", label: "Job seekers" },
  { value: 850, suffix: "+", label: "Companies" },
  { value: 5200, suffix: "+", label: "Jobs listed" },
  { value: 1800, suffix: "+", label: "Hires made" },
];

const DURATION_MS = 1400;

const formatValue = (n) => Math.round(n).toLocaleString("en-US");

const CountUp = ({ target, suffix }) => {
  const reducedMotion = useReducedMotion();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const [value, setValue] = useState(reducedMotion ? target : 0);

  useEffect(() => {
    if (!inView) return undefined;
    if (reducedMotion) {
      setValue(target);
      return undefined;
    }
    let frame;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / DURATION_MS, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, target, reducedMotion]);

  return (
    <span ref={ref}>
      {formatValue(value)}
      {suffix}
    </span>
  );
};

const StatsStrip = () => {
  return (
    <section
      aria-label="CareerBridge by the numbers"
      className="bg-gray-900 dark:bg-black transition-colors duration-300"
    >
      <motion.div
        variants={fadeIn("up")}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-2 lg:grid-cols-4 gap-8"
      >
        {STATS.map((stat) => (
          <div key={stat.label} className="text-center">
            <p className="text-3xl sm:text-4xl font-extrabold text-white tabular-nums">
              <CountUp target={stat.value} suffix={stat.suffix} />
            </p>
            <p className="mt-2 text-sm font-medium uppercase tracking-wider text-gray-400">
              {stat.label}
            </p>
          </div>
        ))}
      </motion.div>
    </section>
  );
};

export default StatsStrip;
