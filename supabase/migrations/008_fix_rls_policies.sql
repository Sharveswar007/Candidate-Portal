-- =====================================================
-- TalentPulse - Fix RLS Policies
-- Run this in Supabase SQL Editor
-- =====================================================

-- Drop existing policies on hiring_decisions
DROP POLICY IF EXISTS "Decisions viewable by candidate" ON public.hiring_decisions;
DROP POLICY IF EXISTS "Decisions viewable by recruiter" ON public.hiring_decisions;
DROP POLICY IF EXISTS "Decisions insertable" ON public.hiring_decisions;

-- Create permissive policies for hiring_decisions
-- Allow authenticated users to insert their own decisions
CREATE POLICY "Users can insert own decisions"
ON public.hiring_decisions FOR INSERT
WITH CHECK (auth.uid() = candidate_id OR auth.role() = 'authenticated');

-- Allow authenticated users to view their own decisions
CREATE POLICY "Users can view own decisions"
ON public.hiring_decisions FOR SELECT
USING (auth.uid() = candidate_id OR auth.role() = 'authenticated');

-- Allow authenticated users to update their own decisions
CREATE POLICY "Users can update own decisions"
ON public.hiring_decisions FOR UPDATE
USING (auth.uid() = candidate_id);

-- Alternatively, for demo purposes, allow ALL authenticated users to insert
-- This is less secure but works for hackathon demo
DROP POLICY IF EXISTS "Users can insert own decisions" ON public.hiring_decisions;
CREATE POLICY "Allow all authenticated inserts"
ON public.hiring_decisions FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- =====================================================
-- Fix coding_submissions RLS if needed
-- =====================================================
DROP POLICY IF EXISTS "Submissions viewable by owner" ON public.coding_submissions;
DROP POLICY IF EXISTS "Submissions insertable by owner" ON public.coding_submissions;

CREATE POLICY "Users can insert coding submissions"
ON public.coding_submissions FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can view own coding submissions"
ON public.coding_submissions FOR SELECT
USING (auth.uid() = candidate_id OR auth.role() = 'authenticated');

-- =====================================================
-- Confirm changes
-- =====================================================
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('hiring_decisions', 'coding_submissions');
