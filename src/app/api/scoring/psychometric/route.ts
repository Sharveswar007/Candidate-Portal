// =====================================================
// TalentPulse - Psychometric Scoring Service
// Evaluates sliders, psychometric MCQs, and behavioral text
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Groq from 'groq-sdk';
import type {
  TextEvaluation,
  MCQResponse,
  BehavioralRubric,
  TraitScores,
  PsychTrait,
  Competency,
  QuestionContribution,
  SLIDER_TRAIT_MAPPING,
} from '@/types/scoring';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// =====================================================
// SLIDER TO TRAIT MAPPING
// =====================================================

const SLIDER_TRAIT_MAP: Record<string, PsychTrait> = {
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
// RUBRIC FOR BEHAVIORAL TEXT EVALUATION
// =====================================================

const BEHAVIORAL_RUBRIC = `
You are an expert HR psychologist evaluating a candidate's behavioral/situational response.

Evaluate the response using this rubric (score each 0-5):

1. **Clarity (0-5)**
   - How well-structured and understandable is the response?
   - 5: Exceptionally clear, logical flow
   - 3: Adequate clarity
   - 0: Confusing or incomprehensible

2. **Empathy (0-5)**
   - Does the candidate show understanding of others' perspectives?
   - 5: Deep emotional intelligence, considers multiple stakeholders
   - 3: Shows basic awareness of others
   - 0: Self-centered or dismissive

3. **Professionalism (0-5)**
   - Is the approach mature, ethical, and workplace-appropriate?
   - 5: Highly professional, ethical decision-making
   - 3: Acceptable professional standards
   - 0: Unprofessional or unethical

4. **Depth (0-5)**
   - Does the response show thoughtful analysis?
   - 5: Considers consequences, alternatives, and nuances
   - 3: Basic problem-solving approach
   - 0: Superficial or no analysis

IMPORTANT: Return ONLY valid JSON in this exact format:
{
  "clarity": {"score": <0-5>, "feedback": "<brief feedback>"},
  "empathy": {"score": <0-5>, "feedback": "<brief feedback>"},
  "professionalism": {"score": <0-5>, "feedback": "<brief feedback>"},
  "depth": {"score": <0-5>, "feedback": "<brief feedback>"},
  "overall_feedback": "<2-3 sentence summary of behavioral profile>"
}
`;

// =====================================================
// HELPER: Evaluate behavioral text with LLM
// =====================================================

async function evaluateBehavioralAnswer(
  questionText: string,
  answerText: string,
  competency: Competency
): Promise<{
  rubric_scores: BehavioralRubric;
  total_score: number;
  overall_feedback: string;
}> {
  // Handle empty or very short answers
  if (!answerText || answerText.trim().length < 10) {
    return {
      rubric_scores: {
        clarity: { score: 0, max: 5, feedback: 'No meaningful response provided' },
        empathy: { score: 0, max: 5, feedback: 'Cannot evaluate empty answer' },
        professionalism: { score: 0, max: 5, feedback: 'No content to evaluate' },
        depth: { score: 0, max: 5, feedback: 'No content to evaluate' },
      },
      total_score: 0,
      overall_feedback: 'The answer was too short or empty to evaluate.',
    };
  }

  try {
    console.log("\n🤖 ============================================");
    console.log("🤖 GENERATED WITH GROQ AI (Psychometric Scoring)");
    console.log("🤖 Model: llama-3.3-70b-versatile");
    console.log("🤖 Competency:", competency);
    console.log("🤖 ============================================\n");
    
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: BEHAVIORAL_RUBRIC },
        {
          role: 'user',
          content: `
Behavioral/Situational Question: ${questionText}

Candidate's Response: ${answerText}

Competency being assessed: ${competency}

Evaluate this behavioral response and return the JSON rubric scores.
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
    const empathyScore = Math.min(5, Math.max(0, result.empathy?.score || 0));
    const professionalismScore = Math.min(5, Math.max(0, result.professionalism?.score || 0));
    const depthScore = Math.min(5, Math.max(0, result.depth?.score || 0));
    
    const totalScore = ((clarityScore + empathyScore + professionalismScore + depthScore) / 20) * 100;

    return {
      rubric_scores: {
        clarity: { score: clarityScore, max: 5, feedback: result.clarity?.feedback || '' },
        empathy: { score: empathyScore, max: 5, feedback: result.empathy?.feedback || '' },
        professionalism: { score: professionalismScore, max: 5, feedback: result.professionalism?.feedback || '' },
        depth: { score: depthScore, max: 5, feedback: result.depth?.feedback || '' },
      },
      total_score: Math.round(totalScore * 100) / 100,
      overall_feedback: result.overall_feedback || '',
    };
  } catch (error) {
    console.error('LLM behavioral evaluation error:', error);
    return {
      rubric_scores: {
        clarity: { score: 2.5, max: 5, feedback: 'Evaluation error - neutral score assigned' },
        empathy: { score: 2.5, max: 5, feedback: 'Evaluation error - neutral score assigned' },
        professionalism: { score: 2.5, max: 5, feedback: 'Evaluation error - neutral score assigned' },
        depth: { score: 2.5, max: 5, feedback: 'Evaluation error - neutral score assigned' },
      },
      total_score: 50,
      overall_feedback: 'An error occurred during evaluation. Neutral score assigned.',
    };
  }
}

// =====================================================
// HELPER: Calculate trait scores from sliders
// =====================================================

function calculateTraitScores(sliderValues: Record<string, number>): {
  trait_scores: TraitScores;
  slider_score: number;
  contributions: QuestionContribution[];
} {
  const traitSums: Record<PsychTrait, number> = {
    emotional_intelligence: 0,
    resilience: 0,
    teamwork: 0,
    leadership: 0,
  };
  
  const traitCounts: Record<PsychTrait, number> = {
    emotional_intelligence: 0,
    resilience: 0,
    teamwork: 0,
    leadership: 0,
  };

  const contributions: QuestionContribution[] = [];

  for (const [slider, value] of Object.entries(sliderValues)) {
    const trait = SLIDER_TRAIT_MAP[slider];
    if (trait) {
      traitSums[trait] += value;
      traitCounts[trait] += 1;

      contributions.push({
        question_id: `slider_${slider}`,
        question_type: 'slider',
        score: value,
        max_score: 100,
        competency: trait as Competency,
        details: {
          slider_name: slider,
          mapped_trait: trait,
        },
      });
    }
  }

  const trait_scores: TraitScores = {
    emotional_intelligence: traitCounts.emotional_intelligence > 0
      ? Math.round((traitSums.emotional_intelligence / traitCounts.emotional_intelligence) * 100) / 100
      : 0,
    resilience: traitCounts.resilience > 0
      ? Math.round((traitSums.resilience / traitCounts.resilience) * 100) / 100
      : 0,
    teamwork: traitCounts.teamwork > 0
      ? Math.round((traitSums.teamwork / traitCounts.teamwork) * 100) / 100
      : 0,
    leadership: traitCounts.leadership > 0
      ? Math.round((traitSums.leadership / traitCounts.leadership) * 100) / 100
      : 0,
  };

  // Overall slider score is the average of all trait scores
  const traitValues = Object.values(trait_scores);
  const slider_score = traitValues.length > 0
    ? Math.round((traitValues.reduce((a, b) => a + b, 0) / traitValues.length) * 100) / 100
    : 0;

  return { trait_scores, slider_score, contributions };
}

// =====================================================
// HELPER: Calculate psychometric MCQ score
// =====================================================

function calculatePsychMCQScore(responses: MCQResponse[]): {
  score: number;
  trait_impacts: Record<PsychTrait, number[]>;
  contributions: QuestionContribution[];
} {
  const psychMCQs = responses.filter(r => r.question_type === 'psychometric_mcq');
  
  if (psychMCQs.length === 0) {
    return { 
      score: 0, 
      trait_impacts: {
        emotional_intelligence: [],
        resilience: [],
        teamwork: [],
        leadership: [],
      },
      contributions: [] 
    };
  }

  // Valence scoring: positive = 100, neutral = 50, negative = 0
  const valenceScores: Record<string, number> = {
    positive: 100,
    neutral: 50,
    negative: 0,
  };

  let totalScore = 0;
  const trait_impacts: Record<PsychTrait, number[]> = {
    emotional_intelligence: [],
    resilience: [],
    teamwork: [],
    leadership: [],
  };
  const contributions: QuestionContribution[] = [];

  for (const mcq of psychMCQs) {
    const valence = mcq.option_valence || 'neutral';
    const score = valenceScores[valence] ?? 50;
    totalScore += score;

    // Track trait impact
    if (mcq.mapped_trait && trait_impacts[mcq.mapped_trait]) {
      trait_impacts[mcq.mapped_trait].push(score);
    }

    contributions.push({
      question_id: mcq.question_id,
      question_type: 'psychometric_mcq',
      score: score,
      max_score: 100,
      competency: (mcq.mapped_trait as Competency) || 'decision_making',
      details: {
        selected_option: mcq.selected_option,
        option_valence: valence,
        mapped_trait: mcq.mapped_trait,
      },
    });
  }

  const avgScore = totalScore / psychMCQs.length;

  return {
    score: Math.round(avgScore * 100) / 100,
    trait_impacts,
    contributions,
  };
}

// =====================================================
// POST: Score psychometric components
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
      slider_values,
      mcq_responses,
      text_answers,
    } = body;

    if (!attempt_id) {
      return NextResponse.json({ error: 'attempt_id is required' }, { status: 400 });
    }

    // 1. Calculate slider scores
    const sliderResult = slider_values && Object.keys(slider_values).length > 0
      ? calculateTraitScores(slider_values)
      : { trait_scores: { emotional_intelligence: 0, resilience: 0, teamwork: 0, leadership: 0 }, slider_score: 0, contributions: [] };

    // Store slider responses
    if (slider_values && Object.keys(slider_values).length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('slider_responses') as any).upsert({
        attempt_id,
        candidate_id: user.id,
        slider_values,
        trait_scores: sliderResult.trait_scores,
        emotional_intelligence: sliderResult.trait_scores.emotional_intelligence,
        resilience: sliderResult.trait_scores.resilience,
        teamwork: sliderResult.trait_scores.teamwork,
        leadership: sliderResult.trait_scores.leadership,
        slider_score: sliderResult.slider_score,
        submitted_at: new Date().toISOString(),
      }, { onConflict: 'attempt_id' });
    }

    // 2. Calculate psychometric MCQ score
    const mcqResult = calculatePsychMCQScore(mcq_responses || []);

    // Adjust trait scores based on MCQ responses
    const adjustedTraitScores = { ...sliderResult.trait_scores };
    for (const [trait, impacts] of Object.entries(mcqResult.trait_impacts)) {
      if (impacts.length > 0) {
        const mcqTraitScore = impacts.reduce((a, b) => a + b, 0) / impacts.length;
        // Blend slider and MCQ trait scores (70% slider, 30% MCQ)
        const currentScore = adjustedTraitScores[trait as PsychTrait] || 0;
        adjustedTraitScores[trait as PsychTrait] = Math.round(
          (currentScore * 0.7 + mcqTraitScore * 0.3) * 100
        ) / 100;
      }
    }

    // 3. Evaluate behavioral text answers with LLM
    const textEvaluations: TextEvaluation[] = [];
    let textScoreSum = 0;

    if (text_answers && text_answers.length > 0) {
      for (const textAnswer of text_answers) {
        if (textAnswer.question_type !== 'behavioral_text') continue;

        const evaluation = await evaluateBehavioralAnswer(
          textAnswer.question_text,
          textAnswer.answer_text,
          textAnswer.competency || 'communication'
        );

        const textEval: TextEvaluation = {
          question_id: textAnswer.question_id,
          question_index: textAnswer.question_index || 0,
          question_type: 'behavioral_text',
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
        await (supabase.from('text_evaluations') as any).upsert({
          attempt_id,
          candidate_id: user.id,
          question_id: textEval.question_id,
          question_index: textEval.question_index,
          question_type: textEval.question_type,
          question_text: textEval.question_text,
          answer_text: textEval.answer_text,
          word_count: textEval.word_count,
          clarity_score: textEval.rubric_scores.clarity.score,
          depth_score: textEval.rubric_scores.depth.score,
          empathy_score: (textEval.rubric_scores as BehavioralRubric).empathy?.score,
          professionalism_score: (textEval.rubric_scores as BehavioralRubric).professionalism?.score,
          total_score: textEval.total_score,
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

    // 4. Calculate weighted psychometric score
    const weights = {
      sliders: 0.40,
      mcq: 0.35,
      text: 0.25,
    };

    // Adjust weights if components are missing
    let totalWeight = 0;
    let weightedSum = 0;

    if (slider_values && Object.keys(slider_values).length > 0) {
      weightedSum += sliderResult.slider_score * weights.sliders;
      totalWeight += weights.sliders;
    }
    if (mcq_responses && mcq_responses.length > 0) {
      weightedSum += mcqResult.score * weights.mcq;
      totalWeight += weights.mcq;
    }
    if (textEvaluations.length > 0) {
      weightedSum += textScore * weights.text;
      totalWeight += weights.text;
    }

    const psychometricScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

    // 5. Build question contributions
    const allContributions = [
      ...sliderResult.contributions,
      ...mcqResult.contributions,
      ...textEvaluations.map(te => ({
        question_id: te.question_id,
        question_type: 'behavioral_text' as const,
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
      psychometric_score: Math.round(psychometricScore * 100) / 100,
      slider_score: sliderResult.slider_score,
      psych_mcq_score: mcqResult.score,
      psych_text_score: Math.round(textScore * 100) / 100,
      trait_scores: adjustedTraitScores,
      question_contributions: allContributions,
      competency_scores: finalCompetencyScores,
      text_evaluations: textEvaluations,
    };

    return NextResponse.json({
      success: true,
      ...result,
    });

  } catch (error) {
    console.error('Psychometric scoring error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Scoring failed' 
      },
      { status: 500 }
    );
  }
}
