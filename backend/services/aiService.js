import axios from 'axios';

// Read at call time: module-level reads would run before dotenv loads .env
// when the server is started from the project root.
const baseUrl = () => process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';
// NOTE (report §2 deviation, finding PD.6): this Groq account's catalog does
// not serve llama-3.3-70b-versatile / llama-3.1-8b-instant /
// mixtral-8x7b-32768 (they 404/400 on first live call, 2026-10-26). The
// chain is configured to models this account actually serves, each verified
// live with response_format=json_object before switching:
//   primary gpt-oss-120b (strongest), then qwen3.8-27b (architecturally
//   different), then allam-2-7b (small/fast) — same design intent as the
//   report: strong primary + fast second + non-Llama-family third.
const model = () => process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

// Ordered model chain: primary (GROQ_MODEL or the built-in default), then
// comma-separated GROQ_MODEL_FALLBACKS. Defaults keep the chain intact even
// with no env set: a fast small Llama first, then an architecturally
// different model so one provider-side regression on the Llama family can't
// take down the whole chain (Part C Phase 5, migrated to Groq).
const modelChain = () => {
  const primary = model();
  const fallbacks = (
    process.env.GROQ_MODEL_FALLBACKS ?? 'qwen/qwen3.8-27b,allam-2-7b'
  )
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry && entry !== primary);
  return [primary, ...fallbacks];
};

// ---- Multi-key pool (report §9): 3 keys, round-robin + failover --------
// Three independent keys rather than one: on a 429 the offending key is
// cooled for exactly as long as Groq's headers say and the SAME model is
// retried immediately on the next key (a different key's quota is
// independent, so no sleep). Model fallback happens only once every key is
// cooling — switching keys preserves answer quality, switching models doesn't.
const KEY_ENV_NAMES = ['GROQ_API_KEY_1', 'GROQ_API_KEY_2', 'GROQ_API_KEY_3'];

// Named keys are preferred (rotate/revoke one without touching the others);
// a legacy single GROQ_API_KEY still works as a one-key pool.
const configuredKeys = () => {
  const named = KEY_ENV_NAMES.map((name) => process.env[name]).filter(
    (value) => value && String(value).trim()
  );
  if (named.length) return named.map((value) => String(value).trim());
  return process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim()
    ? [process.env.GROQ_API_KEY.trim()]
    : [];
};

// Pure state machine so it can be unit-tested without a network (report
// §9.4b): entries are { key, status: "ok" | "cooling", cooldownUntil,
// lastUsed }; pick() is LRU among the usable keys, which both spreads normal
// load across all 3 keys and walks 1 → 2 → 3 under failure.
export const createKeyPool = (keys, now = Date.now) => {
  const entries = keys
    .filter((key) => key && String(key).trim())
    .map((key) => ({
      key: String(key).trim(),
      status: 'ok',
      cooldownUntil: 0,
      lastUsed: 0,
    }));
  let tick = 0;
  const refresh = () => {
    const t = now();
    for (const entry of entries) {
      if (entry.status === 'cooling' && entry.cooldownUntil <= t) entry.status = 'ok';
    }
  };
  return {
    entries,
    size() {
      refresh();
      return entries.filter((entry) => entry.status === 'ok').length;
    },
    hasUsable() {
      refresh();
      return entries.some((entry) => entry.status === 'ok');
    },
    pick() {
      refresh();
      const usable = entries.filter((entry) => entry.status === 'ok');
      if (!usable.length) return null;
      usable.sort((a, b) => a.lastUsed - b.lastUsed);
      const chosen = usable[0];
      chosen.lastUsed = ++tick;
      return chosen;
    },
    cool(entry, ms, { permanent = false } = {}) {
      entry.status = 'cooling';
      entry.cooldownUntil = permanent ? Infinity : now() + Math.max(0, ms);
    },
    // Soonest finite recovery, ms (0 when nothing recoverable is cooling —
    // permanently disabled keys must never stall the chain).
    shortestCooldownMs() {
      refresh();
      let soonest = Infinity;
      for (const entry of entries) {
        if (entry.status === 'cooling' && Number.isFinite(entry.cooldownUntil)) {
          const remaining = entry.cooldownUntil - now();
          if (remaining < soonest) soonest = remaining;
        }
      }
      return soonest === Infinity ? 0 : Math.max(0, soonest);
    },
  };
};

// Persistent pool (cooldowns must survive across requests): built lazily on
// first use and rebuilt only if the configured keys change.
let poolCache = null;
let poolSignature = null;
const keyPool = () => {
  const keys = configuredKeys();
  const signature = keys.join('\u0000');
  if (!poolCache || signature !== poolSignature) {
    poolCache = createKeyPool(keys);
    poolSignature = signature;
  }
  return poolCache;
};

// ---- Mock mode (real API keys go in only at the very end, report §10) -----
// With AI_MOCK_MODE=true, or simply no GROQ key set, every AI route answers
// from canned-but-realistic data computed from the REAL request inputs
// (resume text, job skills) — no network call, no credits spent.
// AI_MOCK_MODE=false forces live calls and then at least one key is required.
export const isMockMode = () => {
  const flag = process.env.AI_MOCK_MODE;
  if (flag === 'true') return true;
  if (flag === 'false') return false;
  return configuredKeys().length === 0;
};

// 429 backoff driven by Groq's own rate-limit headers instead of a guessed
// constant: `retry-after` is plain seconds, `x-ratelimit-reset-requests` is a
// Go duration like "10s" / "1m30s". Capped at 5 s so a UI panel never stalls
// waiting out the provider's full window; unparseable -> short 3 s default.
const MAX_BACKOFF_MS = 5000;
const DEFAULT_BACKOFF_MS = 3000;
const parseRetryDelayMs = (headers) => {
  const candidates = [headers['retry-after'], headers['x-ratelimit-reset-requests']];
  for (const raw of candidates) {
    if (raw === undefined || raw === null || raw === '') continue;
    const text = String(raw).trim();
    if (/^\d+(\.\d+)?$/.test(text)) return Math.min(Number(text) * 1000, MAX_BACKOFF_MS);
    // Go duration: "10s", "1m30s", "250ms" (m is minutes only when not
    // followed by 's', otherwise "150ms" would read as 150 minutes).
    const match = text.match(
      /^(?:(\d+(?:\.\d+)?)h)?(?:(\d+(?:\.\d+)?)m(?!s))?(?:(\d+(?:\.\d+)?)ms)?(?:(\d+(?:\.\d+)?)s)?$/
    );
    if (match && (match[1] || match[2] || match[3] || match[4])) {
      const ms =
        (Number(match[1] || 0) * 3600 +
          Number(match[2] || 0) * 60 +
          Number(match[3] || 0) / 1000 +
          Number(match[4] || 0)) *
        1000;
      if (ms > 0) return Math.min(ms, MAX_BACKOFF_MS);
    }
  }
  return DEFAULT_BACKOFF_MS;
};

// One place where the provider is called: any transport/HTTP failure becomes a
// clean 502 for the client instead of an unhandled axios error -> 500.
// Policy per attempt (report §2/§9):
// - 429: cool ONLY the offending key for exactly as long as Groq's
//   Retry-After / x-ratelimit-reset-requests says, then retry the SAME model
//   immediately on the next key — no sleep, a different key's quota is
//   independent. Model fallback happens only when every key is cooling
//   (after honouring the soonest recovery, capped at 5 s).
// - 401/403: that key is revoked/bad — mark it permanently unavailable and
//   try the next key; if all keys are dead the chain ends in a clean 502.
// - 404/410 (model gone or EOL) and other 4xx: move to the NEXT model.
// - 5xx: retry once (the LRU pick naturally rotates keys), then next model.
// - timeout/network: the provider itself is unreachable — one long wait is
//   enough; chaining would only multiply the stall, so go straight to 502.
// Malformed-JSON failures are NOT handled here (they keep their own messages).
// `transport` is injectable so the rotation logic is unit-testable offline
// (backend/scripts/test_keypool.mjs); production calls use axios.
export const requestChat = async (payload, transport = axios.post) => {
  const chain = modelChain();
  const pool = keyPool();
  let providerUnreachable = false;

  for (const currentModel of chain) {
    if (providerUnreachable) break;
    let retriesLeft = 1;
    while (true) {
      const keyEntry = pool.pick();
      if (!keyEntry) {
        // Every key is cooling (the §9.2.4 hand-off point): honour the
        // soonest finite recovery before the next model gets its turn —
        // otherwise the next model could not pick a key either. Permanently
        // dead keys report 0 ms so the chain fails fast instead of stalling.
        const waitMs = Math.min(pool.shortestCooldownMs(), MAX_BACKOFF_MS);
        if (waitMs > 0) {
          console.error(
            `AI: all keys cooling (model=${currentModel}); waiting ${waitMs}ms before trying the next model.`
          );
          await new Promise((resolve) => setTimeout(resolve, waitMs));
        }
        break;                                           // -> next model
      }
      const keyIndex = pool.entries.indexOf(keyEntry) + 1; // 1-based, logged index never the key
      try {
        const response = await transport(
          `${baseUrl()}/chat/completions`,
          { ...payload, model: currentModel },
          {
            headers: {
              Authorization: `Bearer ${keyEntry.key}`,
              'Content-Type': 'application/json',
            },
            // Groq answers in the low hundreds of ms to a couple of seconds,
            // but a long generation or a busy window can still run on; the
            // generous timeout keeps a slow-but-progressing answer from
            // becoming a 502 (same internal constant as before — no contract
            // change).
            timeout: 180000,
          }
        );
        // Server-side only: see rotation actually load-balance (§9.2.6).
        console.log(
          `AI served: key k${keyIndex}/${pool.entries.length}, model=${currentModel}`
        );
        return response;
      } catch (error) {
        const status = error.response ? error.response.status : null;
        const detail = status ? `status ${status}` : error.message;
        console.error(
          `AI provider failure (model=${currentModel}, key k${keyIndex}): ${detail}`
        );
        if (status === 429) {
          // Per-key cooldown from the provider's own headers; the loop's next
          // pick() immediately uses another key on the SAME model (§9.2.3).
          const waitMs = parseRetryDelayMs(
            (error.response && error.response.headers) || {}
          );
          pool.cool(keyEntry, waitMs);
          console.error(
            `AI key k${keyIndex} rate-limited; cooling ${waitMs}ms — trying the next key on the same model.`
          );
          continue;
        }
        if (status === 401 || status === 403) {
          // Auth rejection is a key problem, not a request problem (§9.3):
          // disable this key for good and let the other keys carry the app.
          pool.cool(keyEntry, 0, { permanent: true });
          console.error(
            `AI key k${keyIndex} rejected (${status}); marking it unavailable.`
          );
          continue;                                       // next key, same model
        }
        if (status !== null && status < 500) break;       // 404/410/other 4xx -> next model
        if (status !== null && retriesLeft > 0) {
          retriesLeft -= 1;
          continue;                                       // 5xx -> one fast retry (new key)
        }
        if (status !== null) break;                       // 5xx again -> next model
        providerUnreachable = true;                       // timeout/network -> stop
        break;
      }
    }
  }

  const providerError = new Error('AI service is unavailable right now. Please try again.');
  providerError.statusCode = 502;
  throw providerError;
};

// Strip markdown code fences and find the first {...} block
const cleanJson = (str) => {
  let s = str.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start !== -1 && end !== -1) s = s.substring(start, end + 1);
  return s;
};

const calculateResumeScore = (data) => {
  let score = 0;
  const isStudent = data.experienceYears === 0 || data.candidateType === "Student / Entry Level";
  
  const techScore = Math.min((data.technicalSkills?.length || 0) * 5, 100);
  const projScore = Math.min((data.projects?.length || 0) * 15, 100);
  const eduScore = (data.education?.length || 0) > 0 ? 100 : 0;
  const certScore = Math.min((data.certifications?.length || 0) * 10, 100);
  const hackScore = Math.min((data.hackathons?.length || 0) * 10, 100);
  const expScore = Math.min((data.experienceYears || 0) * 10, 100);
  
  if (isStudent) {
    score = (techScore * 0.25) + (projScore * 0.30) + (eduScore * 0.15) + (certScore * 0.10) + (hackScore * 0.10) + 10;
  } else {
    score = (expScore * 0.30) + (techScore * 0.20) + (projScore * 0.15) + (eduScore * 0.10) + (certScore * 0.10) + 15;
  }
  return Math.round(Math.min(score, 100));
};

export const calculateJobMatchScore = (resumeAnalysis, jobData, matchingSkills) => {
  if (!resumeAnalysis) return 0;
  const isStudent = resumeAnalysis.experienceYears === 0 || resumeAnalysis.candidateType === "Student / Entry Level";
  let requiredExp = 0;
  const expLevel = jobData.experienceLevel || "Entry";
  if (expLevel.includes("Senior") || expLevel.includes("Lead") || expLevel === "5+ Years") requiredExp = 5;
  else if (expLevel.includes("Mid") || expLevel === "1-3 Years") requiredExp = 2;
  else if (expLevel.includes("Entry")) requiredExp = 0;

  let baseScore = 0;
  const requiredCount = jobData.requiredSkills?.length || 0;
  if (requiredCount > 0) {
    baseScore = (matchingSkills.length / requiredCount) * 100;
  } else {
    baseScore = 80;
  }

  if (isStudent && requiredExp >= 3) {
    baseScore = Math.min(baseScore, 40);
  } else if (isStudent && requiredExp > 0) {
    baseScore = Math.min(baseScore, 70);
  } else if (resumeAnalysis.experienceYears < requiredExp) {
    baseScore = Math.min(baseScore, 60);
  }

  return Math.round(baseScore);
};

// ---- Mock implementations (canned but computed from real inputs) ----------
// These keep every AI feature provably testable before any provider key is
// wired in (see isMockMode above). Skill split, match scores and the resume
// score all come from the SAME real functions the live path uses.
const KNOWN_SKILLS = [
  'JavaScript', 'TypeScript', 'React', 'Node.js', 'Express', 'MongoDB', 'MySQL',
  'SQL', 'Python', 'Java', 'Git', 'Docker', 'Kubernetes', 'AWS', 'HTML', 'CSS',
  'Tailwind', 'REST APIs', 'GraphQL', 'Next.js', 'Redux', 'Firebase',
];

// Token-aware mention test: a plain substring match would report "Go" as
// present in "MongoDB" and "Java" in "JavaScript".
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const mentionsSkill = (text, skill) =>
  new RegExp(
    `(?<![a-z0-9])${escapeRegex(String(skill).toLowerCase())}(?![a-z0-9])`
  ).test(String(text).toLowerCase());

const findSkills = (text = '') =>
  KNOWN_SKILLS.filter((skill) => mentionsSkill(text, skill));

// Split a job's required skills into present/missing against a resume.
const splitByJobSkills = (resumeText, jobData) => {
  const required = (jobData.requiredSkills || [])
    .map((skill) => String(skill).trim())
    .filter(Boolean);
  const have = [];
  const missing = [];
  for (const skill of required) {
    // Either the skill literally appears in the resume text, or it is one of
    // the recognised skills extracted from it (handles "Node JS" vs "Node.js").
    const hit =
      mentionsSkill(resumeText, skill) ||
      findSkills(resumeText).some(
        (known) => known.toLowerCase() === skill.toLowerCase()
      );
    (hit ? have : missing).push(skill);
  }
  return { have, missing, required };
};

const mockAnalyzeResume = (resumeText) => {
  const text = String(resumeText || '');
  const technicalSkills = findSkills(text);
  const yearsMatch = text.match(/(\d+)\+?\s+years?/i);
  const experienceYears = yearsMatch ? Math.min(Number(yearsMatch[1]), 30) : 0;
  const candidateType =
    experienceYears === 0
      ? 'Student / Entry Level'
      : experienceYears >= 5
        ? 'Senior / Professional'
        : 'Experienced';
  const data = {
    technicalSkills: technicalSkills.length ? technicalSkills : ['Web Fundamentals'],
    softSkills: ['Communication', 'Teamwork', 'Problem Solving'],
    experienceYears,
    candidateType,
    strengths: technicalSkills.length
      ? [
          `Hands-on ${technicalSkills.slice(0, 2).join(' and ')} experience`,
          'Clear written communication',
        ]
      : ['Motivated and quick to learn'],
    weaknesses: [
      'Limited production deployment experience',
      'Could deepen system-design knowledge',
    ],
    suggestedSkills: ['System Design', 'Automated Testing', 'CI/CD'],
    education: [
      { degree: 'B.Tech', field: 'Computer Science', institution: 'State University', year: '2025' },
    ],
    projects: [
      {
        name: 'Portfolio Project',
        description: `Built with ${(technicalSkills[0] || 'modern web technologies')}.`,
      },
    ],
    certifications: [],
    hackathons: [],
    summary: `Mock analysis: candidate reports ${experienceYears} year(s) of experience with skills in ${
      technicalSkills.slice(0, 4).join(', ') || 'general software development'
    }.`,
  };
  data.score = calculateResumeScore(data);
  return data;
};

const mockMatch = (resumeAnalysis, resumeText, jobData) => {
  const { have, missing, required } = splitByJobSkills(resumeText, jobData);
  const parsed = {
    matchingSkills: have,
    missingSkills: missing,
    explanation: have.length
      ? `Matches ${have.length} of ${required.length} required skills: ${have.join(', ')}.`
      : 'No required skill from this posting appears in the resume yet.',
  };
  parsed.matchScore = calculateJobMatchScore(resumeAnalysis, jobData, have);
  return parsed;
};

const mockSkillGap = (resumeText, jobData) => {
  const { have, missing, required } = splitByJobSkills(resumeText, jobData);
  const haveSkills = required.length ? have : findSkills(resumeText).slice(0, 5);
  const whyItMatters = {};
  for (const skill of missing) {
    whyItMatters[skill] = `${skill} is explicitly required for this role and is not evidenced in the resume.`;
  }
  return { haveSkills, missingSkills: missing, whyItMatters };
};

const mockInterviewQuestions = (resumeText, jobData) => {
  const { missing, required } = splitByJobSkills(resumeText, jobData);
  const focus = (required.length ? required : findSkills(resumeText)).slice(0, 3);
  const title = jobData.title || 'this role';
  return {
    questions: [
      {
        question: `Walk me through how you would use ${focus[0] || 'your strongest skill'} to ship a feature in a ${title} role.`,
        type: 'technical',
        tip: `A strong answer names concrete ${focus[0] || 'technical'} decisions, the trade-offs considered, and how the change was verified.`,
      },
      {
        question: `How would you keep a service that leans on ${focus[1] || 'the main stack'} reliable under heavy load?`,
        type: 'technical',
        tip: 'Covers failure modes, monitoring, backpressure and a safe rollout plan.',
      },
      {
        question: 'Tell me about a time you disagreed with a teammate about an approach. What did you do?',
        type: 'behavioral',
        tip: 'Uses a clear situation-action-result structure without blaming others.',
      },
      {
        question: 'Describe a bug you chased down recently. How did you isolate and fix it?',
        type: 'behavioral',
        tip: 'Shows systematic debugging, hypothesis-driven isolation and ownership of the outcome.',
      },
      {
        question: `Why does this ${title} role fit the next step in your career, and what would you want to learn in the first 90 days?`,
        type: 'role-specific',
        tip: 'Connects past work to this team\u2019s problems with specific first-90-day goals.',
      },
      {
        question: missing.length
          ? `Which missing skill would you prioritise first — ${missing.join(', ')} — and how would you go about learning it?`
          : `What part of ${title} work would you most like to deepen over the next year?`,
        type: 'role-specific',
        tip: 'A credible, time-bound learning plan beats pretending to know everything.',
      },
    ],
  };
};

export const analyzeResume = async (resumeText) => {
  if (isMockMode()) return mockAnalyzeResume(resumeText);
  if (configuredKeys().length === 0) throw new Error('No Groq API key configured (set GROQ_API_KEY_1/2/3).');

  const systemPrompt = `You are an expert ATS (Applicant Tracking System) and resume data extractor.

CRITICAL RULES — YOU MUST FOLLOW THESE EXACTLY:
1. "experienceYears" MUST be the number of years of PAID PROFESSIONAL EMPLOYMENT only. 
   - Do NOT count internships unless they are explicitly labelled as "Internship" in a company.
   - Do NOT count academic projects, personal projects, or open-source work as experience.
   - Do NOT count certifications or training as experience.
   - If the resume shows only student projects with no listed employer/company, set experienceYears to 0.
   - Projects labelled as "Skill India", "AI chatbot", or university coursework are NOT employment.

2. "candidateType" MUST be exactly one of: "Student / Entry Level", "Experienced", "Senior / Professional". Based purely on employment history.

3. "technicalSkills" — list only skills that are EXPLICITLY mentioned. Do not invent or infer.
4. "strengths" — base strengths ONLY on actual resume evidence. Do not invent professional industry experience for students.
5. "projects" — list all projects, heavily analyzing technologies used.
6. "hackathons" — extract any hackathon participation explicitly mentioned.

Respond with ONLY a valid JSON object. No markdown, no preamble.

Return this exact JSON structure:
{
  "technicalSkills": ["skill1", "skill2"],
  "softSkills": ["skill1"],
  "experienceYears": 0,
  "candidateType": "Student / Entry Level",
  "strengths": ["strength1"],
  "weaknesses": ["weakness1"],
  "suggestedSkills": ["skill to learn1"],
  "education": [{"degree": "B.Tech", "field": "CS", "institution": "XYZ University", "year": "2025"}],
  "projects": [{"name": "Project Name", "description": "Brief description"}],
  "certifications": ["cert1"],
  "hackathons": ["hackathon1"],
  "summary": "One-sentence honest summary of this candidate"
}`;

  const payload = {
    model: model(),
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Analyze this resume and return ONLY valid JSON:\n\n${resumeText.substring(0, 6000)}` },
    ],
    temperature: 0.1,
    max_tokens: 1500,
    stream: false,
    // Provider-native structural JSON guarantee (Groq json_object mode).
    response_format: { type: 'json_object' },
  };

  // ONE retry when the answer cannot be parsed (Part C Phase 10). Groq's
  // json_object mode makes malformed output rare, so this is now a safety net
  // rather than the primary fix; a second failure keeps the original exact
  // message (gate C8.4).
  let raw;
  for (let attempt = 1; ; attempt++) {
    const resp = await requestChat(payload);
    raw = resp.data.choices[0].message.content;
    try {
      const data = JSON.parse(cleanJson(raw));
      data.score = calculateResumeScore(data);
      return data;
    } catch (e) {
      // Head + tail: head alone cannot distinguish truncation from
      // trailing prose/second object after a valid opening.
      console.error('analyzeResume parse error (attempt ' + attempt + '). len=' + raw.length +
        ' head=' + JSON.stringify(raw.substring(0, 300)) +
        ' tail=' + JSON.stringify(raw.substring(Math.max(0, raw.length - 300))));
      if (attempt >= 2) {
        throw new Error('AI returned malformed JSON. Please try again.');
      }
    }
  }
};

export const matchJobToCandidate = async (resumeAnalysis, resumeText, jobData) => {
  if (isMockMode()) return mockMatch(resumeAnalysis, resumeText, jobData);
  if (configuredKeys().length === 0) throw new Error('No Groq API key configured (set GROQ_API_KEY_1/2/3).');

  const systemPrompt = `You are an expert technical recruiter matching a resume to a job.
RULES:
- matchingSkills: skills that appear in BOTH the resume and job requirements.
- missingSkills: skills listed in job requirements that are NOT in the resume.
- Identify the gaps intelligently. Do NOT invent skills.
- Respond with ONLY a valid JSON object, no markdown.

Return:
{
  "matchingSkills": ["skill1"],
  "missingSkills": ["skill2"],
  "explanation": "One honest sentence explaining the match."
}`;

  const payload = {
    model: model(),
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Job Requirements:\nTitle: ${jobData.title}\nDescription: ${jobData.description || ''}\nRequired Skills: ${(jobData.requiredSkills || []).join(', ')}\nExperience Level: ${jobData.experienceLevel || 'Not specified'}\n\nCandidate Resume:\n${resumeText.substring(0, 4000)}`,
      },
    ],
    temperature: 0.1,
    max_tokens: 600,
    stream: false,
    // Provider-native structural JSON guarantee (Groq json_object mode).
    response_format: { type: 'json_object' },
  };

  const response = await requestChat(payload);

  const raw = response.data.choices[0].message.content;
  try {
    const parsed = JSON.parse(cleanJson(raw));
    parsed.matchScore = calculateJobMatchScore(resumeAnalysis, jobData, parsed.matchingSkills || []);
    return parsed;
  } catch (e) {
    throw new Error('AI returned malformed JSON for job match.');
  }
};

export const getSkillGap = async (resumeText, jobData) => {
  if (isMockMode()) return mockSkillGap(resumeText, jobData);
  if (configuredKeys().length === 0) throw new Error('No Groq API key configured (set GROQ_API_KEY_1/2/3).');

  const systemPrompt = `You are a career coach for a job portal. 
Identify the exact skill gap between a candidate's resume and a job posting.
Be factual — only list skills from the job that are missing from the resume.
Respond with ONLY a valid JSON object.

Return:
{
  "haveSkills": ["skill1"],
  "missingSkills": ["skill2"],
  "whyItMatters": {
    "skill2": "Brief reason why this skill matters for the role"
  }
}`;

  const payload = {
    model: model(),
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Job: ${jobData.title}\nRequired Skills: ${(jobData.requiredSkills || []).join(', ')}\nDescription: ${jobData.description || ''}\n\nCandidate Resume:\n${resumeText.substring(0, 4000)}`,
      },
    ],
    temperature: 0.1,
    max_tokens: 600,
    stream: false,
    // Provider-native structural JSON guarantee (Groq json_object mode).
    response_format: { type: 'json_object' },
  };

  const response = await requestChat(payload);

  const raw = response.data.choices[0].message.content;
  try {
    return JSON.parse(cleanJson(raw));
  } catch (e) {
    throw new Error('AI returned malformed JSON for skill gap.');
  }
};

export const getInterviewQuestions = async (resumeText, jobData) => {
  if (isMockMode()) return mockInterviewQuestions(resumeText, jobData);
  if (configuredKeys().length === 0) throw new Error('No Groq API key configured (set GROQ_API_KEY_1/2/3).');

  const systemPrompt = `You are an expert technical interviewer preparing a candidate for a specific job.
Generate exactly 6 interview questions: a mix of technical, behavioral and role-specific questions.
RULES:
- Questions must be specific to THIS job's requirements and the candidate's resume.
- Keep every question to one or two sentences so the whole set fits comfortably in the token budget.
- Respond with ONLY a valid JSON object, no markdown, no preamble.

Return this exact JSON structure:
{
  "questions": [
    { "question": "Exact question to ask", "type": "technical | behavioral | role-specific", "tip": "What a strong answer should demonstrate" }
  ]
}`;

  const payload = {
    model: model(),
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Job: ${jobData.title}\nRequired Skills: ${(jobData.requiredSkills || []).join(', ')}\nDescription: ${jobData.description || ''}\nExperience Level: ${jobData.experienceLevel || 'Not specified'}\n\nCandidate Resume:\n${resumeText.substring(0, 4000)}`,
      },
    ],
    temperature: 0.3,
    // Pretty-printed JSON wastes tokens; 6 questions with tips must fit or the
    // array truncates mid-way and no longer parses (finish_reason=length).
    max_tokens: 2500,
    stream: false,
    // Provider-native structural JSON guarantee (Groq json_object mode).
    response_format: { type: 'json_object' },
  };

  const response = await requestChat(payload);

  const choice = response.data.choices[0];
  const raw = choice.message.content;
  try {
    const parsed = JSON.parse(cleanJson(raw));
    if (!Array.isArray(parsed.questions)) throw new Error('missing questions array');
    return parsed;
  } catch (e) {
    console.error(
      `interviewQuestions parse error. finish_reason=${choice.finish_reason} len=${raw.length} tail=${JSON.stringify(raw.slice(-160))}`
    );
    throw new Error('AI returned malformed JSON for interview questions.');
  }
};
