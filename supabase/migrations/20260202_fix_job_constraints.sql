-- DATA CLEANUP MIGRATION for Job Descriptions
-- Goal: Standardize constraints to allow consistent lowercase values

-- 1. Drop existing constraints (if any) to remove conflicts
ALTER TABLE public.job_descriptions DROP CONSTRAINT IF EXISTS job_descriptions_employment_type_check;
ALTER TABLE public.job_descriptions DROP CONSTRAINT IF EXISTS job_descriptions_work_mode_check;
ALTER TABLE public.job_descriptions DROP CONSTRAINT IF EXISTS job_descriptions_seniority_level_check;
ALTER TABLE public.job_descriptions DROP CONSTRAINT IF EXISTS job_descriptions_remote_policy_check; -- old name if exists

-- 2. Add New Standardized Constraints (LOWERCASE)
ALTER TABLE public.job_descriptions 
ADD CONSTRAINT job_descriptions_employment_type_check 
CHECK (employment_type IN ('full-time', 'part-time', 'contract', 'internship', 'freelance', 'temporary'));

ALTER TABLE public.job_descriptions 
ADD CONSTRAINT job_descriptions_work_mode_check 
CHECK (work_mode IN ('remote', 'onsite', 'hybrid'));

ALTER TABLE public.job_descriptions 
ADD CONSTRAINT job_descriptions_seniority_level_check 
CHECK (seniority_level IN ('intern', 'junior', 'mid', 'senior', 'lead', 'manager', 'director', 'executive'));

-- 3. Verify changes
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.job_descriptions'::regclass;
