-- Migration: Disable RLS on tables for HR Portal access
-- Run this in Supabase SQL Editor

-- Disable RLS on profiles table
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Disable RLS on applications table  
ALTER TABLE public.applications DISABLE ROW LEVEL SECURITY;

-- Disable RLS on job_descriptions table
ALTER TABLE public.job_descriptions DISABLE ROW LEVEL SECURITY;

-- Disable RLS on assessment_sessions table
ALTER TABLE public.assessment_sessions DISABLE ROW LEVEL SECURITY;

-- Disable RLS on proctoring_events table
ALTER TABLE public.proctoring_events DISABLE ROW LEVEL SECURITY;

-- Disable RLS on coding_submissions table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'coding_submissions') THEN
        EXECUTE 'ALTER TABLE public.coding_submissions DISABLE ROW LEVEL SECURITY';
    END IF;
END $$;

-- Disable RLS on text_responses table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'text_responses') THEN
        EXECUTE 'ALTER TABLE public.text_responses DISABLE ROW LEVEL SECURITY';
    END IF;
END $$;

-- Disable RLS on psychometric_profiles table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'psychometric_profiles') THEN
        EXECUTE 'ALTER TABLE public.psychometric_profiles DISABLE ROW LEVEL SECURITY';
    END IF;
END $$;
