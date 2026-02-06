-- =====================================================
-- HIRENEX - Extended Profile Fields Migration
-- Adds comprehensive candidate profile fields
-- Run in Supabase SQL Editor
-- =====================================================

-- LinkedIn URL (from original gatekeeper schema - ensuring it exists)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linkedin_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS years_experience double precision DEFAULT 0;

-- Personal Information
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_city text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pincode text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nationality text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS languages jsonb DEFAULT '[]';

-- Education Details
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS institute_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS education_major text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS graduation_year text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cgpa text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS backlogs integer DEFAULT 0;

-- Professional Details
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS employment_status text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_role text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_work_type text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_company text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_designation text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notice_period text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS expected_salary text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_salary text;

-- Skills as arrays
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS skills_primary text[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS skills_secondary text[] DEFAULT '{}';

-- Social & Portfolio Links
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS github_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS portfolio_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS twitter_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS kaggle_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS leetcode_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hackerrank_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stackoverflow_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS medium_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS personal_website text;

-- Work Experience (stored as JSONB array)
-- Each entry: {company, role, start_date, end_date, description, location, is_current}
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS work_experience jsonb DEFAULT '[]';

-- Projects (stored as JSONB array)
-- Each entry: {title, description, technologies, url, github_url, start_date, end_date}
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS projects jsonb DEFAULT '[]';

-- Certifications (stored as JSONB array)
-- Each entry: {name, issuer, issue_date, expiry_date, credential_id, credential_url}
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS certifications jsonb DEFAULT '[]';

-- Publications & Achievements
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS publications jsonb DEFAULT '[]';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS achievements jsonb DEFAULT '[]';

-- Resume & Profile Summary
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS resume_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS summary text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS headline text;

-- LinkedIn Data (scraped or provided)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linkedin_scraped_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linkedin_data jsonb;

-- Profile completeness tracking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_completeness integer DEFAULT 0;

-- Add indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_profiles_employment_status ON public.profiles(employment_status);
CREATE INDEX IF NOT EXISTS idx_profiles_current_city ON public.profiles(current_city);
CREATE INDEX IF NOT EXISTS idx_profiles_skills_primary ON public.profiles USING gin(skills_primary);

-- Confirm success
SELECT 'Extended profile fields migration complete' as status;
