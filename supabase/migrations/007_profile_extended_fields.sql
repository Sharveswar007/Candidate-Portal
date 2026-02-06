-- =====================================================
-- TalentPulse - Extended Profile Fields Migration
-- Run this in Supabase SQL Editor
-- =====================================================

-- Add extended profile fields to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_education text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS college text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS personal_email text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_birth text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS father_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mother_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS father_email text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mother_email text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS father_phone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mother_phone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS faculty_advisor_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS faculty_advisor_email text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tenth_marks text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS twelfth_marks text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_complete boolean DEFAULT false;

-- Confirm success
SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles';
