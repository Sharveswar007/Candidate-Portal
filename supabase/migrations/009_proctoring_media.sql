-- =====================================================
-- TalentPulse - Proctoring Media Storage
-- Stores references to recorded videos and violation screenshots
-- =====================================================

-- =====================================================
-- PROCTORING MEDIA TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.proctoring_media (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  attempt_id uuid NOT NULL,
  session_id uuid REFERENCES public.assessment_sessions(id) ON DELETE SET NULL,
  
  -- Media Info
  media_type text NOT NULL CHECK (media_type IN ('video', 'chunk', 'screenshot')),
  bucket text NOT NULL,
  file_path text NOT NULL,
  
  -- For screenshots linked to violations
  event_type text,
  
  -- File metadata
  file_size_bytes bigint,
  duration_seconds integer, -- For video chunks
  
  -- Timestamps
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.proctoring_media ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- ADD SCREENSHOT COLUMNS TO PROCTOR_EVENTS IF NOT EXISTS
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'proctor_events' 
    AND column_name = 'screenshot_url'
  ) THEN
    ALTER TABLE public.proctor_events ADD COLUMN screenshot_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'proctor_events' 
    AND column_name = 'screenshot_path'
  ) THEN
    ALTER TABLE public.proctor_events ADD COLUMN screenshot_path text;
  END IF;
END $$;

-- =====================================================
-- ADD NEW EVENT TYPES TO CONSTRAINT
-- =====================================================

-- Drop and recreate the check constraint to include new event types
ALTER TABLE public.proctor_events DROP CONSTRAINT IF EXISTS proctor_events_event_type_check;

ALTER TABLE public.proctor_events ADD CONSTRAINT proctor_events_event_type_check 
CHECK (event_type IN (
  -- Webcam events
  'NO_FACE',
  'MULTI_FACE', 
  'FACE_LOST',
  'FACE_SIZE_CHANGE',
  'RAPID_MOVEMENT',
  'LOOKING_AWAY',
  -- Hand detection events
  'HAND_DETECTED',
  'HAND_COVERING_FACE',
  'PHONE_GESTURE',
  -- Browser events
  'TAB_SWITCH',
  'WINDOW_BLUR',
  'WINDOW_FOCUS',
  'FULLSCREEN_EXIT',
  -- Clipboard events
  'COPY',
  'PASTE',
  'CUT',
  -- Keyboard events
  'SHORTCUT_USED',
  'DEVTOOLS_ATTEMPT',
  -- System events
  'SESSION_START',
  'SESSION_END',
  'WEBCAM_DENIED',
  'WEBCAM_ERROR'
));

-- Add 'hand' to event_category check
ALTER TABLE public.proctor_events DROP CONSTRAINT IF EXISTS proctor_events_event_category_check;

ALTER TABLE public.proctor_events ADD CONSTRAINT proctor_events_event_category_check 
CHECK (event_category IN ('webcam', 'browser', 'clipboard', 'keyboard', 'system', 'hand'));

-- =====================================================
-- RLS POLICIES FOR PROCTORING MEDIA
-- =====================================================

-- Candidates can insert their own media
CREATE POLICY "Candidates insert own media" 
ON public.proctoring_media FOR INSERT 
WITH CHECK (auth.uid() = candidate_id);

-- Candidates can view their own media
CREATE POLICY "Candidates view own media" 
ON public.proctoring_media FOR SELECT 
USING (auth.uid() = candidate_id);

-- HR/Admin can view all media
CREATE POLICY "Staff view all media" 
ON public.proctoring_media FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('recruiter', 'admin')
  )
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_proctoring_media_candidate ON public.proctoring_media(candidate_id);
CREATE INDEX IF NOT EXISTS idx_proctoring_media_attempt ON public.proctoring_media(attempt_id);
CREATE INDEX IF NOT EXISTS idx_proctoring_media_session ON public.proctoring_media(session_id);
CREATE INDEX IF NOT EXISTS idx_proctoring_media_type ON public.proctoring_media(media_type);
CREATE INDEX IF NOT EXISTS idx_proctoring_media_created ON public.proctoring_media(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proctor_events_screenshot ON public.proctor_events(screenshot_url) WHERE screenshot_url IS NOT NULL;

-- =====================================================
-- VIEW FOR HR PORTAL - CANDIDATE PROCTORING SUMMARY
-- =====================================================

CREATE OR REPLACE VIEW public.candidate_proctoring_summary AS
SELECT 
  pm.candidate_id,
  pm.session_id,
  pm.attempt_id,
  COUNT(*) FILTER (WHERE pm.media_type = 'video') as video_count,
  COUNT(*) FILTER (WHERE pm.media_type = 'chunk') as chunk_count,
  COUNT(*) FILTER (WHERE pm.media_type = 'screenshot') as screenshot_count,
  MAX(pm.created_at) as last_upload,
  COALESCE(is_data.integrity_score, 100) as integrity_score,
  COALESCE(is_data.risk_level, 'low') as risk_level
FROM public.proctoring_media pm
LEFT JOIN public.integrity_scores is_data ON is_data.attempt_id = pm.attempt_id
GROUP BY pm.candidate_id, pm.session_id, pm.attempt_id, is_data.integrity_score, is_data.risk_level;

-- Grant access to the view
GRANT SELECT ON public.candidate_proctoring_summary TO authenticated;

