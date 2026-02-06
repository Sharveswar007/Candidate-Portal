-- Add detailed resume analysis columns to applications table
ALTER TABLE applications ADD COLUMN IF NOT EXISTS resume_summary TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS resume_strengths TEXT[];
ALTER TABLE applications ADD COLUMN IF NOT EXISTS resume_weaknesses TEXT[];
ALTER TABLE applications ADD COLUMN IF NOT EXISTS resume_skills TEXT[];
ALTER TABLE applications ADD COLUMN IF NOT EXISTS resume_experience_years INTEGER;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS resume_education TEXT;

-- Add strengths/weaknesses to assessment_sessions if not exists
ALTER TABLE assessment_sessions ADD COLUMN IF NOT EXISTS strengths TEXT[];
ALTER TABLE assessment_sessions ADD COLUMN IF NOT EXISTS weaknesses TEXT[];

-- Verify columns
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'applications' 
AND column_name IN ('resume_summary', 'resume_strengths', 'resume_weaknesses', 'resume_skills');
