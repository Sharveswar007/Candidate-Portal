<div align="center">

# ⚡ TalentPulse

### Multi-Modal Assessment Engine for Job Readiness

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS_4-06B6D4?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Groq](https://img.shields.io/badge/Groq-Llama_3.3-FF6B35?style=for-the-badge)](https://groq.com/)

*Comprehensive assessment platform featuring scenario-based MCQs, coding sandbox, text evaluations, and psychometric analysis - all powered by AI.*

[📖 Features](#-features) • [🛠️ Installation](#%EF%B8%8F-installation) • [🔑 API Keys](#-api-keys-required) • [📁 Project Structure](#-project-structure)

</div>

---

## 📋 Table of Contents

- [About](#-about)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Installation](#%EF%B8%8F-installation)
- [Environment Variables](#-environment-variables)
- [Database Setup](#-database-setup)
- [API Keys Required](#-api-keys-required)
- [Project Structure](#-project-structure)
- [API Endpoints](#-api-endpoints)
- [Key Features Deep Dive](#-key-features-deep-dive)
- [Deployment](#-deployment)

---

## 🎯 About

TalentPulse is a comprehensive multi-modal assessment engine designed to evaluate job readiness through various input types. The platform provides a versatile testing interface that supports multiple assessment methods to build a complete profile of a candidate's professional capabilities.

### Assessment Modalities

| Assessment Type | Description | Evaluation Method |
|-----------------|-------------|-------------------|
| Scenario-Based MCQs | Workplace situation questions | Decision-making & professional judgment |
| Coding Sandbox | Functional IDE with code execution | Real-time grading against test cases |
| Text Responses | Open-ended questions | AI analysis of communication & logic |
| Psychometric Sliders | Self-assessment scales | Personality profile & work style |

---

## ✨ Features

### 📋 **Scenario-Based MCQs**
- Real-world workplace scenarios with multiple-choice responses
- Evaluates professional judgment and decision-making
- Categories: Workplace Ethics, Team Dynamics, Client Relations, Priority Management
- Immediate feedback with explanations
- AI-generated diverse question bank

### 💻 **Coding Sandbox**
- Full-featured IDE with Monaco Editor (VS Code's editor)
- **Real code execution** using [Piston API](https://github.com/engineer-man/piston)
- Supports 50+ languages: JavaScript, Python, Java, C++, TypeScript, and more
- AI-generated coding problems with test cases
- Hidden test case verification
- Execution time and memory tracking

### ✍️ **Text-Based Responses**
- Open-ended questions for written communication evaluation
- AI-powered analysis of:
  - Communication clarity
  - Logical reasoning
  - Relevance to question
  - Professional tone
- Categories: Communication, Problem Solving, Leadership, Ethics, Adaptability
- Timed responses with progress tracking

### 📊 **Psychometric Mapping (Slider-Based)**
- Quantitative self-assessment inputs
- Builds comprehensive personality profile
- Dimensions measured:
  - Openness to Experience
  - Conscientiousness
  - Extraversion
  - Agreeableness
  - Emotional Stability
  - Leadership Style
  - Problem-Solving Approach
  - Adaptability

### 📈 **Comprehensive Results Dashboard**
- Overall job-readiness score
- Breakdown by assessment type
- Personality profile visualization
- Assessment history tracking
- Recommendations for improvement

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript 5.0 |
| **UI Library** | React 19 |
| **Styling** | Tailwind CSS 4, Framer Motion, GSAP |
| **Database** | Supabase (PostgreSQL) |
| **Authentication** | Supabase Auth (Email/Password) |
| **AI/LLM** | Groq API (Llama 3.3 70B) |
| **Code Execution** | Piston API |
| **Code Editor** | Monaco Editor |
| **State Management** | Zustand |
| **Data Fetching** | TanStack Query |
| **Icons** | Lucide React |
| **Components** | Radix UI primitives |

---

## 🛠️ Installation

### Prerequisites
- Node.js 18+ 
- npm, yarn, or pnpm
- Supabase account
- Groq API access

### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/talentpulse.git
   cd talentpulse
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```

4. **Configure your `.env.local`**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   GROQ_API_KEY=your_groq_api_key
   TAVILY_API_KEY=your_tavily_api_key
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open [http://localhost:3000](http://localhost:3000)**

---

## 🔐 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anonymous key |
| `GROQ_API_KEY` | ✅ | Groq API key for AI features |
| `TAVILY_API_KEY` | ❌ | Optional: For web search features |

---

## 🗄️ Database Setup

1. Create a new Supabase project
2. Run the SQL schema from `supabase/schema.sql`
3. Enable Row Level Security (RLS) policies
4. Configure email authentication in Supabase Auth settings

### Key Tables

- `profiles` - User information
- `assessment_sessions` - Unified assessment tracking
- `scenario_mcq_responses` - MCQ answers and scores
- `text_responses` - Written response evaluations
- `psychometric_responses` - Slider values per question
- `psychometric_profiles` - Aggregated personality scores
- `coding_challenges` - AI-generated coding problems
- `coding_submissions` - Code submissions and results

---

## 🔑 API Keys Required

### Groq API (Required)
- Sign up at [console.groq.com](https://console.groq.com)
- Create an API key
- Used for: AI question generation, response evaluation, code verification

### Supabase (Required)
- Create project at [supabase.com](https://supabase.com)
- Get URL and anon key from Project Settings > API
- Used for: Database, authentication, real-time features

### Tavily API (Optional)
- Sign up at [tavily.com](https://tavily.com)
- Used for: Industry trends and job market data

---

## 📁 Project Structure

```
src/
├── app/                      # Next.js App Router
│   ├── assessment/           # Multi-modal assessment page
│   ├── challenges/           # Coding sandbox
│   ├── psychometric/         # Slider-based assessment
│   ├── results/              # Assessment results dashboard
│   ├── (auth)/login/         # Email/password authentication
│   ├── (dashboard)/          # User dashboard
│   └── api/                  # API routes
├── components/
│   ├── assessment/           # Assessment components
│   │   ├── slider-question.tsx
│   │   ├── text-response.tsx
│   │   └── scenario-mcq.tsx
│   ├── ui/                   # Radix UI components
│   └── effects/              # Animation components
├── lib/
│   ├── supabase/             # Supabase client
│   ├── groq/                 # Groq AI client
│   ├── piston/               # Code execution client
│   └── execution/            # Browser-based execution
└── types/                    # TypeScript definitions
```

---

## 🚀 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/assessment/generate` | POST | Generate assessment questions |
| `/api/assessment/submit` | POST | Submit and score assessment |
| `/api/challenges/generate` | POST | Generate coding challenge |
| `/api/challenges/run` | POST | Execute code against test cases |
| `/api/challenges/verify` | POST | AI verification of solution |

---

## 📝 License

MIT License - feel free to use this project for learning and development.

---

<div align="center">

**Built with ❤️ using Next.js, Supabase, and Groq AI**

⚡ TalentPulse - Multi-Modal Assessment Engine

</div>
