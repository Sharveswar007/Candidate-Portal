-- Migration: Update job_descriptions table for HR Portal v2
-- Added: company_name, criteria (for scoring thresholds)

ALTER TABLE public.job_descriptions 
ADD COLUMN IF NOT EXISTS company_name text,
ADD COLUMN IF NOT EXISTS criteria jsonb DEFAULT '{"technical": 70, "psychometric": 60, "integrity": 80}'::jsonb;

-- Extend status check if needed (already has draft/active/closed)
-- Ensure RLS allows recruiters to insert
CREATE POLICY "Recruiters can insert jobs" 
ON public.job_descriptions 
FOR INSERT 
WITH CHECK (auth.uid() = recruiter_id);

CREATE POLICY "Recruiters can update own jobs" 
ON public.job_descriptions 
FOR UPDATE 
USING (auth.uid() = recruiter_id);

CREATE POLICY "Recruiters can delete own jobs" 
ON public.job_descriptions 
FOR DELETE 
USING (auth.uid() = recruiter_id);

-- Everyone can view active jobs (for Candidates to apply)
CREATE POLICY "Public can view active jobs" 
ON public.job_descriptions 
FOR SELECT 
USING (status = 'active');
