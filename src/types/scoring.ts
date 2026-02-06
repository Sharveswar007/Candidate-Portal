// =====================================================
// TalentPulse - Stage-4 Scoring Types
// =====================================================

// =====================================================
// COMPETENCY DEFINITIONS
// =====================================================

export type Competency =
  | 'coding_fundamentals'
  | 'problem_solving'
  | 'communication'
  | 'decision_making'
  | 'resilience'
  | 'teamwork'
  | 'leadership'
  | 'ethics'
  | 'analytical_thinking'
  | 'adaptability';

export type PsychTrait =
  | 'emotional_intelligence'
  | 'resilience'
  | 'teamwork'
  | 'leadership';

// =====================================================
// QUESTION TYPES
// =====================================================

export type QuestionType =
  | 'coding'
  | 'technical_mcq'
  | 'technical_text'
  | 'psychometric_mcq'
  | 'behavioral_text'
  | 'slider';

// =====================================================
// RUBRIC DEFINITIONS
// =====================================================

export interface RubricScore {
  score: number;     // 0-5
  max: number;       // Always 5
  feedback: string;
}

export interface TechnicalRubric {
  clarity: RubricScore;
  correctness: RubricScore;
  depth: RubricScore;
}

export interface BehavioralRubric {
  clarity: RubricScore;
  empathy: RubricScore;
  professionalism: RubricScore;
  depth: RubricScore;
}

// =====================================================
// SCORING RESULTS
// =====================================================

export interface CodingResult {
  problem_id: string;
  problem_index: number;
  language: string;
  code: string;
  passed: boolean;
  passed_test_cases: number;
  total_test_cases: number;
  problem_score: number;
  runtime_ms?: number;
  memory_kb?: number;
  test_results: TestResult[];
  failed_cases: FailedCase[];
  compile_error?: string;
  runtime_error?: string;
  timeout: boolean;
  competency: Competency;
}

export interface TestResult {
  test_id: number;
  passed: boolean;
  expected: string;
  actual: string;
  runtime_ms?: number;
  error?: string;
}

export interface FailedCase {
  test_id: number;
  expected: string;
  actual: string;
  input?: string;
}

export interface TextEvaluation {
  question_id: string;
  question_index: number;
  question_type: 'technical_text' | 'behavioral_text';
  question_text: string;
  answer_text: string;
  word_count: number;
  rubric_scores: TechnicalRubric | BehavioralRubric;
  total_score: number;
  overall_feedback: string;
  competency: Competency;
  model_used: string;
  evaluated_at: string;
}

export interface MCQResponse {
  question_id: string;
  question_index: number;
  question_type: 'technical_mcq' | 'psychometric_mcq';
  selected_option: string;
  correct_option?: string;
  is_correct?: boolean;
  score: number;
  option_valence?: 'positive' | 'neutral' | 'negative';
  mapped_trait?: PsychTrait;
  competency: Competency;
}

export interface SliderResponses {
  slider_values: {
    stress_handling: number;
    conflict_resolution: number;
    feedback_reception: number;
    setback_recovery: number;
    pressure_performance: number;
    failure_response: number;
    collaboration_style: number;
    team_dynamics: number;
    knowledge_sharing: number;
    initiative_taking: number;
    mentoring_interest: number;
    vision_setting: number;
  };
  trait_scores: {
    emotional_intelligence: number;
    resilience: number;
    teamwork: number;
    leadership: number;
  };
}

// =====================================================
// QUESTION CONTRIBUTION (For Explainability)
// =====================================================

export interface QuestionContribution {
  question_id: string;
  question_type: QuestionType;
  score: number;
  max_score: number;
  competency: Competency;
  details?: Record<string, unknown>;
}

// =====================================================
// COMPETENCY SCORES
// =====================================================

export interface CompetencyScores {
  coding_fundamentals?: number;
  problem_solving?: number;
  communication?: number;
  decision_making?: number;
  resilience?: number;
  teamwork?: number;
  leadership?: number;
  ethics?: number;
  analytical_thinking?: number;
  adaptability?: number;
}

// =====================================================
// TRAIT SCORES
// =====================================================

export interface TraitScores {
  emotional_intelligence: number;
  resilience: number;
  teamwork: number;
  leadership: number;
}

// =====================================================
// MAIN ASSESSMENT SCORE
// =====================================================

export interface AssessmentScore {
  id?: string;
  attempt_id: string;
  candidate_id: string;
  session_id?: string;
  job_id?: string;
  
  // Core scores (0-100)
  technical_score: number;
  psychometric_score: number;
  integrity_score: number;
  composite_score: number;
  
  // Technical breakdown
  coding_score: number;
  technical_mcq_score: number;
  technical_text_score: number;
  coding_problems_attempted: number;
  coding_problems_passed: number;
  total_test_cases: number;
  passed_test_cases: number;
  
  // Psychometric breakdown
  trait_scores: TraitScores;
  psych_mcq_score: number;
  psych_text_score: number;
  slider_score: number;
  
  // Competency scores
  competency_scores: CompetencyScores;
  
  // Traceability
  question_contributions: QuestionContribution[];
  llm_evaluations: TextEvaluation[];
  
  // Metadata
  scoring_version: string;
  scoring_weights: {
    technical: number;
    psychometric: number;
    integrity: number;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'manual_review';
  error_message?: string;
  
  // Timestamps
  created_at?: string;
  calculated_at?: string;
}

// =====================================================
// SCORING REQUEST/RESPONSE
// =====================================================

export interface ScoringRequest {
  attempt_id: string;
  candidate_id: string;
  session_id?: string;
  job_id?: string;
  
  // Raw data to score
  coding_answers?: {
    problem_id: string;
    code: string;
    language: string;
    test_results?: TestResult[];
  }[];
  
  mcq_answers?: {
    question_id: string;
    question_type: 'technical_mcq' | 'psychometric_mcq';
    selected_option: string;
    correct_option?: string;
    competency: Competency;
    option_valence?: 'positive' | 'neutral' | 'negative';
    mapped_trait?: PsychTrait;
  }[];
  
  text_answers?: {
    question_id: string;
    question_type: 'technical_text' | 'behavioral_text';
    question_text: string;
    answer_text: string;
    competency: Competency;
  }[];
  
  slider_responses?: SliderResponses['slider_values'];
  
  // Custom weights (optional)
  scoring_weights?: {
    technical: number;
    psychometric: number;
    integrity: number;
  };
}

export interface ScoringResponse {
  success: boolean;
  score?: AssessmentScore;
  error?: string;
}

// =====================================================
// LLM EVALUATION PROMPT TYPES
// =====================================================

export interface EvaluationPrompt {
  question_type: 'technical_text' | 'behavioral_text';
  question_text: string;
  answer_text: string;
  rubric: string[];
}

export interface LLMEvaluationResult {
  rubric_scores: Record<string, { score: number; feedback: string }>;
  total_score: number;
  overall_feedback: string;
}

// =====================================================
// SLIDER TO TRAIT MAPPING
// =====================================================

export const SLIDER_TRAIT_MAPPING: Record<keyof SliderResponses['slider_values'], PsychTrait> = {
  stress_handling: 'emotional_intelligence',
  conflict_resolution: 'emotional_intelligence',
  feedback_reception: 'emotional_intelligence',
  setback_recovery: 'resilience',
  pressure_performance: 'resilience',
  failure_response: 'resilience',
  collaboration_style: 'teamwork',
  team_dynamics: 'teamwork',
  knowledge_sharing: 'teamwork',
  initiative_taking: 'leadership',
  mentoring_interest: 'leadership',
  vision_setting: 'leadership',
};

// =====================================================
// SCORE DEDUCTIONS (From Stage-3)
// =====================================================

export const INTEGRITY_DEDUCTIONS: Record<string, number> = {
  NO_FACE: -2,
  MULTI_FACE: -15,
  FACE_LOST: -3,
  TAB_SWITCH: -5,
  WINDOW_BLUR: -2,
  COPY: -3,
  PASTE: -5,
  SHORTCUT_USED: -2,
  DEVTOOLS_ATTEMPT: -20,
  WEBCAM_DENIED: -10,
};

// =====================================================
// SCORING WEIGHTS (Default)
// =====================================================

export const DEFAULT_SCORING_WEIGHTS = {
  technical: 0.40,
  psychometric: 0.35,
  integrity: 0.25,
};

// Technical component weights
export const TECHNICAL_WEIGHTS = {
  coding: 0.50,
  mcq: 0.30,
  text: 0.20,
};

// Psychometric component weights
export const PSYCHOMETRIC_WEIGHTS = {
  sliders: 0.40,
  mcq: 0.35,
  text: 0.25,
};
