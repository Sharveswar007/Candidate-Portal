-- ============================================
-- Job-Specific Assessment Pipeline Schema
-- Created: 2026-02-03
-- ============================================

-- 1. Create job_assessments table to store generated assessments per job
CREATE TABLE IF NOT EXISTS public.job_assessments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id uuid REFERENCES public.job_descriptions(id) ON DELETE CASCADE,
    
    -- Assessment settings (copied from job config when created)
    difficulty text DEFAULT 'Medium',
    duration_minutes int DEFAULT 60,
    webcam_required boolean DEFAULT true,
    
    -- Generated questions (stored per job)
    mcq_questions jsonb DEFAULT '[]',
    coding_challenges jsonb DEFAULT '[]',
    psychometric_questions jsonb DEFAULT '[]',
    
    -- Generation status
    is_generated boolean DEFAULT false,
    generated_at timestamptz,
    
    -- Metadata
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    UNIQUE(job_id)
);

-- 2. Add pipeline stage columns to applications table
ALTER TABLE public.applications 
    ADD COLUMN IF NOT EXISTS resume_uploaded boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS resume_score int DEFAULT 0,
    ADD COLUMN IF NOT EXISTS skills_extracted jsonb DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS resume_analyzed_at timestamptz,
    
    ADD COLUMN IF NOT EXISTS eligibility_score int DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_eligible boolean,
    ADD COLUMN IF NOT EXISTS eligibility_checked_at timestamptz,
    
    ADD COLUMN IF NOT EXISTS job_assessment_id uuid,
    ADD COLUMN IF NOT EXISTS assessment_started_at timestamptz,
    ADD COLUMN IF NOT EXISTS assessment_completed_at timestamptz,
    ADD COLUMN IF NOT EXISTS mcq_score int,
    ADD COLUMN IF NOT EXISTS coding_score int,
    ADD COLUMN IF NOT EXISTS psychometric_score int,
    ADD COLUMN IF NOT EXISTS composite_score int,
    
    ADD COLUMN IF NOT EXISTS current_stage text DEFAULT 'resume',
    ADD COLUMN IF NOT EXISTS decision text DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS hr_notes text,
    ADD COLUMN IF NOT EXISTS decided_by uuid,
    ADD COLUMN IF NOT EXISTS decided_at timestamptz;

-- 3. Add foreign key constraint for job_assessment_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'applications_job_assessment_id_fkey'
    ) THEN
        ALTER TABLE public.applications 
        ADD CONSTRAINT applications_job_assessment_id_fkey 
        FOREIGN KEY (job_assessment_id) REFERENCES public.job_assessments(id);
    END IF;
END $$;

-- 4. Enable RLS on job_assessments
ALTER TABLE public.job_assessments ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for job_assessments
DROP POLICY IF EXISTS "Recruiters can manage their job assessments" ON public.job_assessments;
CREATE POLICY "Recruiters can manage their job assessments"
ON public.job_assessments FOR ALL
USING (
    job_id IN (SELECT id FROM public.job_descriptions WHERE recruiter_id = auth.uid())
);

DROP POLICY IF EXISTS "Candidates can view assessments for jobs they applied to" ON public.job_assessments;
CREATE POLICY "Candidates can view assessments for jobs they applied to"
ON public.job_assessments FOR SELECT
USING (
    job_id IN (SELECT job_id FROM public.applications WHERE candidate_id = auth.uid())
);

-- 6. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_job_assessments_job_id ON public.job_assessments(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_current_stage ON public.applications(current_stage);
CREATE INDEX IF NOT EXISTS idx_applications_job_assessment_id ON public.applications(job_assessment_id);

-- 7. Function to auto-create job_assessment when job is created
CREATE OR REPLACE FUNCTION create_job_assessment()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.job_assessments (
        job_id,
        difficulty,
        duration_minutes,
        webcam_required
    )
    VALUES (
        NEW.id,
        COALESCE((NEW.assessment_config->>'difficulty')::text, 'Medium'),
        COALESCE((NEW.assessment_config->>'duration_m')::int, 60),
        COALESCE((NEW.assessment_config->>'webcam')::boolean, true)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Trigger to auto-create job_assessment
DROP TRIGGER IF EXISTS trigger_create_job_assessment ON public.job_descriptions;
CREATE TRIGGER trigger_create_job_assessment
    AFTER INSERT ON public.job_descriptions
    FOR EACH ROW
    EXECUTE FUNCTION create_job_assessment();

-- Done!
SELECT 'Job-Specific Assessment Pipeline schema created successfully!' as status;
