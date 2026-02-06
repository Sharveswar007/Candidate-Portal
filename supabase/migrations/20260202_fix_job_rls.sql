-- Fix: Allow recruiters to SELECT their own jobs regardless of status
-- This is needed because the current RLS only allows SELECT for active jobs

-- Drop existing policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Recruiters can view own jobs" ON public.job_descriptions;

-- Create policy to allow recruiters to see all their jobs
CREATE POLICY "Recruiters can view own jobs"
ON public.job_descriptions
FOR SELECT
USING (auth.uid() = recruiter_id);

-- Verify policies
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'job_descriptions';
