-- Migration: Domain Support + Proctoring Enhancements + Resume File URL
-- Date: 2026-02-05
-- Purpose: Multi-domain assessment support, proctoring screenshot storage, resume file storage

-- =====================================================
-- 1. DOMAIN SUPPORT FOR JOBS
-- =====================================================

-- Add domain column to job_descriptions
ALTER TABLE public.job_descriptions 
ADD COLUMN IF NOT EXISTS domain text 
CHECK (domain IN (
  'cs',           -- Computer Science / IT / Software
  'mechanical',   -- Mechanical Engineering
  'civil',        -- Civil Engineering
  'ece',          -- Electronics & Communication
  'eee',          -- Electrical Engineering
  'chemical',     -- Chemical Engineering
  'biotech',      -- Biotechnology / Biomedical
  'data',         -- Data / Analytics
  'manufacturing',-- Manufacturing / Industrial
  'management'    -- Management / HR / Business
));

-- Add domain to questions tables for domain-specific filtering
ALTER TABLE public.mcq_questions 
ADD COLUMN IF NOT EXISTS domain text 
CHECK (domain IN ('cs', 'mechanical', 'civil', 'ece', 'eee', 'chemical', 'biotech', 'data', 'manufacturing', 'management'));

ALTER TABLE public.text_questions 
ADD COLUMN IF NOT EXISTS domain text 
CHECK (domain IN ('cs', 'mechanical', 'civil', 'ece', 'eee', 'chemical', 'biotech', 'data', 'manufacturing', 'management'));

-- Set default domain for existing records
UPDATE public.job_descriptions SET domain = 'cs' WHERE domain IS NULL;
UPDATE public.mcq_questions SET domain = 'cs' WHERE domain IS NULL;
UPDATE public.text_questions SET domain = 'cs' WHERE domain IS NULL;

-- =====================================================
-- 2. RESUME FILE URL ON APPLICATIONS
-- =====================================================

-- Add resume_file_url to applications (actual uploaded file URL)
ALTER TABLE public.applications 
ADD COLUMN IF NOT EXISTS resume_file_url text;

-- =====================================================
-- 3. PROCTORING ENHANCEMENTS
-- =====================================================

-- Add screenshot_url to proctor_events (violation screenshots)
ALTER TABLE public.proctor_events 
ADD COLUMN IF NOT EXISTS screenshot_url text;

-- Add warning acknowledgement tracking
ALTER TABLE public.proctor_events 
ADD COLUMN IF NOT EXISTS warning_displayed boolean DEFAULT false;

ALTER TABLE public.proctor_events 
ADD COLUMN IF NOT EXISTS warning_acknowledged_at timestamp with time zone;

-- Create proctoring_summaries table for HR quick view
CREATE TABLE IF NOT EXISTS public.proctoring_summaries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid REFERENCES public.assessment_sessions(id) ON DELETE CASCADE,
  candidate_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  application_id uuid REFERENCES public.applications(id) ON DELETE SET NULL,
  
  -- Violation counts
  total_violations integer DEFAULT 0,
  critical_violations integer DEFAULT 0,
  high_violations integer DEFAULT 0,
  medium_violations integer DEFAULT 0,
  low_violations integer DEFAULT 0,
  
  -- Screenshot URLs for violations (array of {url, event_type, timestamp, severity})
  violation_screenshots jsonb DEFAULT '[]',
  
  -- Recording URLs (video chunks)
  recording_urls jsonb DEFAULT '[]',
  
  -- Final scores
  final_integrity_score integer DEFAULT 100,
  risk_level text CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  
  -- HR review
  hr_reviewed boolean DEFAULT false,
  hr_reviewed_at timestamp with time zone,
  hr_reviewed_by uuid REFERENCES auth.users(id),
  hr_notes text,
  hr_decision text CHECK (hr_decision IN ('approved', 'flagged', 'rejected')),
  
  -- Timestamps
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone
);

ALTER TABLE public.proctoring_summaries ENABLE ROW LEVEL SECURITY;

-- RLS policies for proctoring_summaries
CREATE POLICY "Candidates can view own proctoring summary"
ON public.proctoring_summaries FOR SELECT
USING (auth.uid() = candidate_id);

CREATE POLICY "Recruiters can view all proctoring summaries"
ON public.proctoring_summaries FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('recruiter', 'admin')
  )
);

CREATE POLICY "System can insert proctoring summaries"
ON public.proctoring_summaries FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update proctoring summaries"
ON public.proctoring_summaries FOR UPDATE
USING (true);

-- =====================================================
-- 4. INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_jobs_domain ON public.job_descriptions(domain);
CREATE INDEX IF NOT EXISTS idx_mcq_domain ON public.mcq_questions(domain);
CREATE INDEX IF NOT EXISTS idx_text_domain ON public.text_questions(domain);
CREATE INDEX IF NOT EXISTS idx_proctoring_summaries_session ON public.proctoring_summaries(session_id);
CREATE INDEX IF NOT EXISTS idx_proctoring_summaries_candidate ON public.proctoring_summaries(candidate_id);
CREATE INDEX IF NOT EXISTS idx_proctor_events_screenshot ON public.proctor_events(screenshot_url) WHERE screenshot_url IS NOT NULL;

-- =====================================================
-- 5. FUNCTION TO CREATE/UPDATE PROCTORING SUMMARY
-- =====================================================

CREATE OR REPLACE FUNCTION update_proctoring_summary()
RETURNS TRIGGER AS $$
DECLARE
  current_summary_id uuid;
  total_count integer;
  critical_count integer;
  high_count integer;
  medium_count integer;
  low_count integer;
  screenshots jsonb;
  current_integrity integer;
BEGIN
  -- Check if summary exists for this session
  SELECT id, final_integrity_score INTO current_summary_id, current_integrity
  FROM public.proctoring_summaries
  WHERE session_id = NEW.session_id;
  
  -- Count violations by severity
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE severity = 'critical'),
    COUNT(*) FILTER (WHERE severity = 'high'),
    COUNT(*) FILTER (WHERE severity = 'medium'),
    COUNT(*) FILTER (WHERE severity = 'low')
  INTO total_count, critical_count, high_count, medium_count, low_count
  FROM public.proctor_events
  WHERE session_id = NEW.session_id;
  
  -- Get screenshots
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'url', screenshot_url,
      'event_type', event_type,
      'timestamp', client_timestamp,
      'severity', severity
    )
  ), '[]'::jsonb)
  INTO screenshots
  FROM public.proctor_events
  WHERE session_id = NEW.session_id AND screenshot_url IS NOT NULL;
  
  -- Calculate integrity deduction
  current_integrity := 100 - (critical_count * 15) - (high_count * 5) - (medium_count * 3) - (low_count * 1);
  IF current_integrity < 0 THEN current_integrity := 0; END IF;
  
  IF current_summary_id IS NULL THEN
    -- Insert new summary
    INSERT INTO public.proctoring_summaries (
      session_id, candidate_id, total_violations, critical_violations, 
      high_violations, medium_violations, low_violations,
      violation_screenshots, final_integrity_score, risk_level
    ) VALUES (
      NEW.session_id, NEW.candidate_id, total_count, critical_count,
      high_count, medium_count, low_count, screenshots, current_integrity,
      CASE 
        WHEN critical_count > 0 THEN 'critical'
        WHEN high_count >= 3 THEN 'high'
        WHEN medium_count >= 5 THEN 'medium'
        ELSE 'low'
      END
    );
  ELSE
    -- Update existing summary
    UPDATE public.proctoring_summaries
    SET 
      total_violations = total_count,
      critical_violations = critical_count,
      high_violations = high_count,
      medium_violations = medium_count,
      low_violations = low_count,
      violation_screenshots = screenshots,
      final_integrity_score = current_integrity,
      risk_level = CASE 
        WHEN critical_count > 0 THEN 'critical'
        WHEN high_count >= 3 THEN 'high'
        WHEN medium_count >= 5 THEN 'medium'
        ELSE 'low'
      END,
      updated_at = now()
    WHERE id = current_summary_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update summary on new events
DROP TRIGGER IF EXISTS trigger_update_proctoring_summary ON public.proctor_events;
CREATE TRIGGER trigger_update_proctoring_summary
AFTER INSERT ON public.proctor_events
FOR EACH ROW
WHEN (NEW.session_id IS NOT NULL)
EXECUTE FUNCTION update_proctoring_summary();
