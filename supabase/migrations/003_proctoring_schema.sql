-- =====================================================
-- TalentPulse - Stage-3 Integrity Shield Schema
-- Proctoring Events & Audit Trail
-- =====================================================

-- =====================================================
-- PROCTOR EVENTS TABLE (Audit Trail)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.proctor_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id uuid NOT NULL,
  candidate_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id uuid REFERENCES public.assessment_sessions(id) ON DELETE CASCADE,
  
  -- Event Classification
  event_type text NOT NULL CHECK (event_type IN (
    -- Webcam events
    'NO_FACE',
    'MULTI_FACE', 
    'FACE_LOST',
    'FACE_SIZE_CHANGE',
    'RAPID_MOVEMENT',
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
  )),
  
  event_category text NOT NULL CHECK (event_category IN ('webcam', 'browser', 'clipboard', 'keyboard', 'system')),
  
  -- Event Details
  severity text DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description text,
  
  -- Metadata (flexible JSON for extra context)
  meta jsonb DEFAULT '{}',
  /*
  Examples:
  - webcam: {"face_count": 2, "confidence": 0.85}
  - keyboard: {"key": "Ctrl+C", "target_element": "textarea"}
  - browser: {"hidden_duration_ms": 5000, "previous_url": "..."}
  */
  
  -- Timestamps
  client_timestamp timestamp with time zone NOT NULL,
  server_timestamp timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Location in assessment
  question_index integer,
  elapsed_seconds integer
);

ALTER TABLE public.proctor_events ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- INTEGRITY SCORES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.integrity_scores (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id uuid NOT NULL UNIQUE,
  candidate_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id uuid REFERENCES public.assessment_sessions(id) ON DELETE CASCADE,
  
  -- Core Score (0-100, starts at 100)
  integrity_score integer DEFAULT 100 CHECK (integrity_score >= 0 AND integrity_score <= 100),
  
  -- Event Counts
  total_events integer DEFAULT 0,
  webcam_events integer DEFAULT 0,
  browser_events integer DEFAULT 0,
  clipboard_events integer DEFAULT 0,
  keyboard_events integer DEFAULT 0,
  
  -- Specific Violation Counts
  no_face_count integer DEFAULT 0,
  multi_face_count integer DEFAULT 0,
  tab_switch_count integer DEFAULT 0,
  copy_paste_count integer DEFAULT 0,
  shortcut_count integer DEFAULT 0,
  
  -- Timing
  total_no_face_duration_ms integer DEFAULT 0,
  longest_no_face_ms integer DEFAULT 0,
  
  -- Risk Assessment
  risk_level text DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  risk_factors jsonb DEFAULT '[]',
  
  -- Deduction Breakdown
  deductions jsonb DEFAULT '{}',
  /*
  {
    "tab_switch": -15,
    "no_face": -20,
    "multi_face": -30,
    "copy_paste": -10
  }
  */
  
  -- Timestamps
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone,
  finalized_at timestamp with time zone
);

ALTER TABLE public.integrity_scores ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PROCTOR SESSIONS (for tracking active monitoring)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.proctor_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id uuid NOT NULL,
  candidate_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id uuid REFERENCES public.assessment_sessions(id) ON DELETE CASCADE,
  
  -- Session State
  status text DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'terminated')),
  
  -- Webcam Status
  webcam_enabled boolean DEFAULT false,
  webcam_permission_granted boolean DEFAULT false,
  last_face_detected_at timestamp with time zone,
  
  -- Session Timing
  started_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  ended_at timestamp with time zone,
  
  -- Connection Info
  user_agent text,
  ip_address inet,
  
  -- Heartbeat
  last_heartbeat timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.proctor_sessions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Proctor Events: Candidates can insert their own events
CREATE POLICY "Candidates insert own events" 
ON public.proctor_events FOR INSERT 
WITH CHECK (auth.uid() = candidate_id);

-- Proctor Events: Recruiters/Admins can view all
CREATE POLICY "Staff view all events" 
ON public.proctor_events FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('recruiter', 'admin')
  )
);

-- Candidates can view their own events
CREATE POLICY "Candidates view own events" 
ON public.proctor_events FOR SELECT 
USING (auth.uid() = candidate_id);

-- Integrity Scores: Similar policies
CREATE POLICY "Candidates view own score" 
ON public.integrity_scores FOR SELECT 
USING (auth.uid() = candidate_id);

CREATE POLICY "Staff view all scores" 
ON public.integrity_scores FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('recruiter', 'admin')
  )
);

CREATE POLICY "System upsert scores" 
ON public.integrity_scores FOR ALL 
USING (auth.uid() = candidate_id);

-- Proctor Sessions
CREATE POLICY "Candidates manage own sessions" 
ON public.proctor_sessions FOR ALL 
USING (auth.uid() = candidate_id);

CREATE POLICY "Staff view sessions" 
ON public.proctor_sessions FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('recruiter', 'admin')
  )
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_proctor_events_attempt ON public.proctor_events(attempt_id);
CREATE INDEX IF NOT EXISTS idx_proctor_events_candidate ON public.proctor_events(candidate_id);
CREATE INDEX IF NOT EXISTS idx_proctor_events_type ON public.proctor_events(event_type);
CREATE INDEX IF NOT EXISTS idx_proctor_events_timestamp ON public.proctor_events(server_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_integrity_scores_attempt ON public.integrity_scores(attempt_id);
CREATE INDEX IF NOT EXISTS idx_integrity_scores_candidate ON public.integrity_scores(candidate_id);
CREATE INDEX IF NOT EXISTS idx_proctor_sessions_attempt ON public.proctor_sessions(attempt_id);

-- =====================================================
-- INTEGRITY SCORE CALCULATION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_integrity_score(p_attempt_id uuid)
RETURNS integer AS $$
DECLARE
  v_score integer := 100;
  v_no_face_count integer;
  v_multi_face_count integer;
  v_tab_switch_count integer;
  v_copy_paste_count integer;
  v_shortcut_count integer;
BEGIN
  -- Count violations
  SELECT 
    COUNT(*) FILTER (WHERE event_type = 'NO_FACE'),
    COUNT(*) FILTER (WHERE event_type = 'MULTI_FACE'),
    COUNT(*) FILTER (WHERE event_type = 'TAB_SWITCH'),
    COUNT(*) FILTER (WHERE event_type IN ('COPY', 'PASTE')),
    COUNT(*) FILTER (WHERE event_type = 'SHORTCUT_USED')
  INTO v_no_face_count, v_multi_face_count, v_tab_switch_count, v_copy_paste_count, v_shortcut_count
  FROM public.proctor_events
  WHERE attempt_id = p_attempt_id;
  
  -- Apply deductions
  v_score := v_score - (v_tab_switch_count * 5);           -- -5 per tab switch
  v_score := v_score - (v_no_face_count * 2);              -- -2 per no face event
  v_score := v_score - (v_multi_face_count * 15);          -- -15 per multi face
  v_score := v_score - (v_copy_paste_count * 3);           -- -3 per copy/paste
  v_score := v_score - (v_shortcut_count * 2);             -- -2 per shortcut
  
  -- Ensure score doesn't go below 0
  v_score := GREATEST(v_score, 0);
  
  RETURN v_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION TO GET ATTEMPT SUMMARY
-- =====================================================

CREATE OR REPLACE FUNCTION get_proctor_summary(p_attempt_id uuid)
RETURNS TABLE (
  total_events bigint,
  integrity_score integer,
  risk_level text,
  no_face_count bigint,
  multi_face_count bigint,
  tab_switch_count bigint,
  copy_paste_count bigint,
  critical_events bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total_events,
    calculate_integrity_score(p_attempt_id) as integrity_score,
    CASE 
      WHEN calculate_integrity_score(p_attempt_id) >= 80 THEN 'low'
      WHEN calculate_integrity_score(p_attempt_id) >= 60 THEN 'medium'
      WHEN calculate_integrity_score(p_attempt_id) >= 40 THEN 'high'
      ELSE 'critical'
    END as risk_level,
    COUNT(*) FILTER (WHERE event_type = 'NO_FACE')::bigint,
    COUNT(*) FILTER (WHERE event_type = 'MULTI_FACE')::bigint,
    COUNT(*) FILTER (WHERE event_type = 'TAB_SWITCH')::bigint,
    COUNT(*) FILTER (WHERE event_type IN ('COPY', 'PASTE'))::bigint,
    COUNT(*) FILTER (WHERE severity = 'critical')::bigint
  FROM public.proctor_events
  WHERE attempt_id = p_attempt_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
