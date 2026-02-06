-- =====================================================
-- HIRENEX - Proctoring Storage Migration
-- Creates Supabase Storage buckets and proctoring_media table
-- Run in Supabase SQL Editor
-- =====================================================

-- Create storage buckets for proctoring media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('proctoring-recordings', 'proctoring-recordings', false, 104857600, ARRAY['video/webm', 'video/mp4', 'video/mpeg']),
  ('proctoring-screenshots', 'proctoring-screenshots', false, 10485760, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop and recreate storage policies
DROP POLICY IF EXISTS "Candidates can upload own recordings" ON storage.objects;
DROP POLICY IF EXISTS "HR can view all recordings" ON storage.objects;
DROP POLICY IF EXISTS "Candidates can view own recordings" ON storage.objects;
DROP POLICY IF EXISTS "Candidates can upload own screenshots" ON storage.objects;
DROP POLICY IF EXISTS "HR can view all screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Candidates can view own screenshots" ON storage.objects;

-- RLS policies for proctoring-recordings bucket
CREATE POLICY "Candidates can upload own recordings"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'proctoring-recordings' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "HR can view all recordings"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'proctoring-recordings'
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('recruiter', 'admin')
  )
);

CREATE POLICY "Candidates can view own recordings"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'proctoring-recordings'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS policies for proctoring-screenshots bucket
CREATE POLICY "Candidates can upload own screenshots"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'proctoring-screenshots' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "HR can view all screenshots"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'proctoring-screenshots'
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('recruiter', 'admin')
  )
);

CREATE POLICY "Candidates can view own screenshots"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'proctoring-screenshots'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Create proctoring_media table to track all uploaded recordings and screenshots
CREATE TABLE IF NOT EXISTS public.proctoring_media (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    candidate_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    attempt_id text NOT NULL,
    session_id text,
    media_type text NOT NULL, -- 'video', 'chunk', 'screenshot'
    bucket text NOT NULL, -- 'proctoring-recordings' or 'proctoring-screenshots'
    file_path text NOT NULL,
    event_type text, -- For screenshots: the violation type
    duration_seconds integer, -- For videos
    file_size_bytes bigint,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_proctoring_media_candidate ON public.proctoring_media(candidate_id);
CREATE INDEX IF NOT EXISTS idx_proctoring_media_attempt ON public.proctoring_media(attempt_id);
CREATE INDEX IF NOT EXISTS idx_proctoring_media_type ON public.proctoring_media(media_type);

-- Enable RLS
ALTER TABLE public.proctoring_media ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Candidates can insert own media" ON public.proctoring_media;
CREATE POLICY "Candidates can insert own media"
ON public.proctoring_media FOR INSERT
TO authenticated
WITH CHECK (candidate_id = auth.uid());

DROP POLICY IF EXISTS "Candidates can view own media" ON public.proctoring_media;
CREATE POLICY "Candidates can view own media"
ON public.proctoring_media FOR SELECT
TO authenticated
USING (candidate_id = auth.uid());

DROP POLICY IF EXISTS "HR can view all media" ON public.proctoring_media;
CREATE POLICY "HR can view all media"
ON public.proctoring_media FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('recruiter', 'admin')
    )
);

-- Add screenshot_path column to proctoring_events if not exists
ALTER TABLE public.proctoring_events ADD COLUMN IF NOT EXISTS screenshot_path text;

-- Confirm success
SELECT 'Proctoring storage migration complete' as status;
