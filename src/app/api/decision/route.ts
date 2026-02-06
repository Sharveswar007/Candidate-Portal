// =====================================================
// TalentPulse - Stage-5 Decision Engine
// Rule-based Explainable Decision Making
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import Groq from 'groq-sdk';

export const runtime = 'nodejs';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});
export const maxDuration = 60;

// =====================================================
// TYPES
// =====================================================

type Decision = 'hire' | 'no_hire' | 'maybe' | 'manual_review';
type ResumeCategory = 'Shortlist' | 'Maybe' | 'Reject';

interface TriggeredRule {
  rule: string;
  passed: boolean;
  value: number | string;
  threshold: number | string;
  message?: string;
}

interface CompetencyAssessment {
  competency: string;
  score: number;
  label: string;
}

interface ExplanationFacts {
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

interface DecisionRequest {
  attempt_id: string;
  candidate_id: string;
  job_id?: string;
  technical_score: number;
  psychometric_score: number;
  integrity_score: number;
  composite_score: number;
  competency_scores: Record<string, number>;
  trait_scores?: Record<string, number>;
  resume_category?: ResumeCategory;
  resume_match_score?: number;
}

// =====================================================
// THRESHOLDS & LABELS
// =====================================================

const THRESHOLDS = {
  integrity_minimum: 60,
  hire: { technical: 70, psychometric: 60, integrity: 70 },
  maybe: { technical: 60, psychometric: 50, integrity: 65 },
  role: {
    leadership_low: 50,
    leadership_high: 70,
    teamwork_high: 70,
    technical_high: 80,
    technical_very_high: 85,
    problem_solving_high: 75,
  },
};

const STRENGTH_THRESHOLD = 70;
const WEAKNESS_THRESHOLD = 50;

const COMPETENCY_LABELS: Record<string, { strong: string; weak: string }> = {
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
// DECISION ENGINE
// =====================================================

function checkHardFilters(request: DecisionRequest): { 
  passed: boolean; 
  failed_filter?: string; 
  rule?: TriggeredRule 
} {
  // Rule 1: Integrity minimum
  if (request.integrity_score < THRESHOLDS.integrity_minimum) {
    return {
      passed: false,
      failed_filter: 'integrity_threshold',
      rule: {
        rule: 'integrity_threshold',
        passed: false,
        value: request.integrity_score,
        threshold: THRESHOLDS.integrity_minimum,
        message: 'Failed integrity threshold - potential cheating detected',
      },
    };
  }

  // Rule 2: Resume rejection
  if (request.resume_category === 'Reject') {
    return {
      passed: false,
      failed_filter: 'resume_reject',
      rule: {
        rule: 'resume_reject',
        passed: false,
        value: request.resume_category,
        threshold: 'Not Reject',
        message: 'Resume did not meet minimum qualifications',
      },
    };
  }

  return { passed: true };
}

function evaluateDecision(request: DecisionRequest): { 
  decision: Decision; 
  confidence: number; 
  rules: TriggeredRule[] 
} {
  const rules: TriggeredRule[] = [];
  
  // Check hire thresholds
  const techPass = request.technical_score >= THRESHOLDS.hire.technical;
  const psychPass = request.psychometric_score >= THRESHOLDS.hire.psychometric;
  const integrityPass = request.integrity_score >= THRESHOLDS.hire.integrity;

  rules.push(
    {
      rule: 'technical_minimum',
      passed: techPass,
      value: request.technical_score,
      threshold: THRESHOLDS.hire.technical,
    },
    {
      rule: 'psychometric_minimum',
      passed: psychPass,
      value: request.psychometric_score,
      threshold: THRESHOLDS.hire.psychometric,
    },
    {
      rule: 'integrity_minimum',
      passed: integrityPass,
      value: request.integrity_score,
      threshold: THRESHOLDS.hire.integrity,
    }
  );

  // Decision: HIRE
  if (techPass && psychPass && integrityPass) {
    const techExcess = request.technical_score - THRESHOLDS.hire.technical;
    const psychExcess = request.psychometric_score - THRESHOLDS.hire.psychometric;
    const integrityExcess = request.integrity_score - THRESHOLDS.hire.integrity;
    const avgExcess = (techExcess + psychExcess + integrityExcess) / 3;
    const confidence = Math.min(95, 70 + avgExcess);
    
    return { decision: 'hire', confidence, rules };
  }

  // Check maybe thresholds
  const techMaybe = request.technical_score >= THRESHOLDS.maybe.technical;
  const psychMaybe = request.psychometric_score >= THRESHOLDS.maybe.psychometric;
  const integrityMaybe = request.integrity_score >= THRESHOLDS.maybe.integrity;

  // Decision: MAYBE
  if (techMaybe && psychMaybe && integrityMaybe) {
    return { decision: 'maybe', confidence: 50, rules };
  }

  // Decision: NO HIRE
  return { decision: 'no_hire', confidence: 80, rules };
}

function recommendRole(request: DecisionRequest): { 
  role: string; 
  score: number; 
  reasoning: string 
} {
  const competencies = request.competency_scores || {};
  const leadership = competencies.leadership || 50;
  const teamwork = competencies.teamwork || 50;
  const problemSolving = competencies.problem_solving || 50;

  // Senior IC: Very high technical + problem solving
  if (
    request.technical_score > THRESHOLDS.role.technical_very_high &&
    problemSolving > THRESHOLDS.role.problem_solving_high
  ) {
    return {
      role: 'Senior Individual Contributor',
      score: 85,
      reasoning: 'Exceptional technical skills and problem-solving ability',
    };
  }

  // Team Lead Track: High leadership + teamwork
  if (
    leadership > THRESHOLDS.role.leadership_high &&
    teamwork > THRESHOLDS.role.teamwork_high
  ) {
    return {
      role: 'Team Lead Track',
      score: 80,
      reasoning: 'Strong leadership and teamwork competencies',
    };
  }

  // Individual Contributor: Low leadership + high technical
  if (
    leadership < THRESHOLDS.role.leadership_low &&
    request.technical_score > THRESHOLDS.role.technical_high
  ) {
    return {
      role: 'Individual Contributor',
      score: 75,
      reasoning: 'Strong technical skills, best suited for IC track',
    };
  }

  return {
    role: 'General Track',
    score: 60,
    reasoning: 'Balanced profile suitable for various roles',
  };
}

function analyzeCompetencies(competency_scores: Record<string, number>): {
  strengths: CompetencyAssessment[];
  weaknesses: CompetencyAssessment[];
} {
  const strengths: CompetencyAssessment[] = [];
  const weaknesses: CompetencyAssessment[] = [];

  for (const [competency, score] of Object.entries(competency_scores)) {
    const labels = COMPETENCY_LABELS[competency] || {
      strong: `Strong ${competency.replace(/_/g, ' ')}`,
      weak: `${competency.replace(/_/g, ' ')} needs improvement`,
    };

    if (score >= STRENGTH_THRESHOLD) {
      strengths.push({ competency, score, label: labels.strong });
    } else if (score < WEAKNESS_THRESHOLD) {
      weaknesses.push({ competency, score, label: labels.weak });
    }
  }

  strengths.sort((a, b) => b.score - a.score);
  weaknesses.sort((a, b) => a.score - b.score);

  return { strengths, weaknesses };
}

// =====================================================
// EXPLANATION GENERATOR
// =====================================================

async function generateExplanation(facts: ExplanationFacts): Promise<string> {
  const prompt = `You are an HR decision explainer. Generate a hiring rationale in exactly 4-5 concise sentences using ONLY the provided facts. Do not invent any scores.

FACTS:
- Technical Score: ${facts.technical_score}/100
- Psychometric Score: ${facts.psychometric_score}/100
- Integrity Score: ${facts.integrity_score}/100
- Overall Composite: ${facts.composite_score}/100
- Resume Category: ${facts.resume_category || 'Not evaluated'}
- Decision: ${facts.decision.toUpperCase().replace('_', ' ')}
- Key Strengths: ${facts.strong_competencies.length > 0 ? facts.strong_competencies.join(', ') : 'None identified'}
- Areas for Improvement: ${facts.weak_competencies.length > 0 ? facts.weak_competencies.join(', ') : 'None identified'}
${facts.role_recommendation ? `- Recommended Role: ${facts.role_recommendation}` : ''}
${facts.triggered_rules.length > 0 ? `- Failed Checks: ${facts.triggered_rules.join(', ')}` : ''}

Generate a professional, factual explanation of this hiring decision.`;

  try {
    console.log("\n🤖 ============================================");
    console.log("🤖 GENERATED WITH GROQ AI (Decision Explanation)");
    console.log("🤖 Model: llama-3.3-70b-versatile");
    console.log("🤖 ============================================\n");
    
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
      temperature: 0.3,
    });

    return response.choices[0]?.message?.content || generateFallbackExplanation(facts);
  } catch {
    return generateFallbackExplanation(facts);
  }
}

function generateFallbackExplanation(facts: ExplanationFacts): string {
  const lines: string[] = [];
  
  if (facts.decision === 'hire') {
    lines.push(`Candidate recommended for HIRE with a composite score of ${facts.composite_score}/100.`);
  } else if (facts.decision === 'no_hire') {
    lines.push(`Candidate NOT recommended for hire based on assessment results.`);
  } else {
    lines.push(`Candidate flagged for MANUAL REVIEW - borderline performance detected.`);
  }

  lines.push(
    `Technical: ${facts.technical_score}/100, Psychometric: ${facts.psychometric_score}/100, Integrity: ${facts.integrity_score}/100.`
  );

  if (facts.strong_competencies.length > 0) {
    lines.push(`Strengths: ${facts.strong_competencies.slice(0, 3).join(', ')}.`);
  }

  if (facts.weak_competencies.length > 0) {
    lines.push(`Areas for development: ${facts.weak_competencies.slice(0, 3).join(', ')}.`);
  }

  if (facts.role_recommendation) {
    lines.push(`Recommended track: ${facts.role_recommendation}.`);
  }

  return lines.join(' ');
}

// =====================================================
// API HANDLERS
// =====================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body: DecisionRequest = await request.json();

    // Accept either attempt_id or session_id
    const sessionId = body.attempt_id || (body as any).session_id;
    
    if (!sessionId || !body.candidate_id) {
      return NextResponse.json(
        { success: false, error: 'Missing attempt_id/session_id or candidate_id' },
        { status: 400 }
      );
    }

    // Set default values for missing scores
    const normalizedBody: DecisionRequest = {
      ...body,
      attempt_id: sessionId,
      technical_score: body.technical_score ?? 0,
      psychometric_score: body.psychometric_score ?? 0,
      integrity_score: body.integrity_score ?? 100,
      composite_score: body.composite_score ?? 0,
      competency_scores: body.competency_scores ?? {},
      trait_scores: body.trait_scores ?? {},
    };

    // Step 1: Check Hard Filters
    const hardFilterResult = checkHardFilters(normalizedBody);
    let decision: Decision;
    let confidence: number;
    let triggeredRules: TriggeredRule[] = [];

    if (!hardFilterResult.passed) {
      decision = 'no_hire';
      confidence = 95;
      if (hardFilterResult.rule) {
        triggeredRules.push(hardFilterResult.rule);
      }
    } else {
      // Step 2: Core Decision Logic
      const decisionResult = evaluateDecision(normalizedBody);
      decision = decisionResult.decision;
      confidence = decisionResult.confidence;
      triggeredRules = decisionResult.rules;
    }

    // Step 3: Role Recommendation
    const roleResult = recommendRole(normalizedBody);

    // Step 4: Strengths & Weaknesses
    const { strengths, weaknesses } = analyzeCompetencies(normalizedBody.competency_scores || {});

    // Step 5: Build Explanation Facts
    const explanationFacts: ExplanationFacts = {
      technical_score: normalizedBody.technical_score,
      psychometric_score: normalizedBody.psychometric_score,
      integrity_score: normalizedBody.integrity_score,
      composite_score: normalizedBody.composite_score,
      resume_category: normalizedBody.resume_category || null,
      strong_competencies: strengths.map((s) => s.competency),
      weak_competencies: weaknesses.map((w) => w.competency),
      decision,
      triggered_rules: triggeredRules.filter((r) => !r.passed).map((r) => r.rule),
      role_recommendation: roleResult.role,
    };

    // Step 6: Generate AI Explanation
    const aiExplanation = await generateExplanation(explanationFacts);

    // Step 7: Store Decision (using main schema.sql format)
    // Map decision to schema-compatible values
    const schemaDecision = decision === 'maybe' || decision === 'manual_review' 
      ? 'further_evaluation' 
      : decision;
      
    // Build record without optional columns that may not exist in schema
    const decisionRecord: Record<string, any> = {
      session_id: normalizedBody.attempt_id,
      candidate_id: normalizedBody.candidate_id,
      job_id: normalizedBody.job_id || null,
      decision: schemaDecision,
      confidence_score: confidence,
      overall_score: normalizedBody.composite_score,
      technical_score: normalizedBody.technical_score,
      psychometric_score: normalizedBody.psychometric_score,
      competency_scores: normalizedBody.competency_scores || {},
      strengths,
      weaknesses,
      rationale: aiExplanation,
    };
    
    // Add optional fields only if they might exist in schema
    // These will be ignored if columns don't exist due to our error handling below
    decisionRecord.role_fit = roleResult.role;

    // Try to insert decision
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('hiring_decisions') as any)
      .insert(decisionRecord)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Database error:', error);
      // Still return success with the decision data even if storage fails
      // This ensures the user sees their result
      return NextResponse.json({
        success: true,
        decision: {
          ...decisionRecord,
          id: normalizedBody.attempt_id,
          decision: schemaDecision,
        },
        explanation: aiExplanation,
        storage_error: error.message,
      });
    }

    return NextResponse.json({
      success: true,
      decision: data || decisionRecord,
      explanation: aiExplanation,
    });
  } catch (error) {
    console.error('Decision engine error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    
    const attempt_id = searchParams.get('attempt_id');
    const session_id = searchParams.get('session_id');
    const candidate_id = searchParams.get('candidate_id');
    const job_id = searchParams.get('job_id');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase.from('hiring_decisions') as any).select('*');

    if (attempt_id || session_id) {
      query = query.eq('session_id', attempt_id || session_id);
    } else if (candidate_id) {
      query = query.eq('candidate_id', candidate_id);
    } else if (job_id) {
      query = query.eq('job_id', job_id);
    } else {
      query = query.order('created_at', { ascending: false }).limit(100);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch decisions' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, decisions: data });
  } catch (error) {
    console.error('Fetch decisions error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
