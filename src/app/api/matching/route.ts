// Resume-JD Matching API - Computes match score with explainability
// Returns: score, matched_skills[], missing_skills[], category (high_match/potential/reject)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Matching weights (recruiter-tunable)
interface MatchWeights {
  skill_match: number;        // 0.50 default
  experience_match: number;   // 0.25 default
  education_match: number;    // 0.10 default
  keyword_overlap: number;    // 0.10 default
  certification_bonus: number; // 0.05 default
}

const DEFAULT_WEIGHTS: MatchWeights = {
  skill_match: 0.50,
  experience_match: 0.25,
  education_match: 0.10,
  keyword_overlap: 0.10,
  certification_bonus: 0.05,
};

// Thresholds for categorization
const THRESHOLDS = {
  high_match: 70,    // >= 70% = High Match (proceed to assessment)
  potential: 45,     // >= 45% = Potential (manual review)
  // < 45% = Reject
};

interface ResumeData {
  skills: {
    technical: string[];
    soft: string[];
    tools: string[];
    all: string[];
  };
  experience_years: number;
  education: Array<{
    degree: string;
    institution: string;
    year: number;
  }>;
  certifications: Array<{
    name: string;
    issuer: string;
  }>;
  projects: Array<{
    name: string;
    technologies: string[];
  }>;
  seniority_level: string;
}

interface JDData {
  required_skills: Array<{ skill: string; importance: string }>;
  nice_to_have_skills: Array<{ skill: string }>;
  min_experience_years: number;
  max_experience_years: number;
  education_requirements: Array<{ level: string; required: boolean }>;
  certifications_preferred: string[];
  role_keywords: string[];
  all_required_skills: string[];
  all_nice_to_have_skills: string[];
  all_keywords: string[];
  seniority_level: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { 
      resumeData, 
      jdData, 
      resume,  // Alternative: parsed resume object
      weights = DEFAULT_WEIGHTS,
      candidateId,
      jobId,
      saveResult = false 
    } = body;

    const supabase = await createClient();

    // If resume is passed instead of resumeData, use it
    if (resume && !resumeData) {
      resumeData = {
        skills: {
          technical: resume.skills?.technical || [],
          soft: resume.skills?.soft || [],
          tools: resume.skills?.tools || [],
          all: [
            ...(resume.skills?.technical || []),
            ...(resume.skills?.soft || []),
            ...(resume.skills?.tools || []),
          ],
        },
        experience_years: resume.experience_years || 0,
        education: resume.education || [],
        certifications: resume.certifications?.map((c: string) => ({ name: c, issuer: "" })) || [],
        projects: resume.projects || [],
        seniority_level: resume.seniority_level || "mid",
      };
    }

    // If jobId is provided but no jdData, fetch from database
    if (jobId && !jdData) {
      const { data: jobData, error: jobError } = await supabase
        .from("job_descriptions")
        .select("*")
        .eq("id", jobId)
        .single();

      if (jobError || !jobData) {
        return NextResponse.json(
          { error: "Job not found" },
          { status: 404 }
        );
      }

      // Transform job data to JD format
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const job = jobData as any;
      jdData = {
        required_skills: job.parsed_required_skills || 
          (job.skills_required || []).map((s: string) => ({ skill: s, importance: "required" })),
        nice_to_have_skills: (job.parsed_nice_to_have || []).map((s: string) => ({ skill: s })),
        min_experience_years: job.experience_min || 0,
        max_experience_years: job.experience_max || 15,
        education_requirements: [],
        certifications_preferred: [],
        role_keywords: job.parsed_tech_stack || [],
        all_required_skills: job.skills_required || [],
        all_nice_to_have_skills: job.parsed_nice_to_have || [],
        all_keywords: job.parsed_tech_stack || [],
        seniority_level: job.seniority_level || "mid",
      };
    }

    if (!resumeData || !jdData) {
      return NextResponse.json(
        { error: "Both resumeData/resume and jdData/jobId are required" },
        { status: 400 }
      );
    }

    // Normalize skills for comparison (lowercase)
    const normalizeSkills = (skills: string[]) => 
      skills.map(s => s.toLowerCase().trim());

    const resumeSkills = normalizeSkills([
      ...(resumeData.skills?.technical || []),
      ...(resumeData.skills?.tools || []),
      ...(resumeData.skills?.all || []),
    ]);

    const requiredSkills = normalizeSkills(
      jdData.all_required_skills || 
      jdData.required_skills?.map((s: any) => typeof s === "string" ? s : s.skill) || []
    );

    const niceToHaveSkills = normalizeSkills(
      jdData.all_nice_to_have_skills ||
      jdData.nice_to_have_skills?.map((s: any) => typeof s === "string" ? s : s.skill) || []
    );

    const jdKeywords = normalizeSkills(jdData.all_keywords || jdData.role_keywords || []);

    // 1. SKILL MATCH SCORE (50% weight by default)
    const matchedRequired: string[] = [];
    const missingRequired: string[] = [];
    const matchedNiceToHave: string[] = [];

    requiredSkills.forEach(skill => {
      // Fuzzy match: check if resume contains skill or similar
      const found = resumeSkills.some(rs => 
        rs.includes(skill) || skill.includes(rs) || 
        levenshteinSimilarity(rs, skill) > 0.8
      );
      if (found) {
        matchedRequired.push(skill);
      } else {
        missingRequired.push(skill);
      }
    });

    niceToHaveSkills.forEach(skill => {
      const found = resumeSkills.some(rs => 
        rs.includes(skill) || skill.includes(rs) ||
        levenshteinSimilarity(rs, skill) > 0.8
      );
      if (found) {
        matchedNiceToHave.push(skill);
      }
    });

    // Required skills score (critical importance has 1.5x weight)
    const requiredSkillScore = requiredSkills.length > 0
      ? (matchedRequired.length / requiredSkills.length) * 100
      : 100;

    // Nice-to-have bonus (up to 20% extra)
    const niceToHaveBonus = niceToHaveSkills.length > 0
      ? (matchedNiceToHave.length / niceToHaveSkills.length) * 20
      : 0;

    const skillMatchScore = Math.min(100, requiredSkillScore + niceToHaveBonus);

    // 2. EXPERIENCE MATCH SCORE (25% weight by default)
    const candidateExp = resumeData.experience_years || 0;
    const minExp = jdData.min_experience_years || 0;
    const maxExp = jdData.max_experience_years || 15;

    let experienceScore = 0;
    if (candidateExp >= minExp && candidateExp <= maxExp) {
      experienceScore = 100; // Perfect match
    } else if (candidateExp < minExp) {
      // Under-experienced: linear penalty
      experienceScore = Math.max(0, (candidateExp / minExp) * 80);
    } else {
      // Over-experienced: slight penalty (might be overqualified)
      experienceScore = Math.max(70, 100 - ((candidateExp - maxExp) * 5));
    }

    // 3. EDUCATION MATCH SCORE (10% weight by default)
    let educationScore = 50; // Default baseline
    const eduReqs = jdData.education_requirements || [];
    const candidateEdu = resumeData.education || [];

    if (eduReqs.length > 0 && candidateEdu.length > 0) {
      const requiredEdu = eduReqs.find((e: any) => e.required);
      if (requiredEdu) {
        const hasRequiredLevel = candidateEdu.some((e: any) => {
          const degree = (e.degree || "").toLowerCase();
          const level = requiredEdu.level.toLowerCase();
          return degree.includes(level) || 
                 (level === "bachelor" && (degree.includes("bs") || degree.includes("ba") || degree.includes("b.tech"))) ||
                 (level === "master" && (degree.includes("ms") || degree.includes("ma") || degree.includes("mba")));
        });
        educationScore = hasRequiredLevel ? 100 : 30;
      } else {
        educationScore = 70; // No strict requirement
      }
    }

    // 4. KEYWORD OVERLAP SCORE (10% weight by default)
    const allResumeText = [
      ...(resumeData.skills?.technical || []),
      ...(resumeData.projects?.map((p: any) => p.technologies?.join(" ") || "") || []),
      resumeData.summary || "",
    ].join(" ").toLowerCase();

    const matchedKeywords = jdKeywords.filter(kw => allResumeText.includes(kw));
    const keywordScore = jdKeywords.length > 0
      ? (matchedKeywords.length / jdKeywords.length) * 100
      : 50;

    // 5. CERTIFICATION BONUS (5% weight by default)
    const preferredCerts = (jdData.certifications_preferred || []).map((c: string) => c.toLowerCase());
    const candidateCerts = (resumeData.certifications || []).map((c: any) => 
      (c.name || "").toLowerCase()
    );

    const matchedCerts = preferredCerts.filter((cert: string) =>
      candidateCerts.some((cc: string) => cc.includes(cert) || cert.includes(cc))
    );
    const certScore = preferredCerts.length > 0
      ? (matchedCerts.length / preferredCerts.length) * 100
      : 50;

    // CALCULATE WEIGHTED TOTAL
    const totalScore = Math.round(
      skillMatchScore * weights.skill_match +
      experienceScore * weights.experience_match +
      educationScore * weights.education_match +
      keywordScore * weights.keyword_overlap +
      certScore * weights.certification_bonus
    );

    // DETERMINE CATEGORY
    let category: "high_match" | "potential" | "reject";
    let categoryReason: string;

    if (totalScore >= THRESHOLDS.high_match) {
      category = "high_match";
      categoryReason = `Strong match with ${matchedRequired.length}/${requiredSkills.length} required skills and ${candidateExp} years experience.`;
    } else if (totalScore >= THRESHOLDS.potential) {
      category = "potential";
      categoryReason = `Partial match. Missing key skills: ${missingRequired.slice(0, 3).join(", ")}. Consider for review.`;
    } else {
      category = "reject";
      categoryReason = `Low match. Missing ${missingRequired.length} required skills and experience gap.`;
    }

    // Build explainability report
    const result = {
      // Core scores
      total_score: totalScore,
      category,
      category_reason: categoryReason,
      
      // Breakdown
      score_breakdown: {
        skill_match: {
          score: Math.round(skillMatchScore),
          weight: weights.skill_match,
          weighted: Math.round(skillMatchScore * weights.skill_match),
        },
        experience_match: {
          score: Math.round(experienceScore),
          weight: weights.experience_match,
          weighted: Math.round(experienceScore * weights.experience_match),
          candidate_years: candidateExp,
          required_range: `${minExp}-${maxExp}`,
        },
        education_match: {
          score: Math.round(educationScore),
          weight: weights.education_match,
          weighted: Math.round(educationScore * weights.education_match),
        },
        keyword_overlap: {
          score: Math.round(keywordScore),
          weight: weights.keyword_overlap,
          weighted: Math.round(keywordScore * weights.keyword_overlap),
        },
        certification_bonus: {
          score: Math.round(certScore),
          weight: weights.certification_bonus,
          weighted: Math.round(certScore * weights.certification_bonus),
        },
      },

      // Explainability (for AI transparency)
      explainability: {
        matched_required_skills: matchedRequired,
        missing_required_skills: missingRequired,
        matched_nice_to_have: matchedNiceToHave,
        matched_keywords: matchedKeywords,
        matched_certifications: matchedCerts,
        experience_assessment: candidateExp >= minExp 
          ? "Meets experience requirement" 
          : `${minExp - candidateExp} years below minimum`,
        seniority_match: resumeData.seniority_level === jdData.seniority_level,
      },

      // Recommendation
      recommendation: {
        proceed_to_assessment: category === "high_match" || category === "potential",
        requires_review: category === "potential",
        auto_reject: category === "reject",
        suggested_action: category === "high_match" 
          ? "Invite to assessment immediately"
          : category === "potential"
          ? "Review resume manually before decision"
          : "Send rejection email or archive",
      },
    };

    // Save to database if requested
    if (saveResult && candidateId && jobId) {
      const supabase = await createClient();
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("resume_job_matches") as any).upsert({
        candidate_id: candidateId,
        job_id: jobId,
        match_score: totalScore,
        match_category: category,
        matched_skills: matchedRequired,
        missing_skills: missingRequired,
        score_breakdown: result.score_breakdown,
        explainability: result.explainability,
        weights_used: weights,
        created_at: new Date().toISOString(),
      }, {
        onConflict: "candidate_id,job_id",
      });
    }

    return NextResponse.json({
      success: true,
      match: result,
    });
  } catch (error) {
    console.error("Matching API Error:", error);
    return NextResponse.json(
      { error: "Failed to compute match score" },
      { status: 500 }
    );
  }
}

// Levenshtein similarity for fuzzy matching
function levenshteinSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2[i-1] === str1[j-1]) {
        matrix[i][j] = matrix[i-1][j-1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i-1][j-1] + 1,
          matrix[i][j-1] + 1,
          matrix[i-1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}
