<div align="center">

# 🚀 HIRENEX - Candidate Portal

### AI-Powered Recruitment Assessment Platform

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS_4-06B6D4?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Groq](https://img.shields.io/badge/Groq-Llama_3.3-FF6B35?style=for-the-badge)](https://groq.com/)

*Enterprise-grade candidate assessment platform with AI-powered proctoring, multi-modal evaluations, resume analysis, and job matching.*

[🎯 Features](#-features) • [🔒 Proctoring](#-advanced-proctoring-system) • [🛠️ Installation](#%EF%B8%8F-installation) • [📁 Structure](#-project-structure)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Advanced Proctoring System](#-advanced-proctoring-system)
- [Assessment Engine](#-assessment-engine)
- [Tech Stack](#-tech-stack)
- [Installation](#%EF%B8%8F-installation)
- [Environment Variables](#-environment-variables)
- [Database Setup](#-database-setup)
- [API Endpoints](#-api-endpoints)
- [Project Structure](#-project-structure)
- [Deployment](#-deployment)

---

## 🎯 Overview

HIRENEX is a comprehensive AI-powered recruitment assessment platform designed to streamline the hiring process. The candidate portal enables job seekers to browse opportunities, submit resumes, and complete rigorous multi-stage assessments - all while being monitored by an enterprise-grade proctoring system.

### Why HIRENEX?

| Feature | Benefit |
|---------|---------|
| **AI-Powered Assessments** | Dynamic question generation tailored to job requirements |
| **Real-Time Proctoring** | Face detection, hand tracking, and browser monitoring |
| **Multi-Modal Evaluation** | MCQs, coding challenges, text responses & psychometric tests |
| **Smart Resume Analysis** | AI parsing with job description matching |
| **Secure Environment** | Anti-cheat mechanisms with integrity scoring |

---

## ✨ Features

### 📄 **AI Resume Analysis**
- **Intelligent Parsing**: Extract skills, experience, education, and certifications using Groq AI
- **Job Matching Score**: Automated compatibility scoring against job descriptions
- **Strength/Weakness Analysis**: AI-generated insights on candidate profiles
- **PDF/Document Support**: Parse multiple resume formats with unpdf

### 💼 **Job Board & Applications**
- Browse and filter open positions
- Detailed job descriptions with requirements
- One-click applications with resume attachment
- Application status tracking and progress monitoring

### 📋 **Scenario-Based MCQs**
- Real-world workplace scenarios with multiple-choice responses
- Categories: Workplace Ethics, Team Dynamics, Client Relations, Priority Management
- AI-generated diverse question bank using Groq LLM
- Immediate feedback with detailed explanations

### 💻 **Coding Sandbox**
- Full-featured IDE powered by **Monaco Editor** (VS Code's engine)
- **Real code execution** using [Piston API](https://github.com/engineer-man/piston)
- **50+ programming languages** supported: JavaScript, Python, Java, C++, TypeScript, Go, Rust, and more
- AI-generated coding problems with visible and hidden test cases
- Performance metrics: execution time, memory usage, and complexity analysis

### ✍️ **Text-Based Responses**
- Open-ended questions for written communication evaluation
- AI-powered analysis scoring:
  - Communication clarity
  - Logical reasoning
  - Relevance to question
  - Professional tone
- Timed responses with live progress tracking

### 📊 **Psychometric Profiling**
- Big Five personality assessment (OCEAN model)
- Quantitative slider-based self-assessment
- Dimensions measured:
  - Openness to Experience
  - Conscientiousness
  - Extraversion
  - Agreeableness
  - Emotional Stability
- Leadership style and problem-solving approach mapping

### 📈 **Results Dashboard**
- Comprehensive job-readiness score
- Score breakdown by assessment type
- Personality radar chart visualization
- Proctoring integrity summary
- AI-generated improvement recommendations

---

## 🔒 Advanced Proctoring System

HIRENEX features an enterprise-grade proctoring solution using **MediaPipe** and **TensorFlow.js** for real-time monitoring.

### Face Detection (MediaPipe BlazeFace)
| Detection Type | Severity | Description |
|----------------|----------|-------------|
| `NO_FACE` | Medium | Face not detected in frame |
| `MULTI_FACE` | Critical | Multiple faces detected (auto-flag) |
| `FACE_LOST` | Medium | Face disappeared after detection |
| `LOOKING_AWAY` | Medium | Gaze directed away from screen |
| `RAPID_MOVEMENT` | Low | Suspicious head movements |

### Hand Tracking (MediaPipe Hands)
| Detection Type | Severity | Description |
|----------------|----------|-------------|
| `HAND_DETECTED` | Low | Hands visible in frame |
| `HAND_COVERING_FACE` | High | Hands obstructing face |
| `PHONE_GESTURE` | Critical | Phone holding gesture detected |

### Browser Monitoring
| Event Type | Severity | Description |
|------------|----------|-------------|
| `TAB_SWITCH` | High | Candidate switched browser tabs |
| `WINDOW_BLUR` | Medium | Browser window lost focus |
| `FULLSCREEN_EXIT` | Medium | Exited fullscreen mode |
| `COPY/PASTE/CUT` | Medium-High | Clipboard operations detected |
| `DEVTOOLS_ATTEMPT` | Critical | Developer tools access attempt |

### Integrity Scoring
- Real-time integrity score calculation (0-100)
- Configurable deduction weights per violation
- Automatic disqualification threshold for critical violations
- Complete event log with timestamps for HR review

---

## 🎓 Assessment Engine

### Assessment Flow
```
1. Job Application → 2. Resume Upload → 3. AI Analysis → 4. Assessment Link
                                                              ↓
5. Identity Verification → 6. Proctoring Setup → 7. Multi-Stage Assessment
                                                              ↓
8. Technical MCQs → 9. Coding Challenge → 10. Text Responses → 11. Psychometric
                                                              ↓
12. AI Scoring → 13. Results Dashboard → 14. HR Review
```

### Question Generation
- Dynamic AI generation based on job requirements
- Difficulty scaling based on candidate performance
- Domain-specific question banks (Tech, Finance, Healthcare, etc.)
- Anti-repetition mechanisms for retakes

---

## 🛠️ Tech Stack

### Core Framework
| Category | Technology | Version |
|----------|------------|---------|
| **Framework** | Next.js (App Router) | 16.1 |
| **Language** | TypeScript | 5.0 |
| **UI Library** | React | 19.2 |
| **Database** | Supabase (PostgreSQL) | Latest |
| **Authentication** | Supabase Auth | SSR |

### AI & Machine Learning
| Service | Purpose |
|---------|---------|
| **Groq API** | LLM for question generation, resume analysis, scoring |
| **MediaPipe Tasks Vision** | Real-time face detection (BlazeFace) |
| **TensorFlow.js** | Hand pose detection and tracking |
| **face-api.js** | Fallback face detection |

### Frontend & UI
| Technology | Purpose |
|------------|---------|
| **Tailwind CSS 4** | Utility-first styling |
| **Framer Motion** | Animations and transitions |
| **GSAP** | Advanced animations |
| **Radix UI** | Accessible component primitives |
| **Lucide React** | Icon system |
| **Recharts** | Data visualization |

### Developer Tools
| Technology | Purpose |
|------------|---------|
| **Monaco Editor** | In-browser code editor (VS Code engine) |
| **Piston API** | Sandboxed code execution (50+ languages) |
| **TanStack Query** | Server state management |
| **Zustand** | Client state management |
| **Zod** | Runtime type validation |
| **RecordRTC** | Video/audio recording |

---

## 🛠️ Installation

### Prerequisites
- **Node.js** 18+ (LTS recommended)
- **npm**, **yarn**, **pnpm**, or **bun**
- **Supabase** account (free tier available)
- **Groq** API key (free tier available)

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/magi8101/candidate-portal.git
cd candidate-portal

# 2. Install dependencies
npm install
# or: yarn install / pnpm install / bun install

# 3. Set up environment variables
cp .env.example .env.local

# 4. Configure your .env.local (see Environment Variables section)

# 5. Run the development server
npm run dev

# 6. Open http://localhost:3000
```

### Build for Production

```bash
# Build the application
npm run build

# Start production server
npm run start
```

---

## 🔐 Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Groq AI (Required)
GROQ_API_KEY=gsk_your-groq-api-key

# Tavily Search (Optional - for industry insights)
TAVILY_API_KEY=tvly-your-tavily-key

# Cloudinary (Optional - for media storage)
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
```

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anonymous/public key |
| `GROQ_API_KEY` | ✅ | Groq API key for AI features |
| `TAVILY_API_KEY` | ❌ | Web search for job market data |
| `CLOUDINARY_URL` | ❌ | Media upload and storage |

---

## 🗄️ Database Setup

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the database to provision

### 2. Run Migrations
Execute the SQL files in `supabase/migrations/` in order:
```sql
-- Run schema.sql first
-- Then run migrations in numerical order (002_, 003_, etc.)
```

### 3. Key Database Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles and personal information |
| `jobs` | Job listings with requirements |
| `applications` | Job applications with status tracking |
| `assessment_sessions` | Unified assessment tracking |
| `proctoring_events` | Proctoring violations and logs |
| `scenario_mcq_responses` | MCQ answers and scores |
| `coding_submissions` | Code submissions and results |
| `text_responses` | Written response evaluations |
| `psychometric_profiles` | Personality assessment scores |
| `hiring_decisions` | AI-generated hiring recommendations |

---

## 🚀 API Endpoints

### Assessment APIs
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/assessment/generate` | POST | Generate assessment questions for job |
| `/api/assessment/submit` | POST | Submit and score assessment |
| `/api/job-assessment/generate` | POST | Generate job-specific assessment |

### Coding Challenge APIs
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/challenges/generate` | POST | Generate AI coding problem |
| `/api/challenges/bulk-generate` | POST | Generate multiple challenges |
| `/api/challenges/run` | POST | Execute code against test cases |
| `/api/challenges/verify` | POST | AI verification of solution |

### Resume & Matching APIs
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/resume/analyze` | POST | AI resume analysis |
| `/api/resume/parse` | POST | Extract text from resume |
| `/api/resume/upload` | POST | Upload resume file |
| `/api/matching/route` | POST | Job-candidate matching score |

### Proctoring APIs
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/proctoring/events` | POST | Log proctoring event |
| `/api/proctoring/summary` | GET | Get proctoring summary |
| `/api/proctoring/upload` | POST | Upload proctoring media |

### Scoring APIs
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/scoring/calculate` | POST | Calculate overall score |
| `/api/scoring/technical` | POST | Score technical assessment |
| `/api/scoring/psychometric` | POST | Score psychometric profile |
| `/api/decision/route` | POST | Generate hiring decision |

---

## 📁 Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/login/             # Authentication pages
│   ├── (dashboard)/              # Dashboard layout
│   ├── assessment/[token]/       # Assessment flow
│   │   ├── check/                # Pre-assessment check
│   │   ├── instructions/         # Assessment instructions
│   │   ├── verify/               # Identity verification
│   │   ├── review/               # Review before submit
│   │   └── complete/             # Completion page
│   ├── candidate/                # Candidate portal
│   │   ├── dashboard/            # Candidate dashboard
│   │   ├── profile/              # Profile management
│   │   ├── onboarding/           # New user onboarding
│   │   └── resume/               # Resume upload
│   ├── challenges/[id]/          # Coding challenges
│   ├── jobs/[id]/                # Job details & application
│   ├── psychometric/             # Psychometric assessment
│   ├── technical/                # Technical assessment
│   ├── results/                  # Results dashboard
│   └── api/                      # API routes
│
├── components/
│   ├── assessment/               # Assessment UI components
│   │   ├── scenario-mcq.tsx      # MCQ component
│   │   ├── slider-question.tsx   # Psychometric sliders
│   │   └── text-response.tsx     # Text response input
│   ├── coding/
│   │   └── code-editor.tsx       # Monaco editor wrapper
│   ├── proctoring/
│   │   └── proctor-monitor.tsx   # Proctoring component
│   ├── ui/                       # Radix UI components
│   ├── layout/                   # Header, navigation
│   ├── effects/                  # Animation components
│   └── providers/                # Context providers
│
├── lib/
│   ├── supabase/                 # Supabase client (client/server/middleware)
│   ├── groq/                     # Groq AI client
│   ├── piston/                   # Code execution client
│   ├── proctoring/               # Proctoring services
│   │   ├── face-detection-service.ts
│   │   ├── hand-detection-service.ts
│   │   └── recording-service.ts
│   ├── scoring/                  # Scoring algorithms
│   └── execution/                # Browser code execution
│
├── stores/                       # Zustand stores
├── hooks/                        # Custom React hooks
└── types/                        # TypeScript definitions
```

---

## 🚀 Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel Dashboard
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 🔧 Configuration

### Proctoring Settings
Edit threshold values in `src/components/proctoring/proctor-monitor.tsx`:
```typescript
const DETECTION_INTERVAL_MS = 100;      // Detection frequency
const NO_FACE_THRESHOLD_MS = 3000;      // Grace period for no face
const LOOKING_AWAY_THRESHOLD_MS = 2000; // Grace period for looking away
```

### Scoring Weights
Edit deduction values in the `EVENT_CONFIG` object for custom integrity scoring.

---

## 📄 License

MIT License - feel free to use for learning, development, and production.

---

<div align="center">

### Built with ❤️ by HIRENEX Team

**Next.js** • **Supabase** • **Groq AI** • **MediaPipe** • **TensorFlow.js**

---

[⬆ Back to Top](#-hirenex---candidate-portal)

</div>
