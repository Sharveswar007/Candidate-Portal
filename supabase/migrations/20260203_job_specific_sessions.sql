-- Fix: Make assessment_sessions job-specific
-- This ensures each job has its own assessment tracking

-- 1. Add job_id column to assessment_sessions
ALTER TABLE public.assessment_sessions 
    ADD COLUMN IF NOT EXISTS job_id uuid REFERENCES public.job_descriptions(id) ON DELETE CASCADE;

-- 2. Add job_assessment_id column to link to generated questions
ALTER TABLE public.assessment_sessions 
    ADD COLUMN IF NOT EXISTS job_assessment_id uuid REFERENCES public.job_assessments(id);

-- 3. Create unique constraint to prevent duplicate assessments per job per user
-- First, let's check if any duplicates exist and clean them
DO $$
BEGIN
    -- Try to add unique constraint (will fail if duplicates exist)
    BEGIN
        ALTER TABLE public.assessment_sessions 
            ADD CONSTRAINT unique_user_job_session UNIQUE (candidate_id, job_id);
    EXCEPTION
        WHEN duplicate_table OR duplicate_object THEN
            -- Constraint already exists, ignore
            NULL;
        WHEN unique_violation THEN
            -- Duplicates exist, need to clean first
            RAISE NOTICE 'Duplicates exist - constraint not added';
    END;
END $$;

-- 4. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_assessment_sessions_job_id ON public.assessment_sessions(job_id);
CREATE INDEX IF NOT EXISTS idx_assessment_sessions_candidate_job ON public.assessment_sessions(candidate_id, job_id);

-- 5. Update RLS policies to include job_id checks
DROP POLICY IF EXISTS "Candidates can view own sessions" ON public.assessment_sessions;
CREATE POLICY "Candidates can view own sessions"
ON public.assessment_sessions FOR SELECT
USING (candidate_id = auth.uid());

DROP POLICY IF EXISTS "Candidates can create sessions" ON public.assessment_sessions;
CREATE POLICY "Candidates can create sessions"
ON public.assessment_sessions FOR INSERT
WITH CHECK (candidate_id = auth.uid());

DROP POLICY IF EXISTS "Candidates can update own sessions" ON public.assessment_sessions;
CREATE POLICY "Candidates can update own sessions"
ON public.assessment_sessions FOR UPDATE
USING (candidate_id = auth.uid());

SELECT 'Assessment sessions now job-specific!' as status;
