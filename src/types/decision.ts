// =====================================================
// TalentPulse - Stage-5 Decision Engine Types
// Explainable AI + Recruiter Dashboard
// =====================================================

// =====================================================
// DECISION TYPES
// =====================================================

export type Decision = 'hire' | 'no_hire' | 'maybe' | 'manual_review';
export type DecisionStatus = 'pending' | 'decided' | 'overridden' | 'finalized';
export type ResumeCategory = 'Shortlist' | 'Maybe' | 'Reject';
export type RuleType = 'hard_filter' | 'threshold' | 'role_suggestion';

// =====================================================
// RULE EVALUATION
// =====================================================

export interface RuleCondition {
  field: string;
  operator: '<' | '>' | '<=' | '>=' | '==' | '!=';
  value: number | string;
}

export interface HardFilterRule {
  field: string;
  operator: '<' | '>' | '<=' | '>=' | '==' | '!=';
  value: number | string;
  action: Decision;
  message: string;
}

export interface ThresholdRule {
  conditions: RuleCondition[];
  all_required: boolean;
  action: Decision;
}

export interface RoleSuggestionRule {
  conditions: RuleCondition[];
  recommendation: string;
  reasoning: string;
}

export interface DecisionRule {
  id: string;
  rule_name: string;
  rule_type: RuleType;
  config: HardFilterRule | ThresholdRule | RoleSuggestionRule;
  priority: number;
  is_active: boolean;
  description?: string;
}

export interface TriggeredRule {
  rule: string;
  passed: boolean;
  value: number | string;
  threshold: number | string;
  message?: string;
}

// =====================================================
// STRENGTHS & WEAKNESSES
// =====================================================

export interface CompetencyAssessment {
  competency: string;
  score: number;
  label: string;
}

// Thresholds for classification
export const STRENGTH_THRESHOLD = 70;
export const WEAKNESS_THRESHOLD = 50;

// Competency labels for explanation
export const COMPETENCY_LABELS: Record<string, { strong: string; weak: string }> = {
  coding_fundamentals: {
    strong: 'Strong coding and programming skills',
    weak: 'Coding skills need improvement',
  },
  problem_solving: {
    strong: 'Excellent analytical and problem-solving ability',
    weak: 'May struggle with complex problem analysis',
  },
  communication: {
    strong: 'Clear and effective communicator',
    weak: 'Communication skills could be strengthened',
  },
  decision_making: {
    strong: 'Sound judgment and decision-making',
    weak: 'May need guidance on critical decisions',
  },
  resilience: {
    strong: 'Handles pressure and setbacks well',
    weak: 'May struggle under high-pressure situations',
  },
  teamwork: {
    strong: 'Strong collaborative and team player',
    weak: 'May prefer working independently',
  },
  leadership: {
    strong: 'Natural leadership qualities',
    weak: 'Limited leadership experience or orientation',
  },
  ethics: {
    strong: 'Strong ethical standards and integrity',
    weak: 'Ethical considerations need attention',
  },
  analytical_thinking: {
    strong: 'Sharp analytical mind',
    weak: 'Analytical thinking needs development',
  },
  adaptability: {
    strong: 'Highly adaptable to change',
    weak: 'May resist or struggle with change',
  },
};

// =====================================================
// EXPLANATION FACTS
// =====================================================

export interface ExplanationFacts {
  technical_score: number;
  psychometric_score: number;
  integrity_score: number;
  composite_score: number;
  resume_category: ResumeCategory | null;
  strong_competencies: string[];
  weak_competencies: string[];
  decision: Decision;
  triggered_rules: string[];
  role_recommendation?: string;
}

// =====================================================
// HIRING DECISION
// =====================================================

export interface HiringDecision {
  id: string;
  attempt_id: string;
  candidate_id: string;
  job_id?: string;
  
  // Input scores
  resume_category?: ResumeCategory;
  resume_match_score?: number;
  technical_score: number;
  psychometric_score: number;
  integrity_score: number;
  composite_score: number;
  competency_scores: Record<string, number>;
  trait_scores: Record<string, number>;
  
  // Decision output
  decision: Decision;
  decision_confidence: number;
  triggered_rules: TriggeredRule[];
  passed_hard_filters: boolean;
  failed_filter?: string;
  
  // Role recommendation
  recommended_role?: string;
  role_fit_score?: number;
  role_reasoning?: string;
  
  // Strengths & weaknesses
  strengths: CompetencyAssessment[];
  weaknesses: CompetencyAssessment[];
  
  // AI explanation
  explanation_facts: ExplanationFacts;
  ai_explanation?: string;
  explanation_model: string;
  
  // Override tracking
  is_overridden: boolean;
  original_decision?: Decision;
  current_decision: Decision;
  
  // Status & timestamps
  status: DecisionStatus;
  decided_at?: string;
  created_at: string;
  updated_at: string;
}

// =====================================================
// DECISION OVERRIDE
// =====================================================

export interface DecisionOverride {
  id: string;
  decision_id: string;
  recruiter_id: string;
  recruiter_name?: string;
  previous_decision: Decision;
  new_decision: Decision;
  override_reason: string;
  notes?: string;
  overridden_at: string;
}

// =====================================================
// API TYPES
// =====================================================

export interface DecisionRequest {
  attempt_id: string;
  candidate_id: string;
  job_id?: string;
  
  // Scores from Stage-4
  technical_score: number;
  psychometric_score: number;
  integrity_score: number;
  composite_score: number;
  competency_scores: Record<string, number>;
  trait_scores?: Record<string, number>;
  
  // Resume from Stage-2
  resume_category?: ResumeCategory;
  resume_match_score?: number;
}

export interface DecisionResponse {
  success: boolean;
  decision: HiringDecision;
  explanation: string;
}

export interface OverrideRequest {
  decision_id: string;
  new_decision: Decision;
  override_reason: string;
  notes?: string;
}

export interface OverrideResponse {
  success: boolean;
  override: DecisionOverride;
  updated_decision: HiringDecision;
}

// =====================================================
// DASHBOARD TYPES
// =====================================================

export interface CandidateSummary {
  candidate_id: string;
  attempt_id: string;
  candidate_name?: string;
  candidate_email?: string;
  
  resume_category: ResumeCategory;
  technical_score: number;
  psychometric_score: number;
  integrity_score: number;
  composite_score: number;
  
  decision: Decision;
  is_overridden: boolean;
  rank: number;
}

export interface DecisionStats {
  total_candidates: number;
  hired: number;
  rejected: number;
  maybe: number;
  overridden: number;
  avg_technical: number;
  avg_psychometric: number;
  avg_integrity: number;
}

export interface CandidateDetail extends CandidateSummary {
  // Full decision data
  decision_data: HiringDecision;
  
  // Assessment breakdown
  question_contributions: QuestionContribution[];
  coding_results: CodingResultSummary[];
  
  // Proctoring
  proctoring_events: ProctoringEventSummary[];
  integrity_breakdown: IntegrityBreakdown;
  
  // Competency chart data
  competency_chart: CompetencyChartData[];
  
  // AI rationale
  ai_explanation: string;
  
  // Override history
  override_history: DecisionOverride[];
}

export interface QuestionContribution {
  question_id: string;
  question_type: string;
  question_text?: string;
  score: number;
  max_score: number;
  competency: string;
  details?: Record<string, unknown>;
}

export interface CodingResultSummary {
  problem_id: string;
  problem_index: number;
  language: string;
  passed: boolean;
  passed_test_cases: number;
  total_test_cases: number;
  problem_score: number;
  failed_cases: FailedCase[];
}

export interface FailedCase {
  test_id: number;
  expected: string;
  actual: string;
  input?: string;
}

export interface ProctoringEventSummary {
  event_type: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high';
  description?: string;
}

export interface IntegrityBreakdown {
  base_score: number;
  deductions: Array<{
    event_type: string;
    count: number;
    deduction: number;
  }>;
  final_score: number;
}

export interface CompetencyChartData {
  competency: string;
  score: number;
  category: 'strength' | 'neutral' | 'weakness';
  label: string;
}

// =====================================================
// DEFAULT THRESHOLDS
// =====================================================

export const DEFAULT_THRESHOLDS = {
  // Hard filters
  integrity_minimum: 60,
  
  // Hire thresholds
  hire: {
    technical: 70,
    psychometric: 60,
    integrity: 70,
  },
  
  // Maybe thresholds
  maybe: {
    technical: 60,
    psychometric: 50,
    integrity: 65,
  },
  
  // Role suggestion thresholds
  role: {
    leadership_low: 50,
    leadership_high: 70,
    teamwork_high: 70,
    technical_high: 80,
    technical_very_high: 85,
    problem_solving_high: 75,
  },
} as const;

// =====================================================
// DECISION ENGINE CONFIG
// =====================================================

export interface DecisionEngineConfig {
  thresholds: typeof DEFAULT_THRESHOLDS;
  use_custom_rules: boolean;
  generate_explanation: boolean;
  explanation_model: string;
}

export const DEFAULT_ENGINE_CONFIG: DecisionEngineConfig = {
  thresholds: DEFAULT_THRESHOLDS,
  use_custom_rules: true,
  generate_explanation: true,
  explanation_model: 'llama-3.3-70b-versatile',
};
