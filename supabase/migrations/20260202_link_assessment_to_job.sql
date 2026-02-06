-- Add job_id to assessment_sessions to link assessments to specific job applications
ALTER TABLE public.assessment_sessions 
ADD COLUMN IF NOT EXISTS job_id uuid REFERENCES public.job_descriptions(id);

-- Add unique constraint to ensure a candidate can only have ONE assessment session per job
-- This enforces the "One Test Per Job" rule
ALTER TABLE public.assessment_sessions
ADD CONSTRAINT unique_user_job_assessment UNIQUE (user_id, job_id);

-- Create an index for faster lookups by job_id
CREATE INDEX IF NOT EXISTS idx_assessment_sessions_job_id ON public.assessment_sessions(job_id);
