-- Fix hiring_decisions table - add missing columns

-- Add ai_generated column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'hiring_decisions' AND column_name = 'ai_generated'
    ) THEN
        ALTER TABLE public.hiring_decisions ADD COLUMN ai_generated boolean DEFAULT true;
    END IF;
END $$;

-- Add recruiter_override column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'hiring_decisions' AND column_name = 'recruiter_override'
    ) THEN
        ALTER TABLE public.hiring_decisions ADD COLUMN recruiter_override boolean DEFAULT false;
    END IF;
END $$;

-- Add communication_score if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'hiring_decisions' AND column_name = 'communication_score'
    ) THEN
        ALTER TABLE public.hiring_decisions ADD COLUMN communication_score numeric;
    END IF;
END $$;

-- Add culture_fit_score if missing  
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'hiring_decisions' AND column_name = 'culture_fit_score'
    ) THEN
        ALTER TABLE public.hiring_decisions ADD COLUMN culture_fit_score numeric;
    END IF;
END $$;

-- Add competency_summary if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'hiring_decisions' AND column_name = 'competency_summary'
    ) THEN
        ALTER TABLE public.hiring_decisions ADD COLUMN competency_summary text;
    END IF;
END $$;

-- Add role_fit if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'hiring_decisions' AND column_name = 'role_fit'
    ) THEN
        ALTER TABLE public.hiring_decisions ADD COLUMN role_fit text;
    END IF;
END $$;

-- Add override_reason if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'hiring_decisions' AND column_name = 'override_reason'
    ) THEN
        ALTER TABLE public.hiring_decisions ADD COLUMN override_reason text;
    END IF;
END $$;
