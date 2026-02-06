// =====================================================
// TalentPulse - Technical Scoring Service
// Evaluates coding, technical MCQs, and technical text
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Groq from 'groq-sdk';
import type {
  CodingResult,
  TextEvaluation,
  MCQResponse,
  TechnicalRubric,
  Competency,
  QuestionContribution,
  TECHNICAL_WEIGHTS,
} from '@/types/scoring';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// =====================================================
// RUBRIC FOR TECHNICAL TEXT EVALUATION
// =====================================================

const TECHNICAL_RUBRIC = `
You are an expert technical interviewer evaluating a candidate's written response.

Evaluate the response using this rubric (score each 0-5):

1. **Clarity (0-5)**
   - 5: Crystal clear, well-organized, easy to follow
   - 4: Clear with minor issues
   - 3: Understandable but could be clearer
   - 2: Confusing structure or explanation
   - 1: Very difficult to understand
   - 0: Incomprehensible or blank

2. **Correctness (0-5)**
   - 5: Fully correct, demonstrates deep understanding
   - 4: Mostly correct with minor inaccuracies
   - 3: Partially correct, some errors
   - 2: More wrong than right
   - 1: Mostly incorrect
   - 0: Completely wrong or irrelevant

3. **Depth (0-5)**
   - 5: Exceptional depth, covers edge cases and nuances
   - 4: Good depth, covers main points well
   - 3: Adequate depth, covers basics
   - 2: Shallow, misses important points
   - 1: Very superficial
   - 0: No meaningful content

IMPORTANT: Return ONLY valid JSON in this exact format:
{
  "clarity": {"score": <0-5>, "feedback": "<brief feedback>"},
  "correctness": {"score": <0-5>, "feedback": "<brief feedback>"},
  "depth": {"score": <0-5>, "feedback": "<brief feedback>"},
  "overall_feedback": "<2-3 sentence summary>"
}
`;

// =====================================================
// HELPER: Evaluate text with LLM
// =====================================================

async function evaluateTextAnswer(
  questionText: string,
  answerText: string,
  competency: Competency
): Promise<{
  rubric_scores: TechnicalRubric;
  total_score: number;
  overall_feedback: string;
}> {
  // Handle empty or very short answers
  if (!answerText || answerText.trim().length < 10) {
    return {
      rubric_scores: {
        clarity: { score: 0, max: 5, feedback: 'No meaningful response provided' },
        correctness: { score: 0, max: 5, feedback: 'Cannot evaluate empty answer' },
        depth: { score: 0, max: 5, feedback: 'No content to evaluate' },
      },
      total_score: 0,
      overall_feedback: 'The answer was too short or empty to evaluate.',
    };
  }

  try {
    console.log("\n🤖 ============================================");
    console.log("🤖 GENERATED WITH GROQ AI (Technical Scoring)");
    console.log("🤖 Model: llama-3.3-70b-versatile");
    console.log("🤖 Competency:", competency);
    console.log("🤖 ============================================\n");
    
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: TECHNICAL_RUBRIC },
        {
          role: 'user',
          content: `
Question: ${questionText}

Candidate's Answer: ${answerText}

Competency being assessed: ${competency}

Evaluate this response and return the JSON rubric scores.
          `.trim(),
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const content = completion.choices[0]?.message?.content || '';
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in LLM response');
    }

    const result = JSON.parse(jsonMatch[0]);

    // Calculate total score (average of rubric scores, normalized to 0-100)
    const clarityScore = Math.min(5, Math.max(0, result.clarity?.score || 0));
    const correctnessScore = Math.min(5, Math.max(0, result.correctness?.score || 0));
    const depthScore = Math.min(5, Math.max(0, result.depth?.score || 0));
    
    const totalScore = ((clarityScore + correctnessScore + depthScore) / 15) * 100;

    return {
      rubric_scores: {
        clarity: { score: clarityScore, max: 5, feedback: result.clarity?.feedback || '' },
        correctness: { score: correctnessScore, max: 5, feedback: result.correctness?.feedback || '' },
        depth: { score: depthScore, max: 5, feedback: result.depth?.feedback || '' },
      },
      total_score: Math.round(totalScore * 100) / 100,
      overall_feedback: result.overall_feedback || '',
    };
  } catch (error) {
    console.error('LLM evaluation error:', error);
    // Return neutral scores on error
    return {
      rubric_scores: {
        clarity: { score: 2.5, max: 5, feedback: 'Evaluation error - neutral score assigned' },
        correctness: { score: 2.5, max: 5, feedback: 'Evaluation error - neutral score assigned' },
        depth: { score: 2.5, max: 5, feedback: 'Evaluation error - neutral score assigned' },
      },
      total_score: 50,
      overall_feedback: 'An error occurred during evaluation. Neutral score assigned.',
    };
  }
}

// =====================================================
// HELPER: Calculate coding score
// =====================================================

function calculateCodingScore(results: CodingResult[]): {
  score: number;
  problems_attempted: number;
  problems_passed: number;
  total_tests: number;
  passed_tests: number;
  contributions: QuestionContribution[];
} {
  if (!results || results.length === 0) {
    return {
      score: 0,
      problems_attempted: 0,
      problems_passed: 0,
      total_tests: 0,
      passed_tests: 0,
      contributions: [],
    };
  }

  let totalTests = 0;
  let passedTests = 0;
  let problemsPassed = 0;
  const contributions: QuestionContribution[] = [];

  for (const result of results) {
    totalTests += result.total_test_cases;
    passedTests += result.passed_test_cases;
    
    if (result.passed) {
      problemsPassed++;
    }

    const problemScore = result.total_test_cases > 0
      ? (result.passed_test_cases / result.total_test_cases) * 100
      : 0;

    contributions.push({
      question_id: result.problem_id,
      question_type: 'coding',
      score: problemScore,
      max_score: 100,
      competency: result.competency || 'coding_fundamentals',
      details: {
        passed_tests: result.passed_test_cases,
        total_tests: result.total_test_cases,
        runtime_ms: result.runtime_ms,
        language: result.language,
        failed_cases: result.failed_cases,
      },
    });
  }

  const score = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

  return {
    score: Math.round(score * 100) / 100,
    problems_attempted: results.length,
    problems_passed: problemsPassed,
    total_tests: totalTests,
    passed_tests: passedTests,
    contributions,
  };
}

// =====================================================
// HELPER: Calculate MCQ score
// =====================================================

function calculateMCQScore(responses: MCQResponse[]): {
  score: number;
  contributions: QuestionContribution[];
} {
  const technicalMCQs = responses.filter(r => r.question_type === 'technical_mcq');
  
  if (technicalMCQs.length === 0) {
    return { score: 0, contributions: [] };
  }

  let correctCount = 0;
  const contributions: QuestionContribution[] = [];

  for (const mcq of technicalMCQs) {
    const isCorrect = mcq.is_correct === true;
    if (isCorrect) correctCount++;

    contributions.push({
      question_id: mcq.question_id,
      question_type: 'technical_mcq',
      score: isCorrect ? 100 : 0,
      max_score: 100,
      competency: mcq.competency || 'problem_solving',
      details: {
        selected_option: mcq.selected_option,
        correct_option: mcq.correct_option,
        is_correct: isCorrect,
      },
    });
  }

  const score = (correctCount / technicalMCQs.length) * 100;

  return {
    score: Math.round(score * 100) / 100,
    contributions,
  };
}

// =====================================================
// POST: Score technical components
// =====================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      attempt_id,
      coding_results,
      mcq_responses,
      text_answers,
    } = body;

    if (!attempt_id) {
      return NextResponse.json({ error: 'attempt_id is required' }, { status: 400 });
    }

    // 1. Calculate coding score
    const codingResult = calculateCodingScore(coding_results || []);

    // 2. Calculate MCQ score
    const mcqResult = calculateMCQScore(mcq_responses || []);

    // 3. Evaluate text answers with LLM
    const textEvaluations: TextEvaluation[] = [];
    let textScoreSum = 0;

    if (text_answers && text_answers.length > 0) {
      for (const textAnswer of text_answers) {
        if (textAnswer.question_type !== 'technical_text') continue;

        const evaluation = await evaluateTextAnswer(
          textAnswer.question_text,
          textAnswer.answer_text,
          textAnswer.competency || 'communication'
        );

        const textEval: TextEvaluation = {
          question_id: textAnswer.question_id,
          question_index: textAnswer.question_index || 0,
          question_type: 'technical_text',
          question_text: textAnswer.question_text,
          answer_text: textAnswer.answer_text,
          word_count: textAnswer.answer_text?.split(/\s+/).length || 0,
          rubric_scores: evaluation.rubric_scores,
          total_score: evaluation.total_score,
          overall_feedback: evaluation.overall_feedback,
          competency: textAnswer.competency || 'communication',
          model_used: 'llama-3.3-70b-versatile',
          evaluated_at: new Date().toISOString(),
        };

        textEvaluations.push(textEval);
        textScoreSum += evaluation.total_score;

        // Store evaluation in database
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rubric = textEval.rubric_scores as any;
        await (supabase.from('text_evaluations') as any).upsert({
          attempt_id,
          candidate_id: user.id,
          question_id: textEval.question_id,
          question_index: textEval.question_index,
          question_type: textEval.question_type,
          question_text: textEval.question_text,
          answer_text: textEval.answer_text,
          word_count: textEval.word_count,
          clarity_score: rubric.clarity?.score,
          correctness_score: rubric.correctness?.score,
          depth_score: rubric.depth?.score,
          total_score: textEval.total_score,
          clarity_feedback: rubric.clarity?.feedback,
          correctness_feedback: rubric.correctness?.feedback,
          depth_feedback: rubric.depth?.feedback,
          overall_feedback: textEval.overall_feedback,
          competency: textEval.competency,
          model_used: textEval.model_used,
          evaluated_at: textEval.evaluated_at,
        }, { onConflict: 'attempt_id,question_id' });
      }
    }

    const textScore = textEvaluations.length > 0
      ? textScoreSum / textEvaluations.length
      : 0;

    // 4. Calculate weighted technical score
    const weights = {
      coding: 0.50,
      mcq: 0.30,
      text: 0.20,
    };

    // Adjust weights if components are missing
    let totalWeight = 0;
    let weightedSum = 0;

    if (coding_results && coding_results.length > 0) {
      weightedSum += codingResult.score * weights.coding;
      totalWeight += weights.coding;
    }
    if (mcq_responses && mcq_responses.length > 0) {
      weightedSum += mcqResult.score * weights.mcq;
      totalWeight += weights.mcq;
    }
    if (textEvaluations.length > 0) {
      weightedSum += textScore * weights.text;
      totalWeight += weights.text;
    }

    const technicalScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

    // 5. Build question contributions
    const allContributions = [
      ...codingResult.contributions,
      ...mcqResult.contributions,
      ...textEvaluations.map(te => ({
        question_id: te.question_id,
        question_type: 'technical_text' as const,
        score: te.total_score,
        max_score: 100,
        competency: te.competency,
        details: {
          rubric_scores: te.rubric_scores,
          word_count: te.word_count,
        },
      })),
    ];

    // 6. Calculate competency scores from contributions
    const competencyScores: Record<string, { sum: number; count: number }> = {};
    
    for (const contrib of allContributions) {
      if (!competencyScores[contrib.competency]) {
        competencyScores[contrib.competency] = { sum: 0, count: 0 };
      }
      competencyScores[contrib.competency].sum += contrib.score;
      competencyScores[contrib.competency].count += 1;
    }

    const finalCompetencyScores: Record<string, number> = {};
    for (const [competency, data] of Object.entries(competencyScores)) {
      finalCompetencyScores[competency] = Math.round((data.sum / data.count) * 100) / 100;
    }

    const result = {
      technical_score: Math.round(technicalScore * 100) / 100,
      coding_score: codingResult.score,
      technical_mcq_score: mcqResult.score,
      technical_text_score: Math.round(textScore * 100) / 100,
      coding_problems_attempted: codingResult.problems_attempted,
      coding_problems_passed: codingResult.problems_passed,
      total_test_cases: codingResult.total_tests,
      passed_test_cases: codingResult.passed_tests,
      question_contributions: allContributions,
      competency_scores: finalCompetencyScores,
      text_evaluations: textEvaluations,
    };

    return NextResponse.json({
      success: true,
      ...result,
    });

  } catch (error) {
    console.error('Technical scoring error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Scoring failed' 
      },
      { status: 500 }
    );
  }
}
