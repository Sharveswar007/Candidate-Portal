// Job Description Parser API - Extracts structured requirements from JD
// Returns: required_skills[], nice_to_have[], min_experience, role_keywords[]

import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

export const runtime = "nodejs";
export const maxDuration = 30;

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobDescription, title, department } = body;

    if (!jobDescription || jobDescription.trim().length < 50) {
      return NextResponse.json(
        { error: "Job description is too short. Please provide more details." },
        { status: 400 }
      );
    }

    // Parse JD with AI
    const prompt = `You are an expert HR Job Description parser. Analyze this job description and extract structured requirements.

Job Title: ${title || "Not specified"}
Department: ${department || "Not specified"}

Job Description:
"""
${jobDescription.slice(0, 8000)}
"""

Extract and return a JSON object with this EXACT structure:
{
  "parsed_title": "Cleaned/standardized job title",
  "department": "Inferred department (Engineering, Product, Design, Data, etc.)",
  "employment_type": "full_time|part_time|contract|internship",
  "seniority_level": "intern|junior|mid|senior|lead|manager|director|executive",
  "remote_policy": "remote|hybrid|onsite|flexible",
  
  "required_skills": [
    {"skill": "Python", "category": "technical", "importance": "critical"},
    {"skill": "React", "category": "technical", "importance": "required"},
    {"skill": "Communication", "category": "soft", "importance": "required"}
  ],
  
  "nice_to_have_skills": [
    {"skill": "Kubernetes", "category": "technical"},
    {"skill": "GraphQL", "category": "technical"}
  ],
  
  "min_experience_years": 3,
  "max_experience_years": 7,
  "preferred_experience_years": 5,
  
  "education_requirements": [
    {"level": "bachelor", "field": "Computer Science", "required": true},
    {"level": "master", "field": "any", "required": false}
  ],
  
  "certifications_preferred": ["AWS", "GCP", "Kubernetes"],
  
  "responsibilities": [
    "Design and implement scalable backend services",
    "Lead code reviews and mentor junior developers"
  ],
  
  "role_keywords": ["backend", "microservices", "API", "distributed systems"],
  
  "tech_stack": {
    "languages": ["Python", "Go"],
    "frameworks": ["FastAPI", "Django"],
    "databases": ["PostgreSQL", "Redis"],
    "cloud": ["AWS", "GCP"],
    "tools": ["Docker", "Kubernetes", "Terraform"]
  },
  
  "culture_keywords": ["collaborative", "fast-paced", "innovation"],
  
  "benefits_mentioned": ["health insurance", "401k", "remote work"],
  
  "red_flags": [],
  
  "salary_range": {
    "min": null,
    "max": null,
    "currency": "USD"
  }
}

Rules:
1. Categorize skills as: technical, soft, domain, tools
2. Mark importance as: critical (must-have), required (strong preference), preferred (nice-to-have)
3. Infer experience range from phrases like "3-5 years" or "5+ years"
4. Extract ALL technologies and tools mentioned
5. Be specific with skills (e.g., "React.js" not just "frontend")
6. Return valid JSON only, no markdown`;

    console.log("\n🤖 ============================================");
    console.log("🤖 GENERATED WITH GROQ AI (Job Description Parse)");
    console.log("🤖 Model: llama-3.3-70b-versatile");
    console.log("🤖 ============================================\n");
    
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "You are a precise JD parser. Extract all requirements accurately. Return only valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 2500,
      response_format: { type: "json_object" },
    });

    const responseContent = completion.choices[0]?.message?.content || "{}";
    
    let parsed;
    try {
      parsed = JSON.parse(responseContent);
    } catch {
      console.error("JD Parse Error:", responseContent);
      return NextResponse.json({ error: "Failed to parse job description" }, { status: 500 });
    }

    // Normalize and ensure all fields exist
    const result = {
      parsed_title: parsed.parsed_title || title || "Unknown Role",
      department: parsed.department || department || null,
      employment_type: parsed.employment_type || "full_time",
      seniority_level: parsed.seniority_level || "mid",
      remote_policy: parsed.remote_policy || "onsite",
      
      required_skills: (parsed.required_skills || []).map((s: any) => ({
        skill: typeof s === "string" ? s : s.skill,
        category: s.category || "technical",
        importance: s.importance || "required",
      })),
      
      nice_to_have_skills: (parsed.nice_to_have_skills || []).map((s: any) => ({
        skill: typeof s === "string" ? s : s.skill,
        category: s.category || "technical",
      })),
      
      min_experience_years: parsed.min_experience_years || 0,
      max_experience_years: parsed.max_experience_years || 10,
      preferred_experience_years: parsed.preferred_experience_years || parsed.min_experience_years || 2,
      
      education_requirements: parsed.education_requirements || [],
      certifications_preferred: parsed.certifications_preferred || [],
      responsibilities: parsed.responsibilities || [],
      role_keywords: parsed.role_keywords || [],
      
      tech_stack: {
        languages: parsed.tech_stack?.languages || [],
        frameworks: parsed.tech_stack?.frameworks || [],
        databases: parsed.tech_stack?.databases || [],
        cloud: parsed.tech_stack?.cloud || [],
        tools: parsed.tech_stack?.tools || [],
      },
      
      culture_keywords: parsed.culture_keywords || [],
      benefits_mentioned: parsed.benefits_mentioned || [],
      red_flags: parsed.red_flags || [],
      salary_range: parsed.salary_range || { min: null, max: null, currency: "USD" },
      
      // Computed fields for matching
      all_required_skills: (parsed.required_skills || [])
        .map((s: any) => (typeof s === "string" ? s : s.skill).toLowerCase()),
      all_nice_to_have_skills: (parsed.nice_to_have_skills || [])
        .map((s: any) => (typeof s === "string" ? s : s.skill).toLowerCase()),
      all_keywords: [
        ...(parsed.role_keywords || []),
        ...(parsed.tech_stack?.languages || []),
        ...(parsed.tech_stack?.frameworks || []),
        ...(parsed.tech_stack?.tools || []),
      ].map((k: string) => k.toLowerCase()),
    };

    return NextResponse.json({
      success: true,
      parsed: result,
    });
  } catch (error) {
    console.error("JD Parse API Error:", error);
    return NextResponse.json(
      { error: "Failed to process job description" },
      { status: 500 }
    );
  }
}
