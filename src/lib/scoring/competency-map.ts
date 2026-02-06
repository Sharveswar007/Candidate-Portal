// =====================================================
// TalentPulse - Competency Mapping Configuration
// Maps questions to competencies for explainability
// =====================================================

import type { Competency, QuestionType, PsychTrait } from '@/types/scoring';

// =====================================================
// COMPETENCY DEFINITIONS
// =====================================================

export const COMPETENCY_DEFINITIONS: Record<Competency, {
  name: string;
  description: string;
  category: 'technical' | 'behavioral' | 'cognitive';
}> = {
  coding_fundamentals: {
    name: 'Coding Fundamentals',
    description: 'Core programming skills, syntax, data structures, and algorithms',
    category: 'technical',
  },
  problem_solving: {
    name: 'Problem Solving',
    description: 'Ability to analyze problems and devise effective solutions',
    category: 'cognitive',
  },
  communication: {
    name: 'Communication',
    description: 'Clarity and effectiveness in written and verbal expression',
    category: 'behavioral',
  },
  decision_making: {
    name: 'Decision Making',
    description: 'Ability to make sound judgments under various conditions',
    category: 'cognitive',
  },
  resilience: {
    name: 'Resilience',
    description: 'Ability to handle stress, setbacks, and pressure',
    category: 'behavioral',
  },
  teamwork: {
    name: 'Teamwork',
    description: 'Collaboration, cooperation, and team dynamics',
    category: 'behavioral',
  },
  leadership: {
    name: 'Leadership',
    description: 'Initiative, vision, and ability to guide others',
    category: 'behavioral',
  },
  ethics: {
    name: 'Ethics & Integrity',
    description: 'Professional conduct and ethical decision-making',
    category: 'behavioral',
  },
  analytical_thinking: {
    name: 'Analytical Thinking',
    description: 'Logical reasoning and systematic analysis',
    category: 'cognitive',
  },
  adaptability: {
    name: 'Adaptability',
    description: 'Flexibility and openness to change',
    category: 'behavioral',
  },
};

// =====================================================
// QUESTION TYPE TO DEFAULT COMPETENCY
// =====================================================

export const DEFAULT_COMPETENCY_MAP: Record<QuestionType, Competency> = {
  coding: 'coding_fundamentals',
  technical_mcq: 'problem_solving',
  technical_text: 'communication',
  psychometric_mcq: 'decision_making',
  behavioral_text: 'communication',
  slider: 'resilience', // Default, actual mapping is per slider
};

// =====================================================
// SLIDER TO COMPETENCY MAPPING
// =====================================================

export const SLIDER_COMPETENCY_MAP: Record<string, Competency> = {
  // Emotional Intelligence sliders → resilience/teamwork
  stress_handling: 'resilience',
  conflict_resolution: 'teamwork',
  feedback_reception: 'adaptability',
  
  // Resilience sliders
  setback_recovery: 'resilience',
  pressure_performance: 'resilience',
  failure_response: 'resilience',
  
  // Teamwork sliders
  collaboration_style: 'teamwork',
  team_dynamics: 'teamwork',
  knowledge_sharing: 'communication',
  
  // Leadership sliders
  initiative_taking: 'leadership',
  mentoring_interest: 'leadership',
  vision_setting: 'leadership',
};

// =====================================================
// TRAIT TO COMPETENCIES MAPPING
// =====================================================

export const TRAIT_COMPETENCY_MAP: Record<PsychTrait, Competency[]> = {
  emotional_intelligence: ['resilience', 'teamwork', 'communication'],
  resilience: ['resilience', 'adaptability'],
  teamwork: ['teamwork', 'communication'],
  leadership: ['leadership', 'decision_making'],
};

// =====================================================
// HELPER: Get competency from question metadata
// =====================================================

export function getQuestionCompetency(
  questionType: QuestionType,
  metadata?: {
    category?: string;
    skill?: string;
    trait?: PsychTrait;
    slider_name?: string;
  }
): Competency {
  // Check for explicit competency in metadata
  if (metadata?.skill && isValidCompetency(metadata.skill)) {
    return metadata.skill as Competency;
  }

  // Slider-specific mapping
  if (questionType === 'slider' && metadata?.slider_name) {
    return SLIDER_COMPETENCY_MAP[metadata.slider_name] || DEFAULT_COMPETENCY_MAP.slider;
  }

  // Trait-based mapping for psychometric
  if (metadata?.trait) {
    const competencies = TRAIT_COMPETENCY_MAP[metadata.trait];
    return competencies?.[0] || DEFAULT_COMPETENCY_MAP.psychometric_mcq;
  }

  // Category-based mapping
  if (metadata?.category) {
    const categoryMap: Record<string, Competency> = {
      'algorithms': 'problem_solving',
      'data_structures': 'coding_fundamentals',
      'system_design': 'analytical_thinking',
      'debugging': 'problem_solving',
      'testing': 'coding_fundamentals',
      'leadership': 'leadership',
      'teamwork': 'teamwork',
      'stress': 'resilience',
      'ethics': 'ethics',
    };
    
    const mappedCompetency = categoryMap[metadata.category.toLowerCase()];
    if (mappedCompetency) return mappedCompetency;
  }

  // Fall back to default
  return DEFAULT_COMPETENCY_MAP[questionType];
}

// =====================================================
// HELPER: Validate competency string
// =====================================================

export function isValidCompetency(value: string): value is Competency {
  return Object.keys(COMPETENCY_DEFINITIONS).includes(value);
}

// =====================================================
// HELPER: Get competency category
// =====================================================

export function getCompetencyCategory(competency: Competency): 'technical' | 'behavioral' | 'cognitive' {
  return COMPETENCY_DEFINITIONS[competency]?.category || 'behavioral';
}

// =====================================================
// HELPER: Group competencies by category
// =====================================================

export function groupCompetenciesByCategory(
  scores: Record<string, number>
): {
  technical: Record<string, number>;
  behavioral: Record<string, number>;
  cognitive: Record<string, number>;
} {
  const result = {
    technical: {} as Record<string, number>,
    behavioral: {} as Record<string, number>,
    cognitive: {} as Record<string, number>,
  };

  for (const [competency, score] of Object.entries(scores)) {
    if (isValidCompetency(competency)) {
      const category = getCompetencyCategory(competency);
      result[category][competency] = score;
    }
  }

  return result;
}

// =====================================================
// HELPER: Calculate category averages
// =====================================================

export function calculateCategoryAverages(
  groupedScores: ReturnType<typeof groupCompetenciesByCategory>
): {
  technical: number;
  behavioral: number;
  cognitive: number;
} {
  const average = (obj: Record<string, number>) => {
    const values = Object.values(obj);
    return values.length > 0 
      ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100
      : 0;
  };

  return {
    technical: average(groupedScores.technical),
    behavioral: average(groupedScores.behavioral),
    cognitive: average(groupedScores.cognitive),
  };
}

// =====================================================
// COMPETENCY WEIGHTS FOR ROLE-BASED SCORING
// =====================================================

export const ROLE_COMPETENCY_WEIGHTS: Record<string, Partial<Record<Competency, number>>> = {
  software_engineer: {
    coding_fundamentals: 0.30,
    problem_solving: 0.25,
    communication: 0.10,
    teamwork: 0.15,
    adaptability: 0.10,
    analytical_thinking: 0.10,
  },
  product_manager: {
    communication: 0.25,
    leadership: 0.20,
    decision_making: 0.20,
    problem_solving: 0.15,
    teamwork: 0.10,
    analytical_thinking: 0.10,
  },
  data_scientist: {
    coding_fundamentals: 0.20,
    problem_solving: 0.25,
    analytical_thinking: 0.25,
    communication: 0.15,
    adaptability: 0.15,
  },
  team_lead: {
    leadership: 0.25,
    communication: 0.20,
    teamwork: 0.20,
    decision_making: 0.15,
    problem_solving: 0.10,
    resilience: 0.10,
  },
  default: {
    problem_solving: 0.20,
    communication: 0.15,
    teamwork: 0.15,
    adaptability: 0.15,
    coding_fundamentals: 0.15,
    decision_making: 0.10,
    resilience: 0.10,
  },
};

// =====================================================
// HELPER: Calculate role-weighted score
// =====================================================

export function calculateRoleWeightedScore(
  competencyScores: Record<string, number>,
  role: string
): number {
  const weights = ROLE_COMPETENCY_WEIGHTS[role.toLowerCase()] || ROLE_COMPETENCY_WEIGHTS.default;
  
  let weightedSum = 0;
  let totalWeight = 0;

  for (const [competency, weight] of Object.entries(weights)) {
    if (weight && competencyScores[competency] !== undefined) {
      weightedSum += competencyScores[competency] * weight;
      totalWeight += weight;
    }
  }

  return totalWeight > 0 
    ? Math.round((weightedSum / totalWeight) * 100) / 100
    : 0;
}

// =====================================================
// HELPER: Get strengths and weaknesses
// =====================================================

export function analyzeCompetencies(
  scores: Record<string, number>,
  threshold: { strong: number; weak: number } = { strong: 75, weak: 50 }
): {
  strengths: Array<{ competency: string; score: number }>;
  weaknesses: Array<{ competency: string; score: number }>;
  average: number;
} {
  const entries = Object.entries(scores)
    .filter(([key]) => isValidCompetency(key))
    .sort((a, b) => b[1] - a[1]);

  const strengths = entries
    .filter(([, score]) => score >= threshold.strong)
    .map(([competency, score]) => ({ competency, score }));

  const weaknesses = entries
    .filter(([, score]) => score < threshold.weak)
    .map(([competency, score]) => ({ competency, score }));

  const allScores = entries.map(([, score]) => score);
  const average = allScores.length > 0
    ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 100) / 100
    : 0;

  return { strengths, weaknesses, average };
}
