import React, { useContext, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AiOutlineClose } from "react-icons/ai";
import { Context } from "../../main";
import api from "../../utils/api";

const greetingForHour = (hour) =>
  hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

// One-time personalized greeting (report §8.2). Every number is real data
// from an existing endpoint — job matches for seekers, unchecked applicants
// for employers — never placeholder text. Returns { hello, line } or null.
// Called ONCE from the login handler; kept out of localStorage on purpose so
// it resets cleanly with the in-memory auth state on logout.
export const buildGreeting = async (user) => {
  if (!user || !user.name) return null;
  const first = String(user.name).trim().split(/\s+/)[0];
  const hello = `${greetingForHour(new Date().getHours())}, ${first}`;

  if (user.role === "Employer") {
    // "Since you last checked" = unread new-applicant notifications (the bell
    // clears them via mark-all-read). Falls back to applications received in
    // the last 24 h when notifications are unavailable.
    let count = null;
    try {
      const res = await api.get("/notifications");
      count = (res.data.notifications || []).filter(
        (n) => n.type === "new-applicant" && !n.read
      ).length;
    } catch {
      count = null;
    }
    if (count === null) {
      try {
        const res = await api.get("/application/employer/getall");
        const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
        count = (res.data.applications || []).filter(
          (a) => new Date(a.createdAt).getTime() >= dayAgo
        ).length;
      } catch {
        count = 0;
      }
    }
    const line =
      count > 0
        ? `${count} new applicant${count === 1 ? "" : "s"} since you last checked.`
        : "You're all caught up on applicants.";
    return { hello, line };
  }

  // Job seeker: active jobs whose required skills overlap the profile's
  // analysed skills (resumeAnalysis). Without a resume yet, fall back to the
  // live open-job count — still real data, honestly phrased.
  const skills = ((user.resumeAnalysis && user.resumeAnalysis.technicalSkills) || [])
    .map((skill) => String(skill).toLowerCase());
  try {
    const res = await api.get("/job/getall?limit=100");
    const jobs = res.data.jobs || [];
    if (skills.length) {
      const matches = jobs.filter((job) =>
        (job.requiredSkills || []).some((skill) =>
          skills.includes(String(skill).toLowerCase())
        )
      );
      const n = matches.length;
      const line =
        n > 0
          ? `${n} job${n === 1 ? "" : "s"} match your profile today.`
          : "No exact matches yet — fresh jobs are posted daily.";
      return { hello, line };
    }
    return {
      hello,
      line: `${jobs.length} open role${jobs.length === 1 ? "" : "s"} waiting for you right now.`,
    };
  } catch {
    return { hello, line: "Great to have you back." };
  }
};

const DISMISS_MS = 9000;

const GreetingBanner = () => {
  const { greeting, setGreeting } = useContext(Context);
  const pending = Boolean(greeting && greeting.pending && greeting.hello);

  // Shows once at login and dismisses itself; clearing `pending` guarantees
  // it never re-triggers on later navigation within the session.
  useEffect(() => {
    if (!pending) return undefined;
    const id = setTimeout(() => setGreeting(null), DISMISS_MS);
    return () => clearTimeout(id);
  }, [pending, setGreeting]);

  if (!pending) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-2xl pointer-events-none">
      <AnimatePresence>
        <motion.div
          key="greeting"
          initial={{ opacity: 0, y: -16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ type: "spring", duration: 0.6, bounce: 0.3 }}
          role="status"
          aria-live="polite"
          className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-blue-100 dark:border-blue-900/60 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md px-4 py-3 shadow-lg"
        >
          <motion.span
            aria-hidden="true"
            className="text-2xl leading-none mt-0.5"
            initial={{ rotate: 0 }}
            animate={{ rotate: [0, 16, -10, 16, -6, 0] }}
            transition={{ duration: 1.1, delay: 0.35, ease: "easeInOut" }}
          >
            👋
          </motion.span>
          <p className="flex-1 text-sm text-gray-700 dark:text-gray-200">
            <span className="font-bold text-gray-900 dark:text-white">
              {greeting.hello}
            </span>{" "}
            — {greeting.line}
          </p>
          <button
            type="button"
            onClick={() => setGreeting(null)}
            aria-label="Dismiss greeting"
            className="mt-0.5 p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <AiOutlineClose size={16} />
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default GreetingBanner;
