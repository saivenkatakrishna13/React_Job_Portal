import axios from 'axios';

const NVIDIA_BASE_URL = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const MODEL = process.env.NVIDIA_MODEL || 'meta/llama-3.2-11b-vision-instruct';

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

export const analyzeResume = async (resumeText) => {
  if (!process.env.NVIDIA_API_KEY) throw new Error('NVIDIA_API_KEY is not configured.');

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
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Analyze this resume and return ONLY valid JSON:\n\n${resumeText.substring(0, 6000)}` },
    ],
    temperature: 0.1,
    max_tokens: 1500,
    stream: false,
  };

  const response = await axios.post(`${NVIDIA_BASE_URL}/chat/completions`, payload, {
    headers: {
      Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
      'Content-Type': 'application/json',
    },
    timeout: 60000,
  });

  const raw = response.data.choices[0].message.content;
  try {
    const data = JSON.parse(cleanJson(raw));
    data.score = calculateResumeScore(data);
    return data;
  } catch (e) {
    console.error('analyzeResume parse error. Raw:', raw.substring(0, 500));
    throw new Error('AI returned malformed JSON. Please try again.');
  }
};

export const matchJobToCandidate = async (resumeAnalysis, resumeText, jobData) => {
  if (!process.env.NVIDIA_API_KEY) throw new Error('NVIDIA_API_KEY is not configured.');

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
    model: MODEL,
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
  };

  const response = await axios.post(`${NVIDIA_BASE_URL}/chat/completions`, payload, {
    headers: {
      Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
      'Content-Type': 'application/json',
    },
    timeout: 60000,
  });

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
  if (!process.env.NVIDIA_API_KEY) throw new Error('NVIDIA_API_KEY is not configured.');

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
    model: MODEL,
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
  };

  const response = await axios.post(`${NVIDIA_BASE_URL}/chat/completions`, payload, {
    headers: {
      Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
      'Content-Type': 'application/json',
    },
    timeout: 60000,
  });

  const raw = response.data.choices[0].message.content;
  try {
    return JSON.parse(cleanJson(raw));
  } catch (e) {
    throw new Error('AI returned malformed JSON for skill gap.');
  }
};
