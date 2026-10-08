# AI-Powered Smart Job Portal

A premium AI-driven recruitment platform built on the MERN stack (MongoDB, Express.js, React.js, Node.js). This application connects job seekers with employers using advanced AI features powered by NVIDIA NIM for resume analysis, job matching, skill gap identification, and interview preparation.


## Features

- **AI Resume Analysis:** Extract and evaluate candidates' resumes (PDF) to determine skills, experience, and assign an AI match score.
- **Smart Job Matching:** Automatically rank open jobs against a candidate's profile and recommend the best fit.
- **Skill Gap & Interview Prep:** Identify missing skills for a desired role and automatically generate tailored interview questions (technical, behavioral, and role-specific).
- **Recruiter Analytics Dashboard:** View comprehensive analytics, application status trends, and candidates sorted by AI match scores.
- **Candidate Tracking System (ATS):** A robust lifecycle tracking system (Applied → Under Review → Shortlisted → Interview → Selected/Rejected) with an animated status timeline.
- **Responsive Design:** A premium, modern SaaS aesthetic, accessible seamlessly across desktop and mobile devices.

## Technologies Used

- **Frontend:** React.js 18, Vite, React Router v6, Tailwind CSS / Design System, Axios
- **Backend:** Node.js, Express.js, MongoDB (Mongoose)
- **AI Integration:** NVIDIA NIM
- **Authentication:** JWT (JSON Web Tokens), Bcrypt (Cookie-based session)
- **File Upload:** Cloudinary (supports PDF text extraction)

## Getting Started

### Prerequisites

- Node.js (v18 or above recommended)
- MongoDB Atlas account (or local MongoDB server)
- Cloudinary account for file storage
- NVIDIA API Key for AI features

### Installation

1. Install NPM packages for both backend and frontend:

   ```sh
   cd backend
   npm install
   cd ../frontend
   npm install
   ```

2. Set up environment variables:

   - In the `backend` directory, create a `.env` file based on `.env.example`:

   ```env
   PORT=4000
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   FRONTEND_URL=http://localhost:5173
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET_KEY=your_jwt_secret
   JWT_EXPIRE=7d
   COOKIE_EXPIRE=7
   NODE_ENV=development
   NVIDIA_API_KEY=your_nvidia_api_key
   ```

   - In the `frontend` directory, create a `.env` file based on `.env.example`:

   ```env
   VITE_API_URL=http://localhost:4000/api/v1
   ```

3. Run the backend server:

   ```sh
   cd backend
   node server.js
   # or npm run dev if configured
   ```

4. Run the frontend application:

   ```sh
   cd frontend
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:5173` to view the app.
