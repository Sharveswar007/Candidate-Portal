// =====================================================
// TalentPulse - Stage-4 Scoring Orchestrator
// Main API that combines Technical + Psychometric + Integrity
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type {
  AssessmentScore,
  ScoringRequest,
  CompetencyScores,
  TraitScores,
  QuestionContribution,
  TextEvaluation,
  DEFAULT_SCORING_WEIGHTS,
} from '@/types/scoring';

// =====================================================
// HELPER: Fetch integrity score from Stage-3
// =====================================================

async function getIntegrityScore(
  supabase: Awaited<ReturnType<typeof createClient>>,
  attemptId: string
): Promise<{ score: number; risk_level: string }> {
  // Get from integrity_scores table (Stage-3)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase
    .from('integrity_scores') as any)
    .select('integrity_score, risk_level')
    .eq('attempt_id', attemptId)
    .single() as { data: { integrity_score: number; risk_level: string } | null };

  if (data) {
    return {
      score: data.integrity_score || 100,
      risk_level: data.risk_level || 'low',
    };
  }

  // Fallback: Calculate from proctor_events
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: events } = await (supabase
    .from('proctor_events') as any)
    .select('event_type, severity')
    .eq('attempt_id', attemptId) as { data: Array<{ event_type: string; severity: string }> | null };

  if (!events || events.length === 0) {
    return { score: 100, risk_level: 'low' };
  }

  // Calculate score based on events
  let score = 100;
  const deductions: Record<string, number> = {
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

  for (const event of events) {
    const deduction = deductions[event.event_type] || 0;
    score += deduction;
  }

  score = Math.max(0, Math.min(100, score));

  const risk_level = score >= 80 ? 'low' 
    : score >= 60 ? 'medium' 
    : score >= 40 ? 'high' 
    : 'critical';

  return { score, risk_level };
}

// =====================================================
// HELPER: Merge competency scores from multiple sources
// =====================================================

function mergeCompetencyScores(
  technical: Record<string, number>,
  psychometric: Record<string, number>
): CompetencyScores {
  const merged: CompetencyScores = {};
  const allKeys = new Set([...Object.keys(technical), ...Object.keys(psychometric)]);

  for (const key of allKeys) {
    const techScore = technical[key];
    const psychScore = psychometric[key];

    if (techScore !== undefined && psychScore !== undefined) {
      // Average if both exist
      merged[key as keyof CompetencyScores] = Math.round(((techScore + psychScore) / 2) * 100) / 100;
    } else {
      merged[key as keyof CompetencyScores] = techScore ?? psychScore ?? 0;
    }
  }

  return merged;
}

// =====================================================
// HELPER: Calculate composite score
// =====================================================

function calculateCompositeScore(
  technical: number,
  psychometric: number,
  integrity: number,
  weights: { technical: number; psychometric: number; integrity: number }
): number {
  const composite = 
    (technical * weights.technical) +
    (psychometric * weights.psychometric) +
    (integrity * weights.integrity);
  
  return Math.round(composite * 100) / 100;
}

// =====================================================
// POST: Calculate all scores for an attempt
// =====================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the origin from the request to make internal API calls
    // Use host header for more reliable origin detection
    const host = request.headers.get('host') || 'localhost:3001';
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const origin = `${protocol}://${host}`;
    console.log('[Scoring] Using origin for internal calls:', origin);

    const body: ScoringRequest = await request.json();
    const {
      attempt_id,
      candidate_id,
      session_id,
      job_id,
      coding_answers,
      mcq_answers,
      text_answers,
      slider_responses,
      scoring_weights,
    } = body;

    if (!attempt_id) {
      return NextResponse.json({ error: 'attempt_id is required' }, { status: 400 });
    }

    const weights = scoring_weights || {
      technical: 0.40,
      psychometric: 0.35,
      integrity: 0.25,
    };

    // Initialize or update status to processing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('assessment_scores') as any).upsert({
      attempt_id,
      candidate_id: candidate_id || user.id,
      session_id,
      job_id,
      status: 'processing',
      scoring_weights: weights,
      created_at: new Date().toISOString(),
    }, { onConflict: 'attempt_id' });

    // =====================================================
    // 1. CALCULATE TECHNICAL SCORE
    // =====================================================

    let technicalResult = {
      technical_score: 0,
      coding_score: 0,
      technical_mcq_score: 0,
      technical_text_score: 0,
      coding_problems_attempted: 0,
      coding_problems_passed: 0,
      total_test_cases: 0,
      passed_test_cases: 0,
      question_contributions: [] as QuestionContribution[],
      competency_scores: {} as Record<string, number>,
      text_evaluations: [] as TextEvaluation[],
    };

    // Call technical scoring endpoint
    const technicalResponse = await fetch(
      `${origin}/api/scoring/technical`,
      {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('cookie') || '',
        },
        body: JSON.stringify({
          attempt_id,
          coding_results: coding_answers?.map((ca, idx) => ({
            problem_id: ca.problem_id,
            problem_index: idx,
            language: ca.language,
            code: ca.code,
            passed: ca.test_results?.every(t => t.passed) || false,
            passed_test_cases: ca.test_results?.filter(t => t.passed).length || 0,
            total_test_cases: ca.test_results?.length || 0,
            test_results: ca.test_results || [],
            failed_cases: ca.test_results?.filter(t => !t.passed) || [],
            competency: 'coding_fundamentals',
          })),
          mcq_responses: mcq_answers?.filter(m => m.question_type === 'technical_mcq'),
          text_answers: text_answers?.filter(t => t.question_type === 'technical_text'),
        }),
      }
    );

    if (technicalResponse.ok) {
      const techData = await technicalResponse.json();
      if (techData.success) {
        technicalResult = { ...technicalResult, ...techData };
      } else {
        console.error('[Scoring] Technical scoring returned error:', techData.error);
      }
    } else {
      const errorText = await technicalResponse.text().catch(() => 'Unknown error');
      console.error('[Scoring] Technical scoring failed:', technicalResponse.status, errorText);
    }

    // =====================================================
    // 2. CALCULATE PSYCHOMETRIC SCORE
    // =====================================================

    let psychometricResult = {
      psychometric_score: 0,
      slider_score: 0,
      psych_mcq_score: 0,
      psych_text_score: 0,
      trait_scores: {
        emotional_intelligence: 0,
        resilience: 0,
        teamwork: 0,
        leadership: 0,
      } as TraitScores,
      question_contributions: [] as QuestionContribution[],
      competency_scores: {} as Record<string, number>,
      text_evaluations: [] as TextEvaluation[],
    };

    // Call psychometric scoring endpoint
    const psychResponse = await fetch(
      `${origin}/api/scoring/psychometric`,
      {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('cookie') || '',
        },
        body: JSON.stringify({
          attempt_id,
          slider_values: slider_responses,
          mcq_responses: mcq_answers?.filter(m => m.question_type === 'psychometric_mcq'),
          text_answers: text_answers?.filter(t => t.question_type === 'behavioral_text'),
        }),
      }
    );

    if (psychResponse.ok) {
      const psychData = await psychResponse.json();
      if (psychData.success) {
        psychometricResult = { ...psychometricResult, ...psychData };
      } else {
        console.error('[Scoring] Psychometric scoring returned error:', psychData.error);
      }
    } else {
      const errorText = await psychResponse.text().catch(() => 'Unknown error');
      console.error('[Scoring] Psychometric scoring failed:', psychResponse.status, errorText);
    }

    // =====================================================
    // 3. GET INTEGRITY SCORE (From Stage-3)
    // =====================================================

    const integrityResult = await getIntegrityScore(supabase, attempt_id);

    // =====================================================
    // 4. MERGE AND CALCULATE COMPOSITE
    // =====================================================

    const mergedCompetencies = mergeCompetencyScores(
      technicalResult.competency_scores,
      psychometricResult.competency_scores
    );

    const compositeScore = calculateCompositeScore(
      technicalResult.technical_score,
      psychometricResult.psychometric_score,
      integrityResult.score,
      weights
    );

    // Merge all question contributions
    const allContributions = [
      ...technicalResult.question_contributions,
      ...psychometricResult.question_contributions,
    ];

    // Merge all LLM evaluations
    const allEvaluations = [
      ...technicalResult.text_evaluations,
      ...psychometricResult.text_evaluations,
    ];

    // =====================================================
    // 5. STORE FINAL SCORES
    // =====================================================

    const finalScore: Partial<AssessmentScore> = {
      attempt_id,
      candidate_id: candidate_id || user.id,
      session_id,
      job_id,
      
      // Core scores
      technical_score: technicalResult.technical_score,
      psychometric_score: psychometricResult.psychometric_score,
      integrity_score: integrityResult.score,
      composite_score: compositeScore,
      
      // Technical breakdown
      coding_score: technicalResult.coding_score,
      technical_mcq_score: technicalResult.technical_mcq_score,
      technical_text_score: technicalResult.technical_text_score,
      coding_problems_attempted: technicalResult.coding_problems_attempted,
      coding_problems_passed: technicalResult.coding_problems_passed,
      total_test_cases: technicalResult.total_test_cases,
      passed_test_cases: technicalResult.passed_test_cases,
      
      // Psychometric breakdown
      trait_scores: psychometricResult.trait_scores,
      psych_mcq_score: psychometricResult.psych_mcq_score,
      psych_text_score: psychometricResult.psych_text_score,
      slider_score: psychometricResult.slider_score,
      
      // Competencies
      competency_scores: mergedCompetencies,
      
      // Traceability
      question_contributions: allContributions,
      llm_evaluations: allEvaluations,
      
      // Metadata
      scoring_version: '1.0',
      scoring_weights: weights,
      status: 'completed',
      calculated_at: new Date().toISOString(),
    };

    // Upsert to database
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: upsertError } = await (supabase
      .from('assessment_scores') as any)
      .upsert(finalScore, { onConflict: 'attempt_id' });

    if (upsertError) {
      console.error('Score storage error:', upsertError);
      
      // Update status to failed
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase
        .from('assessment_scores') as any)
        .update({ status: 'failed', error_message: upsertError.message })
        .eq('attempt_id', attempt_id);

      return NextResponse.json(
        { success: false, error: 'Failed to store scores' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      score: finalScore,
      summary: {
        technical_score: technicalResult.technical_score,
        psychometric_score: psychometricResult.psychometric_score,
        integrity_score: integrityResult.score,
        integrity_risk_level: integrityResult.risk_level,
        composite_score: compositeScore,
        competency_count: Object.keys(mergedCompetencies).length,
        questions_scored: allContributions.length,
      },
    });

  } catch (error) {
    console.error('Scoring orchestration error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Scoring failed' 
      },
      { status: 500 }
    );
  }
}

// =====================================================
// GET: Retrieve scores for an attempt
// =====================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const attemptId = searchParams.get('attempt_id');
    const candidateId = searchParams.get('candidate_id');

    if (!attemptId && !candidateId) {
      return NextResponse.json(
        { error: 'attempt_id or candidate_id required' },
        { status: 400 }
      );
    }

    // Check if user is staff (can view all) or candidate (own only)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase
      .from('profiles') as any)
      .select('role')
      .eq('id', user.id)
      .single() as { data: { role: string } | null };

    const isStaff = profile?.role === 'recruiter' || profile?.role === 'admin';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase.from('assessment_scores') as any).select('*');

    if (attemptId) {
      query = query.eq('attempt_id', attemptId);
    } else if (candidateId) {
      query = query.eq('candidate_id', candidateId);
    }

    // Non-staff can only see their own
    if (!isStaff) {
      query = query.eq('candidate_id', user.id);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      scores: data,
    });

  } catch (error) {
    console.error('Score retrieval error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Retrieval failed' },
      { status: 500 }
    );
  }
}
