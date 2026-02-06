-- Run this in Supabase SQL Editor to fix RLS on question tables
-- These tables contain assessment questions that should be readable by all authenticated users

-- Disable RLS (simplest approach for read-only public data)
ALTER TABLE public.mcq_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.coding_challenges DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.text_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.psychometric_questions DISABLE ROW LEVEL SECURITY;

-- OR if you want to keep RLS enabled, use these policies instead:
-- (Uncomment and run if you prefer RLS enabled)

/*
-- MCQ Questions
DROP POLICY IF EXISTS "Allow read for all" ON public.mcq_questions;
CREATE POLICY "Allow read for all" ON public.mcq_questions FOR SELECT USING (true);

-- Coding Challenges
DROP POLICY IF EXISTS "Allow read for all" ON public.coding_challenges;
CREATE POLICY "Allow read for all" ON public.coding_challenges FOR SELECT USING (true);

-- Text Questions
DROP POLICY IF EXISTS "Allow read for all" ON public.text_questions;
CREATE POLICY "Allow read for all" ON public.text_questions FOR SELECT USING (true);

-- Psychometric Questions
DROP POLICY IF EXISTS "Allow read for all" ON public.psychometric_questions;
CREATE POLICY "Allow read for all" ON public.psychometric_questions FOR SELECT USING (true);
*/
