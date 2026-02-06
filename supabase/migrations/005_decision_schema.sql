-- =====================================================
-- TalentPulse - Stage-5 Explainable AI Decision Engine
-- Hire/No-Hire Decisions + Recruiter Dashboard Support
-- =====================================================

-- =====================================================
-- DROP EXISTING TABLES (Clean slate)
-- =====================================================
DROP TABLE IF EXISTS public.decision_overrides CASCADE;
DROP TABLE IF EXISTS public.hiring_decisions CASCADE;

-- =====================================================
-- HIRING DECISIONS (Main decision table)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.hiring_decisions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id uuid NOT NULL UNIQUE,
  candidate_id uuid NOT NULL,
  job_id uuid, -- FK to jobs table when created
  
  -- =====================================================
  -- INPUT SCORES (Snapshot at decision time)
  -- =====================================================
  
  resume_category text, -- 'Shortlist', 'Maybe', 'Reject'
  resume_match_score numeric(5,2),
  technical_score numeric(5,2) NOT NULL,
  psychometric_score numeric(5,2) NOT NULL,
  integrity_score numeric(5,2) NOT NULL,
  composite_score numeric(5,2) NOT NULL,
  
  -- Competency snapshot
  competency_scores jsonb DEFAULT '{}',
  trait_scores jsonb DEFAULT '{}',
  
  -- =====================================================
  -- DECISION OUTPUT
  -- =====================================================
  
  decision text NOT NULL CHECK (decision IN ('hire', 'no_hire', 'maybe', 'manual_review')),
  decision_confidence numeric(5,2) CHECK (decision_confidence >= 0 AND decision_confidence <= 100),
  
  -- Which rules triggered
  triggered_rules jsonb DEFAULT '[]',
  /*
  [
    {"rule": "integrity_threshold", "passed": true, "value": 85, "threshold": 60},
    {"rule": "technical_minimum", "passed": true, "value": 78, "threshold": 70},
    {"rule": "psychometric_minimum", "passed": false, "value": 55, "threshold": 60}
  ]
  */
  
  -- Hard filter results
  passed_hard_filters boolean DEFAULT true,
  failed_filter text, -- Which filter caused rejection
  
  -- =====================================================
  -- ROLE RECOMMENDATION
  -- =====================================================
  
  recommended_role text, -- 'Individual Contributor', 'Team Lead Track', 'Senior IC', etc.
  role_fit_score numeric(5,2),
  role_reasoning text,
  
  -- =====================================================
  -- STRENGTHS & WEAKNESSES
  -- =====================================================
  
  strengths jsonb DEFAULT '[]',
  /*
  [
    {"competency": "coding_fundamentals", "score": 85, "label": "Strong coding skills"},
    {"competency": "problem_solving", "score": 78, "label": "Good analytical ability"}
  ]
  */
  
  weaknesses jsonb DEFAULT '[]',
  /*
  [
    {"competency": "resilience", "score": 42, "label": "May struggle under pressure"},
    {"competency": "leadership", "score": 38, "label": "Limited leadership experience"}
  ]
  */
  
  -- =====================================================
  -- AI EXPLANATION
  -- =====================================================
  
  explanation_facts jsonb NOT NULL,
  /*
  {
    "technical_score": 82,
    "psychometric_score": 58,
    "integrity_score": 91,
    "strong_competencies": ["coding_fundamentals", "problem_solving"],
    "weak_competencies": ["resilience"],
    "decision": "hire",
    "resume_category": "Shortlist"
  }
  */
  
  ai_explanation text, -- Generated 4-5 line rationale
  explanation_model text DEFAULT 'llama-3.3-70b-versatile',
  
  -- =====================================================
  -- OVERRIDE TRACKING
  -- =====================================================
  
  is_overridden boolean DEFAULT false,
  original_decision text, -- Preserved if overridden
  current_decision text, -- Latest decision after any override
  
  -- =====================================================
  -- STATUS & TIMESTAMPS
  -- =====================================================
  
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'decided', 'overridden', 'finalized')),
  decided_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.hiring_decisions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- DECISION OVERRIDES (Audit trail for recruiter overrides)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.decision_overrides (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  decision_id uuid REFERENCES public.hiring_decisions(id) ON DELETE CASCADE NOT NULL,
  
  -- Who overrode
  recruiter_id uuid NOT NULL,
  recruiter_name text,
  
  -- What changed
  previous_decision text NOT NULL,
  new_decision text NOT NULL CHECK (new_decision IN ('hire', 'no_hire', 'maybe', 'manual_review')),
  
  -- Why (MANDATORY)
  override_reason text NOT NULL CHECK (length(override_reason) >= 10),
  
  -- Additional context
  notes text,
  
  -- Timestamps
  overridden_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.decision_overrides ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- DECISION RULES CONFIG (Configurable thresholds)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.decision_rules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_name text NOT NULL UNIQUE,
  rule_type text NOT NULL CHECK (rule_type IN ('hard_filter', 'threshold', 'role_suggestion')),
  
  -- Rule configuration
  config jsonb NOT NULL,
  /*
  Hard filter example:
  {
    "field": "integrity_score",
    "operator": "<",
    "value": 60,
    "action": "no_hire",
    "message": "Integrity score below minimum threshold"
  }
  
  Threshold example:
  {
    "conditions": [
      {"field": "technical_score", "operator": ">=", "value": 70},
      {"field": "psychometric_score", "operator": ">=", "value": 60},
      {"field": "integrity_score", "operator": ">=", "value": 70}
    ],
    "all_required": true,
    "action": "hire"
  }
  
  Role suggestion example:
  {
    "conditions": [
      {"field": "leadership", "operator": "<", "value": 50},
      {"field": "technical_score", "operator": ">", "value": 80}
    ],
    "recommendation": "Individual Contributor"
  }
  */
  
  -- Rule metadata
  priority integer DEFAULT 0, -- Higher = evaluated first
  is_active boolean DEFAULT true,
  description text,
  
  -- Timestamps
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default rules
INSERT INTO public.decision_rules (rule_name, rule_type, priority, config, description) VALUES
-- Hard Filters (evaluated first)
('integrity_minimum', 'hard_filter', 100, 
  '{"field": "integrity_score", "operator": "<", "value": 60, "action": "no_hire", "message": "Failed integrity threshold - potential cheating detected"}',
  'Reject candidates with integrity score below 60'),

('resume_reject', 'hard_filter', 99,
  '{"field": "resume_category", "operator": "==", "value": "Reject", "action": "no_hire", "message": "Resume did not meet minimum qualifications"}',
  'Reject candidates whose resume was marked as Reject'),

-- Core Decision Rules
('hire_threshold', 'threshold', 50,
  '{"conditions": [{"field": "technical_score", "operator": ">=", "value": 70}, {"field": "psychometric_score", "operator": ">=", "value": 60}, {"field": "integrity_score", "operator": ">=", "value": 70}], "all_required": true, "action": "hire"}',
  'Hire if technical >= 70, psychometric >= 60, integrity >= 70'),

('maybe_threshold', 'threshold', 40,
  '{"conditions": [{"field": "technical_score", "operator": ">=", "value": 60}, {"field": "psychometric_score", "operator": ">=", "value": 50}, {"field": "integrity_score", "operator": ">=", "value": 65}], "all_required": true, "action": "maybe"}',
  'Maybe if scores are borderline - needs manual review'),

-- Role Suggestions
('individual_contributor', 'role_suggestion', 10,
  '{"conditions": [{"field": "competency.leadership", "operator": "<", "value": 50}, {"field": "technical_score", "operator": ">", "value": 80}], "recommendation": "Individual Contributor", "reasoning": "Strong technical skills with limited leadership orientation - best suited for IC track"}',
  'Recommend IC track for high-tech low-leadership candidates'),

('team_lead_track', 'role_suggestion', 10,
  '{"conditions": [{"field": "competency.leadership", "operator": ">", "value": 70}, {"field": "competency.teamwork", "operator": ">", "value": 70}], "recommendation": "Team Lead Track", "reasoning": "Strong leadership and teamwork competencies - potential for management track"}',
  'Recommend management track for high leadership + teamwork'),

('senior_ic', 'role_suggestion', 10,
  '{"conditions": [{"field": "technical_score", "operator": ">", "value": 85}, {"field": "competency.problem_solving", "operator": ">", "value": 75}], "recommendation": "Senior Individual Contributor", "reasoning": "Exceptional technical skills and problem-solving ability - strong senior IC candidate"}',
  'Recommend senior IC for very high technical scores')

ON CONFLICT (rule_name) DO NOTHING;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Hiring Decisions
CREATE POLICY "Candidates view own decision" 
ON public.hiring_decisions FOR SELECT 
USING (auth.uid() = candidate_id);

CREATE POLICY "Staff view all decisions" 
ON public.hiring_decisions FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('recruiter', 'admin')
  )
);

CREATE POLICY "Staff manage decisions" 
ON public.hiring_decisions FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('recruiter', 'admin')
  )
);

-- Decision Overrides
CREATE POLICY "Staff view overrides" 
ON public.decision_overrides FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('recruiter', 'admin')
  )
);

CREATE POLICY "Staff create overrides" 
ON public.decision_overrides FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('recruiter', 'admin')
  )
);

-- Decision Rules (admin only for modification, staff can view)
CREATE POLICY "All staff view rules" 
ON public.decision_rules FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('recruiter', 'admin')
  )
);

CREATE POLICY "Admin manage rules" 
ON public.decision_rules FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

ALTER TABLE public.decision_rules ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_hiring_decisions_attempt ON public.hiring_decisions(attempt_id);
CREATE INDEX IF NOT EXISTS idx_hiring_decisions_candidate ON public.hiring_decisions(candidate_id);
CREATE INDEX IF NOT EXISTS idx_hiring_decisions_decision ON public.hiring_decisions(decision);
CREATE INDEX IF NOT EXISTS idx_hiring_decisions_status ON public.hiring_decisions(status);
CREATE INDEX IF NOT EXISTS idx_hiring_decisions_job ON public.hiring_decisions(job_id);
CREATE INDEX IF NOT EXISTS idx_decision_overrides_decision ON public.decision_overrides(decision_id);
CREATE INDEX IF NOT EXISTS idx_decision_rules_type ON public.decision_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_decision_rules_active ON public.decision_rules(is_active);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Get decision summary for a job
CREATE OR REPLACE FUNCTION get_decision_summary(p_job_id uuid DEFAULT NULL)
RETURNS TABLE (
  total_candidates bigint,
  hired bigint,
  rejected bigint,
  maybe bigint,
  overridden bigint,
  avg_technical numeric,
  avg_psychometric numeric,
  avg_integrity numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total_candidates,
    COUNT(*) FILTER (WHERE d.current_decision = 'hire')::bigint as hired,
    COUNT(*) FILTER (WHERE d.current_decision = 'no_hire')::bigint as rejected,
    COUNT(*) FILTER (WHERE d.current_decision = 'maybe')::bigint as maybe,
    COUNT(*) FILTER (WHERE d.is_overridden = true)::bigint as overridden,
    ROUND(AVG(d.technical_score), 2) as avg_technical,
    ROUND(AVG(d.psychometric_score), 2) as avg_psychometric,
    ROUND(AVG(d.integrity_score), 2) as avg_integrity
  FROM public.hiring_decisions d
  WHERE (p_job_id IS NULL OR d.job_id = p_job_id)
    AND d.status != 'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get candidate ranking with decisions
CREATE OR REPLACE FUNCTION get_candidate_ranking_with_decisions(p_job_id uuid DEFAULT NULL)
RETURNS TABLE (
  out_candidate_id uuid,
  out_attempt_id uuid,
  out_decision text,
  out_composite_score numeric,
  out_technical_score numeric,
  out_psychometric_score numeric,
  out_integrity_score numeric,
  out_is_overridden boolean,
  out_rank bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.candidate_id,
    d.attempt_id,
    COALESCE(d.current_decision, d.decision),
    d.composite_score,
    d.technical_score,
    d.psychometric_score,
    d.integrity_score,
    d.is_overridden,
    RANK() OVER (ORDER BY d.composite_score DESC)
  FROM public.hiring_decisions d
  WHERE (p_job_id IS NULL OR d.job_id = p_job_id)
    AND d.status != 'pending'
  ORDER BY d.composite_score DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
