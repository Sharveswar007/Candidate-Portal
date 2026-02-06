-- =====================================================
-- TalentPulse - Stage-2 Gatekeeper Schema Migration
-- Resume-JD Matching & Shortlisting Tables
-- =====================================================

-- =====================================================
-- ENHANCED JOB DESCRIPTIONS (parsed fields)
-- =====================================================

-- Add parsed fields to existing job_descriptions table
ALTER TABLE public.job_descriptions
ADD COLUMN IF NOT EXISTS parsed_requirements jsonb,
ADD COLUMN IF NOT EXISTS required_skills jsonb,
ADD COLUMN IF NOT EXISTS nice_to_have_skills jsonb,
ADD COLUMN IF NOT EXISTS min_experience_years integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_experience_years integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS education_requirements jsonb,
ADD COLUMN IF NOT EXISTS certifications_preferred jsonb,
ADD COLUMN IF NOT EXISTS role_keywords jsonb,
ADD COLUMN IF NOT EXISTS tech_stack jsonb,
ADD COLUMN IF NOT EXISTS seniority_level text CHECK (seniority_level IN ('intern', 'junior', 'mid', 'senior', 'lead', 'manager', 'director', 'executive')),
ADD COLUMN IF NOT EXISTS remote_policy text CHECK (remote_policy IN ('remote', 'hybrid', 'onsite', 'flexible')),
ADD COLUMN IF NOT EXISTS matching_weights jsonb DEFAULT '{"skill_match": 0.50, "experience_match": 0.25, "education_match": 0.10, "keyword_overlap": 0.10, "certification_bonus": 0.05}';

-- =====================================================
-- ENHANCED RESUME ANALYSES (parsed fields)
-- =====================================================

-- Add structured parsed fields to resume_analyses
ALTER TABLE public.resume_analyses
ADD COLUMN IF NOT EXISTS candidate_name text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS location text,
ADD COLUMN IF NOT EXISTS linkedin_url text,
ADD COLUMN IF NOT EXISTS github_url text,
ADD COLUMN IF NOT EXISTS summary text,
ADD COLUMN IF NOT EXISTS skills_technical jsonb,
ADD COLUMN IF NOT EXISTS skills_soft jsonb,
ADD COLUMN IF NOT EXISTS skills_tools jsonb,
ADD COLUMN IF NOT EXISTS job_title text,
ADD COLUMN IF NOT EXISTS current_company text,
ADD COLUMN IF NOT EXISTS seniority_level text,
ADD COLUMN IF NOT EXISTS primary_domain text,
ADD COLUMN IF NOT EXISTS projects jsonb,
ADD COLUMN IF NOT EXISTS certifications jsonb;

-- =====================================================
-- RESUME-JD MATCH RESULTS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.resume_job_matches (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_id uuid REFERENCES public.job_descriptions(id) ON DELETE CASCADE NOT NULL,
  resume_id uuid REFERENCES public.resume_analyses(id) ON DELETE SET NULL,
  
  -- Core Match Results
  match_score numeric NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
  match_category text NOT NULL CHECK (match_category IN ('high_match', 'potential', 'reject')),
  
  -- Explainability (Critical for no-blackbox requirement)
  matched_skills jsonb NOT NULL DEFAULT '[]',
  missing_skills jsonb NOT NULL DEFAULT '[]',
  matched_nice_to_have jsonb DEFAULT '[]',
  matched_keywords jsonb DEFAULT '[]',
  matched_certifications jsonb DEFAULT '[]',
  
  -- Score Breakdown
  score_breakdown jsonb NOT NULL,
  /*
  {
    "skill_match": {"score": 80, "weight": 0.5, "weighted": 40},
    "experience_match": {"score": 100, "weight": 0.25, "weighted": 25},
    "education_match": {"score": 70, "weight": 0.1, "weighted": 7},
    "keyword_overlap": {"score": 60, "weight": 0.1, "weighted": 6},
    "certification_bonus": {"score": 50, "weight": 0.05, "weighted": 2.5}
  }
  */
  
  -- Full Explainability Data
  explainability jsonb,
  
  -- Weights used (for audit)
  weights_used jsonb DEFAULT '{"skill_match": 0.50, "experience_match": 0.25, "education_match": 0.10, "keyword_overlap": 0.10, "certification_bonus": 0.05}',
  
  -- Recruiter Actions
  recruiter_reviewed boolean DEFAULT false,
  recruiter_decision text CHECK (recruiter_decision IN ('approve', 'reject', 'hold', 'pending')),
  recruiter_notes text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamp with time zone,
  
  -- Gate Decision
  proceed_to_assessment boolean DEFAULT false,
  assessment_invited_at timestamp with time zone,
  
  -- Timestamps
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone,
  
  -- Unique constraint: one match per candidate-job pair
  UNIQUE(candidate_id, job_id)
);

ALTER TABLE public.resume_job_matches ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- MATCHING CONFIGURATION (Recruiter-tunable)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.matching_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id uuid REFERENCES public.job_descriptions(id) ON DELETE CASCADE,
  recruiter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Global or job-specific weights
  is_global boolean DEFAULT false,
  
  -- Tunable Weights (must sum to 1.0)
  skill_match_weight numeric DEFAULT 0.50 CHECK (skill_match_weight >= 0 AND skill_match_weight <= 1),
  experience_match_weight numeric DEFAULT 0.25 CHECK (experience_match_weight >= 0 AND experience_match_weight <= 1),
  education_match_weight numeric DEFAULT 0.10 CHECK (education_match_weight >= 0 AND education_match_weight <= 1),
  keyword_overlap_weight numeric DEFAULT 0.10 CHECK (keyword_overlap_weight >= 0 AND keyword_overlap_weight <= 1),
  certification_bonus_weight numeric DEFAULT 0.05 CHECK (certification_bonus_weight >= 0 AND certification_bonus_weight <= 1),
  
  -- Thresholds
  high_match_threshold integer DEFAULT 70 CHECK (high_match_threshold >= 0 AND high_match_threshold <= 100),
  potential_threshold integer DEFAULT 45 CHECK (potential_threshold >= 0 AND potential_threshold <= 100),
  
  -- Auto-actions
  auto_invite_high_match boolean DEFAULT false,
  auto_reject_below_threshold boolean DEFAULT false,
  
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone
);

ALTER TABLE public.matching_config ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SHORTLIST BATCHES (for bulk processing)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.shortlist_batches (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id uuid REFERENCES public.job_descriptions(id) ON DELETE CASCADE NOT NULL,
  recruiter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  batch_name text,
  total_candidates integer DEFAULT 0,
  high_match_count integer DEFAULT 0,
  potential_count integer DEFAULT 0,
  rejected_count integer DEFAULT 0,
  
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  completed_at timestamp with time zone
);

ALTER TABLE public.shortlist_batches ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Resume-Job Matches
CREATE POLICY "Candidates view own matches" 
ON public.resume_job_matches FOR SELECT 
USING (auth.uid() = candidate_id);

CREATE POLICY "Candidates create own matches" 
ON public.resume_job_matches FOR INSERT 
WITH CHECK (auth.uid() = candidate_id);

CREATE POLICY "Recruiters view job matches" 
ON public.resume_job_matches FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.job_descriptions 
    WHERE id = job_id AND recruiter_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('recruiter', 'admin')
  )
);

CREATE POLICY "Recruiters update matches" 
ON public.resume_job_matches FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('recruiter', 'admin')
  )
);

-- Matching Config
CREATE POLICY "Recruiters manage config" 
ON public.matching_config FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('recruiter', 'admin')
  )
);

-- Shortlist Batches
CREATE POLICY "Recruiters manage batches" 
ON public.shortlist_batches FOR ALL 
USING (
  auth.uid() = recruiter_id OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_resume_job_matches_candidate ON public.resume_job_matches(candidate_id);
CREATE INDEX IF NOT EXISTS idx_resume_job_matches_job ON public.resume_job_matches(job_id);
CREATE INDEX IF NOT EXISTS idx_resume_job_matches_category ON public.resume_job_matches(match_category);
CREATE INDEX IF NOT EXISTS idx_resume_job_matches_score ON public.resume_job_matches(match_score DESC);
CREATE INDEX IF NOT EXISTS idx_resume_job_matches_proceed ON public.resume_job_matches(proceed_to_assessment) WHERE proceed_to_assessment = true;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get match statistics for a job
CREATE OR REPLACE FUNCTION get_job_match_stats(p_job_id uuid)
RETURNS TABLE (
  total_applicants bigint,
  high_match_count bigint,
  potential_count bigint,
  rejected_count bigint,
  avg_score numeric,
  invited_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total_applicants,
    COUNT(*) FILTER (WHERE match_category = 'high_match')::bigint as high_match_count,
    COUNT(*) FILTER (WHERE match_category = 'potential')::bigint as potential_count,
    COUNT(*) FILTER (WHERE match_category = 'reject')::bigint as rejected_count,
    ROUND(AVG(match_score), 1) as avg_score,
    COUNT(*) FILTER (WHERE proceed_to_assessment = true)::bigint as invited_count
  FROM public.resume_job_matches
  WHERE job_id = p_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
