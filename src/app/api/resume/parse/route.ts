// Resume Parser API - Extracts structured data from resume
// Returns: skills[], experience_years, education[], projects[], certifications[]

import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { extractText, getDocumentProxy } from "unpdf";

export const runtime = "nodejs";
export const maxDuration = 60;

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Extract text from PDF
async function extractTextFromPDF(uint8Array: Uint8Array): Promise<string> {
  try {
    const pdf = await getDocumentProxy(uint8Array);
    const { text } = await extractText(pdf, { mergePages: true });
    return text || "";
  } catch (error) {
    console.error("PDF parse error:", error);
    throw error;
  }
}

// OCR fallback for image-based PDFs
async function extractTextWithOCR(file: File): Promise<string> {
  const OCR_API_KEY = process.env.OCR_SPACE_API_KEY;
  if (!OCR_API_KEY) {
    throw new Error("OCR service not configured");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("apikey", OCR_API_KEY);
  formData.append("language", "eng");
  formData.append("OCREngine", "2");

  const response = await fetch("https://api.ocr.space/parse/image", {
    method: "POST",
    body: formData,
  });

  const result = await response.json();
  if (result.IsErroredOnProcessing) {
    throw new Error(result.ErrorMessage?.[0] || "OCR failed");
  }

  return result.ParsedResults?.map((p: { ParsedText: string }) => p.ParsedText).join("\n\n") || "";
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const text = formData.get("text") as string | null;

    let resumeContent = "";

    // Extract text from file or use provided text
    if (file) {
      const fileType = file.type;

      if (fileType === "application/pdf") {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          resumeContent = await extractTextFromPDF(uint8Array);

          if (!resumeContent || resumeContent.trim().length < 100) {
            resumeContent = await extractTextWithOCR(file);
          }
        } catch {
          resumeContent = await extractTextWithOCR(file);
        }
      } else if (fileType.startsWith("image/")) {
        resumeContent = await extractTextWithOCR(file);
      } else {
        resumeContent = await file.text();
      }
    } else if (text) {
      resumeContent = text;
    } else {
      return NextResponse.json({ error: "No resume content provided" }, { status: 400 });
    }

    if (resumeContent.length < 50) {
      return NextResponse.json({ error: "Resume content too short" }, { status: 400 });
    }

    // Parse resume with AI
    const prompt = `You are an expert resume parser. Extract structured information from this resume.

Resume Text:
"""
${resumeContent.slice(0, 12000)}
"""

Extract and return a JSON object with this EXACT structure:
{
  "candidate_name": "Full name of candidate",
  "email": "email@example.com or null",
  "phone": "phone number or null",
  "location": "city, country or null",
  "linkedin_url": "LinkedIn URL or null",
  "github_url": "GitHub URL or null",
  "portfolio_url": "Portfolio URL or null",
  "summary": "Brief professional summary (2-3 sentences)",
  "skills": {
    "technical": ["Python", "JavaScript", "React", ...],
    "soft": ["Leadership", "Communication", ...],
    "tools": ["Git", "Docker", "AWS", ...],
    "languages": ["English", "Spanish", ...]
  },
  "experience_years": number (total years of professional experience),
  "current_role": "Current or most recent job title",
  "current_company": "Current or most recent company",
  "work_history": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "location": "City, Country",
      "start_date": "MM/YYYY or YYYY",
      "end_date": "MM/YYYY or Present",
      "duration_months": number,
      "responsibilities": ["Key responsibility 1", ...],
      "achievements": ["Quantified achievement 1", ...]
    }
  ],
  "education": [
    {
      "degree": "Bachelor's in Computer Science",
      "institution": "University Name",
      "year": 2020,
      "gpa": "3.8 or null",
      "honors": "Cum Laude or null"
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "description": "Brief description",
      "technologies": ["React", "Node.js"],
      "url": "URL or null"
    }
  ],
  "certifications": [
    {
      "name": "AWS Solutions Architect",
      "issuer": "Amazon",
      "year": 2023
    }
  ],
  "seniority_level": "intern|junior|mid|senior|lead|manager|director",
  "primary_domain": "frontend|backend|fullstack|data|ml|devops|mobile|other"
}

Rules:
1. Extract ALL skills mentioned anywhere in the resume
2. Calculate experience_years by summing work history durations
3. Infer seniority_level from job titles and experience
4. Be precise with dates and durations
5. Return valid JSON only, no markdown`;

    console.log("\n🤖 ============================================");
    console.log("🤖 GENERATED WITH GROQ AI (Resume Parsing)");
    console.log("🤖 Model: llama-3.3-70b-versatile");
    console.log("🤖 ============================================\n");
    
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "You are a precise resume parser. Extract structured data accurately. Return only valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 3000,
      response_format: { type: "json_object" },
    });

    const responseContent = completion.choices[0]?.message?.content || "{}";
    
    let parsed;
    try {
      parsed = JSON.parse(responseContent);
    } catch {
      console.error("Parse error:", responseContent);
      return NextResponse.json({ error: "Failed to parse resume" }, { status: 500 });
    }

    // Ensure required fields
    const result = {
      candidate_name: parsed.candidate_name || "Unknown",
      email: parsed.email || null,
      phone: parsed.phone || null,
      location: parsed.location || null,
      linkedin_url: parsed.linkedin_url || null,
      github_url: parsed.github_url || null,
      portfolio_url: parsed.portfolio_url || null,
      summary: parsed.summary || "",
      skills: {
        technical: parsed.skills?.technical || [],
        soft: parsed.skills?.soft || [],
        tools: parsed.skills?.tools || [],
        languages: parsed.skills?.languages || [],
        all: [
          ...(parsed.skills?.technical || []),
          ...(parsed.skills?.soft || []),
          ...(parsed.skills?.tools || []),
        ],
      },
      experience_years: parsed.experience_years || 0,
      current_role: parsed.current_role || null,
      current_company: parsed.current_company || null,
      work_history: parsed.work_history || [],
      education: parsed.education || [],
      projects: parsed.projects || [],
      certifications: parsed.certifications || [],
      seniority_level: parsed.seniority_level || "mid",
      primary_domain: parsed.primary_domain || "other",
      raw_text: resumeContent.slice(0, 5000), // Store truncated raw text
    };

    return NextResponse.json({
      success: true,
      parsed: result,
    });
  } catch (error) {
    console.error("Resume Parse API Error:", error);
    return NextResponse.json(
      { error: "Failed to parse resume" },
      { status: 500 }
    );
  }
}
