-- =====================================================
-- TalentPulse - Stage-4 Dual-Track Scoring Engine Schema
-- Technical + Psychometric + Integrity Scores
-- =====================================================

-- =====================================================
-- DROP EXISTING TABLES (Clean slate)
-- =====================================================
DROP TABLE IF EXISTS public.mcq_responses CASCADE;
DROP TABLE IF EXISTS public.slider_responses CASCADE;
DROP TABLE IF EXISTS public.text_evaluations CASCADE;
DROP TABLE IF EXISTS public.coding_results CASCADE;
DROP TABLE IF EXISTS public.assessment_scores CASCADE;

-- =====================================================
-- ASSESSMENT SCORES (Main scoring table)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.assessment_scores (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id uuid NOT NULL UNIQUE,
  candidate_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id uuid, -- FK to assessment_sessions if exists
  job_id uuid, -- FK to jobs table when created
  
  -- =====================================================
  -- CORE SCORES (0-100 scale)
  -- =====================================================
  
  technical_score numeric(5,2) DEFAULT 0 CHECK (technical_score >= 0 AND technical_score <= 100),
  psychometric_score numeric(5,2) DEFAULT 0 CHECK (psychometric_score >= 0 AND psychometric_score <= 100),
  integrity_score numeric(5,2) DEFAULT 0 CHECK (integrity_score >= 0 AND integrity_score <= 100),
  
  -- Weighted composite (configurable weights)
  composite_score numeric(5,2) DEFAULT 0 CHECK (composite_score >= 0 AND composite_score <= 100),
  
  -- =====================================================
  -- TECHNICAL BREAKDOWN
  -- =====================================================
  
  coding_score numeric(5,2) DEFAULT 0,        -- From code execution results
  technical_mcq_score numeric(5,2) DEFAULT 0, -- From technical MCQs
  technical_text_score numeric(5,2) DEFAULT 0, -- From LLM-evaluated text answers
  
  -- Coding details
  coding_problems_attempted integer DEFAULT 0,
  coding_problems_passed integer DEFAULT 0,
  total_test_cases integer DEFAULT 0,
  passed_test_cases integer DEFAULT 0,
  
  -- =====================================================
  -- PSYCHOMETRIC BREAKDOWN
  -- =====================================================
  
  trait_scores jsonb DEFAULT '{}',
  /*
  {
    "emotional_intelligence": 72.5,
    "resilience": 65.0,
    "teamwork": 80.0,
    "leadership": 58.3
  }
  */
  
  psych_mcq_score numeric(5,2) DEFAULT 0,     -- From scenario MCQs
  psych_text_score numeric(5,2) DEFAULT 0,    -- From behavioral text
  slider_score numeric(5,2) DEFAULT 0,        -- From personality sliders
  
  -- =====================================================
  -- COMPETENCY SCORES (For Explainability)
  -- =====================================================
  
  competency_scores jsonb DEFAULT '{}',
  /*
  {
    "coding_fundamentals": 78,
    "problem_solving": 72,
    "communication": 65,
    "decision_making": 70,
    "resilience": 41,
    "teamwork": 83,
    "leadership": 55,
    "ethics": 90
  }
  */
  
  -- =====================================================
  -- QUESTION-LEVEL CONTRIBUTIONS (Traceability)
  -- =====================================================
  
  question_contributions jsonb DEFAULT '[]',
  /*
  [
    {
      "question_id": "q1",
      "question_type": "coding",
      "score": 85,
      "max_score": 100,
      "competency": "coding_fundamentals",
      "details": {
        "passed_tests": 4,
        "total_tests": 5,
        "runtime_ms": 120
      }
    },
    {
      "question_id": "q2",
      "question_type": "technical_mcq",
      "score": 100,
      "max_score": 100,
      "competency": "problem_solving",
      "selected_option": "B",
      "correct": true
    },
    {
      "question_id": "q3",
      "question_type": "technical_text",
      "score": 73,
      "max_score": 100,
      "competency": "communication",
      "rubric_scores": {
        "clarity": 4,
        "correctness": 3,
        "depth": 4
      }
    }
  ]
  */
  
  -- =====================================================
  -- LLM EVALUATION DETAILS
  -- =====================================================
  
  llm_evaluations jsonb DEFAULT '[]',
  /*
  [
    {
      "question_id": "q3",
      "rubric": {
        "clarity": {"score": 4, "max": 5, "feedback": "Well structured response"},
        "correctness": {"score": 3, "max": 5, "feedback": "Minor inaccuracies"},
        "depth": {"score": 4, "max": 5, "feedback": "Good technical depth"}
      },
      "total_score": 73.33,
      "model": "llama-3.3-70b-versatile",
      "evaluated_at": "2026-01-30T10:00:00Z"
    }
  ]
  */
  
  -- =====================================================
  -- SCORING METADATA
  -- =====================================================
  
  scoring_version text DEFAULT '1.0',
  scoring_weights jsonb DEFAULT '{
    "technical": 0.40,
    "psychometric": 0.35,
    "integrity": 0.25
  }',
  
  -- Status
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'manual_review')),
  error_message text,
  
  -- Timestamps
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  calculated_at timestamp with time zone,
  reviewed_at timestamp with time zone,
  reviewed_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.assessment_scores ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CODING RESULTS (Detailed code execution results)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.coding_results (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id uuid NOT NULL,
  candidate_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Problem identification
  problem_id text NOT NULL,
  problem_index integer NOT NULL,
  
  -- Submitted code
  language text NOT NULL,
  code text NOT NULL,
  
  -- Execution results
  passed boolean DEFAULT false,
  passed_test_cases integer DEFAULT 0,
  total_test_cases integer DEFAULT 0,
  problem_score numeric(5,2) DEFAULT 0, -- (passed/total) * 100
  
  -- Performance metrics
  runtime_ms integer,
  memory_kb integer,
  
  -- Test case details
  test_results jsonb DEFAULT '[]',
  /*
  [
    {"test_id": 1, "passed": true, "expected": "5", "actual": "5", "runtime_ms": 10},
    {"test_id": 2, "passed": false, "expected": "10", "actual": "9", "error": null}
  ]
  */
  
  failed_cases jsonb DEFAULT '[]',
  /*
  [
    {"test_id": 2, "expected": "10", "actual": "9", "input": "[1,2,3,4]"}
  ]
  */
  
  -- Execution errors
  compile_error text,
  runtime_error text,
  timeout boolean DEFAULT false,
  
  -- Competency mapping
  competency text DEFAULT 'coding_fundamentals',
  
  -- Timestamps
  submitted_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  executed_at timestamp with time zone
);

ALTER TABLE public.coding_results ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- TEXT ANSWER EVALUATIONS (LLM-scored text responses)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.text_evaluations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id uuid NOT NULL,
  candidate_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Question identification
  question_id text NOT NULL,
  question_index integer NOT NULL,
  question_type text NOT NULL CHECK (question_type IN ('technical_text', 'behavioral_text')),
  question_text text NOT NULL,
  
  -- Answer
  answer_text text NOT NULL,
  word_count integer,
  
  -- Rubric scores (0-5 each)
  clarity_score integer DEFAULT 0 CHECK (clarity_score >= 0 AND clarity_score <= 5),
  correctness_score integer DEFAULT 0 CHECK (correctness_score >= 0 AND correctness_score <= 5),
  depth_score integer DEFAULT 0 CHECK (depth_score >= 0 AND depth_score <= 5),
  
  -- Additional rubric dimensions for behavioral
  empathy_score integer CHECK (empathy_score >= 0 AND empathy_score <= 5),
  professionalism_score integer CHECK (professionalism_score >= 0 AND professionalism_score <= 5),
  
  -- Computed score (normalized to 0-100)
  total_score numeric(5,2) DEFAULT 0,
  
  -- LLM feedback
  clarity_feedback text,
  correctness_feedback text,
  depth_feedback text,
  overall_feedback text,
  
  -- Competency mapping
  competency text NOT NULL,
  
  -- LLM metadata
  model_used text,
  prompt_tokens integer,
  completion_tokens integer,
  
  -- Timestamps
  submitted_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  evaluated_at timestamp with time zone
);

ALTER TABLE public.text_evaluations ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SLIDER RESPONSES (Personality assessment)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.slider_responses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id uuid NOT NULL,
  candidate_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- All 12 slider values (0-100)
  slider_values jsonb NOT NULL,
  /*
  {
    "stress_handling": 75,
    "conflict_resolution": 60,
    "feedback_reception": 80,
    "setback_recovery": 55,
    "pressure_performance": 70,
    "failure_response": 65,
    "collaboration_style": 85,
    "team_dynamics": 75,
    "knowledge_sharing": 90,
    "initiative_taking": 60,
    "mentoring_interest": 55,
    "vision_setting": 45
  }
  */
  
  -- Computed trait scores (average of related sliders)
  trait_scores jsonb NOT NULL,
  /*
  {
    "emotional_intelligence": 71.67,
    "resilience": 63.33,
    "teamwork": 83.33,
    "leadership": 53.33
  }
  */
  
  -- Individual trait breakdowns
  emotional_intelligence numeric(5,2),
  resilience numeric(5,2),
  teamwork numeric(5,2),
  leadership numeric(5,2),
  
  -- Overall psychometric from sliders
  slider_score numeric(5,2),
  
  -- Timestamps
  submitted_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.slider_responses ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- MCQ RESPONSES (Both technical and psychometric)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.mcq_responses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id uuid NOT NULL,
  candidate_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Question identification
  question_id text NOT NULL,
  question_index integer NOT NULL,
  question_type text NOT NULL CHECK (question_type IN ('technical_mcq', 'psychometric_mcq')),
  
  -- Response
  selected_option text NOT NULL,
  correct_option text, -- NULL for psychometric (no right/wrong)
  
  -- Scoring
  is_correct boolean, -- NULL for psychometric
  score numeric(5,2) DEFAULT 0,
  
  -- For psychometric MCQs
  option_valence text CHECK (option_valence IN ('positive', 'neutral', 'negative')),
  mapped_trait text, -- Which trait this affects
  
  -- Competency mapping
  competency text NOT NULL,
  
  -- Timestamps
  answered_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.mcq_responses ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Assessment Scores
CREATE POLICY "Candidates view own scores" 
ON public.assessment_scores FOR SELECT 
USING (auth.uid() = candidate_id);

CREATE POLICY "Staff view all scores" 
ON public.assessment_scores FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('recruiter', 'admin')
  )
);

CREATE POLICY "System manage scores" 
ON public.assessment_scores FOR ALL 
USING (auth.uid() = candidate_id);

-- Coding Results
CREATE POLICY "Candidates view own coding" 
ON public.coding_results FOR SELECT 
USING (auth.uid() = candidate_id);

CREATE POLICY "Staff view all coding" 
ON public.coding_results FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('recruiter', 'admin')
  )
);

CREATE POLICY "Candidates insert coding" 
ON public.coding_results FOR INSERT 
WITH CHECK (auth.uid() = candidate_id);

-- Text Evaluations
CREATE POLICY "Candidates view own text" 
ON public.text_evaluations FOR SELECT 
USING (auth.uid() = candidate_id);

CREATE POLICY "Staff view all text" 
ON public.text_evaluations FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('recruiter', 'admin')
  )
);

CREATE POLICY "System manage text" 
ON public.text_evaluations FOR ALL 
USING (auth.uid() = candidate_id);

-- Slider Responses
CREATE POLICY "Candidates manage sliders" 
ON public.slider_responses FOR ALL 
USING (auth.uid() = candidate_id);

CREATE POLICY "Staff view sliders" 
ON public.slider_responses FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('recruiter', 'admin')
  )
);

-- MCQ Responses
CREATE POLICY "Candidates manage mcq" 
ON public.mcq_responses FOR ALL 
USING (auth.uid() = candidate_id);

CREATE POLICY "Staff view mcq" 
ON public.mcq_responses FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('recruiter', 'admin')
  )
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_assessment_scores_attempt ON public.assessment_scores(attempt_id);
CREATE INDEX IF NOT EXISTS idx_assessment_scores_candidate ON public.assessment_scores(candidate_id);
CREATE INDEX IF NOT EXISTS idx_assessment_scores_job ON public.assessment_scores(job_id);
CREATE INDEX IF NOT EXISTS idx_assessment_scores_status ON public.assessment_scores(status);
CREATE INDEX IF NOT EXISTS idx_coding_results_attempt ON public.coding_results(attempt_id);
CREATE INDEX IF NOT EXISTS idx_text_evaluations_attempt ON public.text_evaluations(attempt_id);
CREATE INDEX IF NOT EXISTS idx_slider_responses_attempt ON public.slider_responses(attempt_id);
CREATE INDEX IF NOT EXISTS idx_mcq_responses_attempt ON public.mcq_responses(attempt_id);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Calculate composite score with custom weights
CREATE OR REPLACE FUNCTION calculate_composite_score(
  p_technical numeric,
  p_psychometric numeric,
  p_integrity numeric,
  p_weights jsonb DEFAULT '{"technical": 0.40, "psychometric": 0.35, "integrity": 0.25}'
)
RETURNS numeric AS $$
BEGIN
  RETURN ROUND(
    (p_technical * COALESCE((p_weights->>'technical')::numeric, 0.40)) +
    (p_psychometric * COALESCE((p_weights->>'psychometric')::numeric, 0.35)) +
    (p_integrity * COALESCE((p_weights->>'integrity')::numeric, 0.25)),
    2
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Get candidate ranking for a job
CREATE OR REPLACE FUNCTION get_candidate_ranking(p_job_id uuid)
RETURNS TABLE (
  out_candidate_id uuid,
  out_attempt_id uuid,
  out_technical_score numeric,
  out_psychometric_score numeric,
  out_integrity_score numeric,
  out_composite_score numeric,
  out_rank bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.candidate_id,
    s.attempt_id,
    s.technical_score,
    s.psychometric_score,
    s.integrity_score,
    s.composite_score,
    RANK() OVER (ORDER BY s.composite_score DESC)
  FROM public.assessment_scores s
  WHERE s.job_id = p_job_id
    AND s.status = 'completed'
  ORDER BY s.composite_score DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get competency breakdown for a candidate
CREATE OR REPLACE FUNCTION get_competency_breakdown(p_attempt_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_scores jsonb;
BEGIN
  SELECT competency_scores INTO v_scores
  FROM public.assessment_scores
  WHERE attempt_id = p_attempt_id;
  
  RETURN COALESCE(v_scores, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
