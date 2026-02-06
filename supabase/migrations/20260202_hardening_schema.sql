-- System Hardening: Mandate completion of profiles and strict job config

-- 1. EXPAND PROFILES TABLE
-- Shared fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone_number text,
ADD COLUMN IF NOT EXISTS onboarding_complete boolean DEFAULT false;

-- Candidate specific fields
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS date_of_birth date,
ADD COLUMN IF NOT EXISTS gender text,
ADD COLUMN IF NOT EXISTS current_city text,
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS institute_name text, -- college/university
ADD COLUMN IF NOT EXISTS education_major text, -- department/major
ADD COLUMN IF NOT EXISTS graduation_year text,
ADD COLUMN IF NOT EXISTS employment_status text, -- student/working/unemployed
ADD COLUMN IF NOT EXISTS preferred_role text,
ADD COLUMN IF NOT EXISTS preferred_work_type text, -- internship/full-time
ADD COLUMN IF NOT EXISTS skills_primary jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS skills_secondary jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS resume_url text,
ADD COLUMN IF NOT EXISTS years_experience double precision DEFAULT 0,
ADD COLUMN IF NOT EXISTS consents jsonb DEFAULT '{}'::jsonb; -- {webcam: bool, data_processing: bool}

-- HR specific fields
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS company_name text,
ADD COLUMN IF NOT EXISTS company_domain text,
ADD COLUMN IF NOT EXISTS designation text,
ADD COLUMN IF NOT EXISTS company_website text,
ADD COLUMN IF NOT EXISTS company_size text,
ADD COLUMN IF NOT EXISTS is_authorized_recruiter boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS official_id text;

-- 2. EXPAND JOBS TABLE
-- Basic Job Details
ALTER TABLE public.job_descriptions
ADD COLUMN IF NOT EXISTS work_mode text, -- onsite/remote/hybrid
ADD COLUMN IF NOT EXISTS employment_type text, -- intern/full-time/contract
ADD COLUMN IF NOT EXISTS seniority_level text,
ADD COLUMN IF NOT EXISTS experience_range text;

-- Structured Configuration Columns (JSONB for flexibility & strict validation in app)
ALTER TABLE public.job_descriptions
ADD COLUMN IF NOT EXISTS skills_config jsonb DEFAULT '{"required": [], "nice_to_have": []}'::jsonb,
ADD COLUMN IF NOT EXISTS role_focus text, -- backend/frontend/etc
ADD COLUMN IF NOT EXISTS weights_config jsonb DEFAULT '{"problem_solving": 25, "coding": 25, "system_design": 25, "communication": 25}'::jsonb,
ADD COLUMN IF NOT EXISTS psychometric_config jsonb DEFAULT '{"resilience": "high", "teamwork": "high"}'::jsonb,
ADD COLUMN IF NOT EXISTS cutoffs_config jsonb DEFAULT '{"technical": 60, "psychometric": 50, "integrity": 70}'::jsonb,
ADD COLUMN IF NOT EXISTS assessment_config jsonb DEFAULT '{"difficulty": "medium", "languages": ["javascript", "python"], "duration_m": 60, "webcam": true}'::jsonb;

-- 3. Create RLS Helper Indices
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding ON public.profiles(onboarding_complete);
