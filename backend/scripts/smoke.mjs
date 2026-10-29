#!/usr/bin/env node
/**
 * API smoke test for the job portal.
 *
 * Run it with the backend already listening (default :4000):
 *   node backend/scripts/smoke.mjs
 *
 * Optional: RESUME_PDF=/absolute/path/to/resume.pdf to exercise the resume,
 * AI-analysis, apply-with-resume and status-change flow.
 *
 * Note: every assertion is reported on its own PASS/FAIL line and the process
 * exits non-zero if any assertion failed. The two smoke_<timestamp>@example.com
 * users created here stay in the database — the API has no delete-user endpoint.
 */

import { readFile } from "fs/promises";

const BASE = process.env.API_BASE || "http://localhost:4000/api/v1";
const RESUME_PDF = process.env.RESUME_PDF;
const stamp = Date.now();

let passCount = 0;
let failCount = 0;
const check = (name, condition, detail = "") => {
  if (condition) {
    passCount += 1;
    console.log(`PASS  ${name}`);
  } else {
    failCount += 1;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
};

const cookieOf = (res) => {
  const setCookies =
    typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  const tokenCookie = setCookies.find((c) => c.startsWith("token=")) || "";
  return tokenCookie.split(";")[0];
};

const parse = async (res) => {
  try {
    return await res.json();
  } catch {
    return null;
  }
};

const postJson = async (path, body, cookie) => {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body ?? {}),
  });
  return { res, data: await parse(res), cookie: cookieOf(res) };
};

const getJson = async (path, cookie) => {
  const res = await fetch(BASE + path, { headers: cookie ? { Cookie: cookie } : {} });
  return { res, data: await parse(res), cookie: cookieOf(res) };
};

const putJson = async (path, body, cookie) => {
  const res = await fetch(BASE + path, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body ?? {}),
  });
  return { res, data: await parse(res), cookie: cookieOf(res) };
};

const deleteJson = async (path, cookie) => {
  const res = await fetch(BASE + path, {
    method: "DELETE",
    headers: cookie ? { Cookie: cookie } : {},
  });
  return { res, data: await parse(res) };
};

const main = async () => {
  const employerEmail = `smoke_employer_${stamp}@example.com`;
  const seekerEmail = `smoke_jobseeker_${stamp}@example.com`;
  let employerCookie = "";
  let seekerCookie = "";
  let jobId = null;
  let applicationId = null;

  try {
    // --- users ------------------------------------------------------------
    const employer = await postJson("/user/register", {
      name: "Smoke Employer",
      email: employerEmail,
      phone: 9876500001,
      password: "password123",
      role: "Employer",
    });
    employerCookie = employer.cookie;
    check(
      "register employer returns success + token cookie",
      employer.res.status === 201 && employer.data?.success === true && Boolean(employerCookie),
      `status ${employer.res.status} ${JSON.stringify(employer.data || {}).slice(0, 200)}`
    );

    const seeker = await postJson("/user/register", {
      name: "Smoke Jobseeker",
      email: seekerEmail,
      phone: 9876500002,
      password: "password123",
      role: "Job Seeker",
    });
    seekerCookie = seeker.cookie;
    check(
      "register job seeker returns success + token cookie",
      seeker.res.status === 201 && seeker.data?.success === true && Boolean(seekerCookie),
      `status ${seeker.res.status}`
    );

    const seekerUser = seeker.data?.user;
    const employerUser = employer.data?.user;

    // --- job --------------------------------------------------------------
    const posted = await postJson(
      "/job/post",
      {
        title: "Smoke Tester Role",
        description:
          "Temporary job created by the automated smoke test so the API can be verified end to end.",
        category: "MERN Stack Development",
        country: "India",
        city: "Bengaluru",
        location: "Bengaluru, Karnataka, India (remote-friendly)",
        fixedSalary: 123456,
        requiredSkills: ["React", "Node.js"],
        jobType: "Full-time",
        experienceLevel: "Entry",
      },
      employerCookie
    );
    jobId = posted.data?.job?._id || null;
    check(
      "employer posts a job",
      posted.res.status === 200 && posted.data?.success === true && Boolean(jobId),
      `status ${posted.res.status} ${JSON.stringify(posted.data || {}).slice(0, 200)}`
    );

    // --- listing ----------------------------------------------------------
    if (jobId) {
      const list = await getJson("/job/getall?limit=100");
      const found = (list.data?.jobs || []).some((j) => j._id === jobId);
      check(
        "job appears in GET /job/getall?limit=100",
        list.res.status === 200 && list.data?.success === true && found,
        `status ${list.res.status} found=${found}`
      );
    } else {
      check("job appears in GET /job/getall?limit=100", false, "no job to look for");
    }

    // --- 1-click apply without a resume must be rejected -------------------
    const noResumeApply = await postJson("/application/post", { jobId }, seekerCookie);
    check(
      "1-click apply without any resume -> 400",
      noResumeApply.res.status === 400,
      `status ${noResumeApply.res.status} ${JSON.stringify(noResumeApply.data || {}).slice(0, 200)}`
    );

    // --- postedBy must not be overwritable ---------------------------------
    if (jobId && seekerUser?._id) {
      const attempt = await putJson(
        `/job/update/${jobId}`,
        { postedBy: seekerUser._id, title: "Smoke Tester Role" },
        employerCookie
      );
      const after = await getJson(`/job/${jobId}`, employerCookie);
      const postedByNow = after.data?.job?.postedBy;
      check(
        "PUT /job/update/:id cannot change postedBy",
        attempt.res.status === 200 && String(postedByNow) === String(employerUser?._id),
        `status ${attempt.res.status} postedBy=${postedByNow}`
      );
    } else {
      check("PUT /job/update/:id cannot change postedBy", false, "missing ids");
    }

    // --- a job seeker may not move statuses --------------------------------
    const statusAttempt = await putJson(
      "/application/status/000000000000000000000000",
      { status: "Shortlisted" },
      seekerCookie
    );
    check(
      "seeker PUT /application/status/:id -> 400",
      statusAttempt.res.status === 400,
      `status ${statusAttempt.res.status}`
    );

    // --- optional resume flow ---------------------------------------------
    if (RESUME_PDF && jobId && seekerCookie) {
      const bytes = await readFile(RESUME_PDF);
      const form = new FormData();
      form.append("resume", new Blob([bytes], { type: "application/pdf" }), "resume.pdf");
      const uploadRes = await fetch(BASE + "/user/upload-resume", {
        method: "POST",
        headers: { Cookie: seekerCookie },
        body: form,
      });
      const uploadData = await parse(uploadRes);
      check(
        "upload resume PDF",
        uploadRes.status === 200 && uploadData?.success === true,
        `status ${uploadRes.status} ${JSON.stringify(uploadData || {}).slice(0, 200)}`
      );

      const analysis = await postJson("/ai/analyze-resume", {}, seekerCookie);
      check(
        "POST /ai/analyze-resume returns an analysis",
        analysis.res.status === 200 && Boolean(analysis.data?.analysis),
        `status ${analysis.res.status} ${JSON.stringify(analysis.data || {}).slice(0, 200)}`
      );

      const apply = await postJson("/application/post", { jobId }, seekerCookie);
      applicationId = apply.data?.application?._id || null;
      check(
        "apply with resume on file",
        apply.res.status === 200 && apply.data?.success === true && Boolean(applicationId),
        `status ${apply.res.status}`
      );

      if (applicationId) {
        check(
          "new application carries createdAt (timestamps fix)",
          Boolean(apply.data?.application?.createdAt),
          `createdAt=${apply.data?.application?.createdAt}`
        );

        const shortlist = await putJson(
          `/application/status/${applicationId}`,
          { status: "Shortlisted" },
          employerCookie
        );
        check(
          "employer moves application to Shortlisted",
          shortlist.res.status === 200 && shortlist.data?.application?.status === "Shortlisted",
          `status ${shortlist.res.status}`
        );
      }
    } else if (!RESUME_PDF) {
      console.log("SKIP  resume flow (set RESUME_PDF=/path/to/resume.pdf to enable it)");
    }
  } catch (error) {
    check("smoke run completed without a thrown error", false, error.message);
  } finally {
    // --- cleanup ----------------------------------------------------------
    if (applicationId && seekerCookie) {
      try {
        const removed = await deleteJson(`/application/delete/${applicationId}`, seekerCookie);
        check("cleanup: application deleted", removed.res.status === 200, `status ${removed.res.status}`);
      } catch (error) {
        check("cleanup: application deleted", false, error.message);
      }
    }
    if (jobId && employerCookie) {
      try {
        const removed = await deleteJson(`/job/delete/${jobId}`, employerCookie);
        check("cleanup: job deleted", removed.res.status === 200, `status ${removed.res.status}`);
      } catch (error) {
        check("cleanup: job deleted", false, error.message);
      }
    }
  }

  console.log(`\nPassed: ${passCount}   Failed: ${failCount}`);
  console.log(
    "Note: smoke_employer_*/smoke_jobseeker_* users remain in the database (there is no delete-user endpoint)."
  );
  process.exit(failCount === 0 ? 0 : 1);
};

main();