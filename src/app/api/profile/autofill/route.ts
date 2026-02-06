// Profile Auto-fill API - Parses resume and maps to profile fields
// Uses OCR.space for text extraction and Groq AI for intelligent field mapping
// Supports LinkedIn URL scraping via RapidAPI

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Groq from "groq-sdk";
import { extractText, getDocumentProxy } from "unpdf";

export const runtime = "nodejs";
export const maxDuration = 60;

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

// Extract text from PDF using unpdf
async function extractTextFromPDF(uint8Array: Uint8Array): Promise<string> {
    try {
        const pdf = await getDocumentProxy(uint8Array);
        const { text } = await extractText(pdf, { mergePages: true });
        return text || "";
    } catch (error) {
        console.error("[Profile Autofill] PDF parse error:", error);
        // Return empty string instead of throwing to allow fallback
        return "";
    }
}

// OCR fallback for image-based PDFs using OCR.space API
async function extractTextWithOCR(file: File): Promise<string> {
    const OCR_API_KEY = process.env.OCR_SPACE_API_KEY;
    if (!OCR_API_KEY) {
        console.warn("[Profile Autofill] OCR service not configured. Set OCR_SPACE_API_KEY in environment.");
        return "";
    }

    try {
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
            console.warn("[Profile Autofill] OCR error:", result.ErrorMessage?.[0]);
            return "";
        }

        return result.ParsedResults?.map((p: { ParsedText: string }) => p.ParsedText).join("\n\n") || "";
    } catch (error) {
        console.error("[Profile Autofill] OCR request failed:", error);
        return "";
    }
}

// LinkedIn Profile Scraper using RapidAPI
interface LinkedInExperience {
    company: string;
    title: string;
    start_date: string;
    end_date: string | null;
    description: string;
    location: string;
}

interface LinkedInEducation {
    school: string;
    degree: string;
    field_of_study: string;
    start_date: string;
    end_date: string;
}

interface LinkedInData {
    full_name: string | null;
    headline: string | null;
    summary: string | null;
    location: string | null;
    profile_picture: string | null;
    public_url: string;
    current_company: string | null;
    current_designation: string | null;
    skills: string[];
    experiences: WorkExperience[];
    education: Education[];
    certifications: Certification[];
}

interface WorkExperience {
    company: string;
    role: string;
    start_date: string;
    end_date: string | null;
    description: string;
    location: string;
    is_current: boolean;
}

interface Education {
    institute: string;
    degree: string;
    field: string;
    start_year: string;
    end_year: string;
}

interface Certification {
    name: string;
    issuer: string;
    issue_date?: string;
    credential_url?: string;
}

interface Project {
    title: string;
    description: string;
    technologies: string[];
    url: string | null;
    github_url: string | null;
}

async function scrapeLinkedIn(linkedinUrl: string): Promise<LinkedInData | null> {
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    if (!RAPIDAPI_KEY) {
        console.log("[Profile Autofill] RapidAPI key not configured for LinkedIn scraping");
        return null;
    }

    try {
        // Using Fresh LinkedIn Profile Data API on RapidAPI
        const response = await fetch("https://fresh-linkedin-profile-data.p.rapidapi.com/get-linkedin-profile", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-RapidAPI-Key": RAPIDAPI_KEY,
                "X-RapidAPI-Host": "fresh-linkedin-profile-data.p.rapidapi.com",
            },
            body: JSON.stringify({
                linkedin_url: linkedinUrl,
                include_skills: true,
            }),
        });

        if (!response.ok) {
            console.error("[LinkedIn Scrape] API error:", response.status);
            return null;
        }

        const data = await response.json();
        
        if (!data || data.error) {
            console.error("[LinkedIn Scrape] No data returned:", data?.error);
            return null;
        }

        return {
            full_name: data.full_name || null,
            headline: data.headline || null,
            summary: data.summary || null,
            location: data.location || null,
            profile_picture: data.profile_picture || null,
            public_url: linkedinUrl,
            current_company: data.experiences?.[0]?.company || null,
            current_designation: data.experiences?.[0]?.title || null,
            skills: data.skills || [],
            experiences: data.experiences?.map((exp: LinkedInExperience) => ({
                company: exp.company,
                role: exp.title,
                start_date: exp.start_date,
                end_date: exp.end_date,
                description: exp.description,
                location: exp.location,
                is_current: !exp.end_date,
            })) || [],
            education: data.education?.map((edu: LinkedInEducation) => ({
                institute: edu.school,
                degree: edu.degree,
                field: edu.field_of_study,
                start_year: edu.start_date,
                end_year: edu.end_date,
            })) || [],
            certifications: data.certifications || [],
        };
    } catch (error) {
        console.error("[LinkedIn Scrape] Error:", error);
        return null;
    }
}

// Comprehensive profile fields mapping structure
interface ProfileAutoFill {
    full_name: string | null;
    phone_number: string | null;
    date_of_birth: string | null;
    gender: string | null;
    current_city: string | null;
    country: string | null;
    address: string | null;
    nationality: string | null;
    languages: string[];
    current_education: string | null;
    institute_name: string | null;
    education_major: string | null;
    graduation_year: string | null;
    cgpa: string | null;
    employment_status: string | null;
    years_experience: number;
    preferred_role: string | null;
    preferred_work_type: string | null;
    current_company: string | null;
    current_designation: string | null;
    notice_period: string | null;
    expected_salary: string | null;
    skills_primary: string[];
    skills_secondary: string[];
    linkedin_url: string | null;
    github_url: string | null;
    portfolio_url: string | null;
    twitter_url: string | null;
    leetcode_url: string | null;
    hackerrank_url: string | null;
    kaggle_url: string | null;
    stackoverflow_url: string | null;
    medium_url: string | null;
    personal_website: string | null;
    work_experience: WorkExperience[];
    projects: Project[];
    certifications: Certification[];
    achievements: string[];
    publications: string[];
    summary: string | null;
    headline: string | null;
}

// Helper to return empty profile structure
function getEmptyProfile(): ProfileAutoFill {
    return {
        full_name: null,
        phone_number: null,
        date_of_birth: null,
        gender: null,
        current_city: null,
        country: null,
        address: null,
        nationality: null,
        languages: [],
        current_education: null,
        institute_name: null,
        education_major: null,
        graduation_year: null,
        cgpa: null,
        employment_status: null,
        years_experience: 0,
        preferred_role: null,
        preferred_work_type: null,
        current_company: null,
        current_designation: null,
        notice_period: null,
        expected_salary: null,
        skills_primary: [],
        skills_secondary: [],
        linkedin_url: null,
        github_url: null,
        portfolio_url: null,
        twitter_url: null,
        leetcode_url: null,
        hackerrank_url: null,
        kaggle_url: null,
        stackoverflow_url: null,
        medium_url: null,
        personal_website: null,
        work_experience: [],
        projects: [],
        certifications: [],
        achievements: [],
        publications: [],
        summary: null,
        headline: null,
    };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const supabase = await createClient();

        // Verify authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const rawText = formData.get("text") as string | null;
        const linkedinUrl = formData.get("linkedinUrl") as string | null;

        if (!file && !rawText && !linkedinUrl) {
            return NextResponse.json(
                { error: "No resume file, text, or LinkedIn URL provided" },
                { status: 400 }
            );
        }

        let resumeContent = "";
        let linkedinData: LinkedInData | null = null;

        // If LinkedIn URL provided, scrape it first
        if (linkedinUrl) {
            console.log("[Profile Autofill] Scraping LinkedIn profile:", linkedinUrl);
            linkedinData = await scrapeLinkedIn(linkedinUrl);
        }

        // Extract text from file
        if (file) {
            const fileType = file.type;

            if (fileType === "application/pdf") {
                try {
                    const arrayBuffer = await file.arrayBuffer();
                    const uint8Array = new Uint8Array(arrayBuffer);
                    resumeContent = await extractTextFromPDF(uint8Array);

                    // If PDF text extraction fails or returns too little, try OCR
                    if (!resumeContent || resumeContent.trim().length < 100) {
                        console.log("[Profile Autofill] PDF text too short, falling back to OCR");
                        resumeContent = await extractTextWithOCR(file);
                    }
                } catch {
                    console.log("[Profile Autofill] PDF extraction failed, using OCR fallback");
                    resumeContent = await extractTextWithOCR(file);
                }
            } else if (fileType.startsWith("image/")) {
                // Image files go directly to OCR
                resumeContent = await extractTextWithOCR(file);
            } else if (fileType === "text/plain" || fileType.includes("text")) {
                resumeContent = await file.text();
            } else {
                return NextResponse.json(
                    { error: "Unsupported file type. Use PDF, image, or text file." },
                    { status: 400 }
                );
            }
        } else if (rawText) {
            resumeContent = rawText;
        }

        // If we only have LinkedIn data and no resume, use that
        if (!resumeContent && linkedinData) {
            return NextResponse.json({
                success: true,
                source: "linkedin",
                profile: mapLinkedInToProfile(linkedinData),
                linkedin_data: linkedinData,
            });
        }

        // If content is too short, return empty profile so user can fill manually
        if (resumeContent.length < 50 && !linkedinData) {
            console.warn("[Profile Autofill] Resume content too short:", resumeContent.length, "chars");
            return NextResponse.json({
                success: true,
                source: "manual",
                warning: "Could not extract enough text from resume. Please fill in details manually.",
                profile: getEmptyProfile(),
                extracted_text_length: resumeContent.length,
            });
        }

        // Use Groq AI to extract comprehensive profile fields
        const prompt = `You are an expert resume parser. Extract ALL possible profile information from this resume.

Resume Text:
"""
${resumeContent.slice(0, 20000)}
"""

Extract and return a JSON object with this EXACT structure. Use null ONLY if you absolutely cannot determine or infer the value:

{
  "full_name": "Candidate's full name",
  "phone_number": "Phone number with country code or null",
  "date_of_birth": "YYYY-MM-DD format - INFER from graduation year (assume age 22 at graduation for Bachelor's, 24 for Master's) or work experience start dates. Use January 1st if only year can be determined.",
  "gender": "Male|Female|Other - INFER from the candidate's first name using common naming conventions. Most names have clear gender associations.",
  "current_city": "Current city",
  "country": "Country",
  "address": "Full address if available",
  "nationality": "Nationality or null",
  "languages": ["Languages known"],
  
  "current_education": "Highest degree: High School|Bachelor's|Master's|PhD",
  "institute_name": "Educational institution",
  "education_major": "Field of study",
  "graduation_year": "Year (e.g., 2024)",
  "cgpa": "CGPA or percentage",
  
  "employment_status": "Student|Employed|Unemployed|Freelancer",
  "years_experience": number (total years, 0 if fresher),
  "preferred_role": "Target job role",
  "preferred_work_type": "Full-time|Internship|Contract|Remote",
  "current_company": "Current employer",
  "current_designation": "Current job title",
  "notice_period": "Notice period if mentioned",
  "expected_salary": "Expected salary if mentioned",
  
  "skills_primary": ["Top 8-10 core technical skills"],
  "skills_secondary": ["Additional tools, soft skills"],
  
  "linkedin_url": "LinkedIn URL if found",
  "github_url": "GitHub URL if found",
  "portfolio_url": "Portfolio website",
  "twitter_url": "Twitter/X URL",
  "leetcode_url": "LeetCode URL",
  "hackerrank_url": "HackerRank URL",
  "kaggle_url": "Kaggle URL",
  "stackoverflow_url": "StackOverflow URL",
  "medium_url": "Medium blog URL",
  "personal_website": "Personal website",
  
  "work_experience": [
    {"company": "", "role": "", "start_date": "YYYY-MM", "end_date": "YYYY-MM or null", "description": "", "location": "", "is_current": boolean}
  ],
  
  "projects": [
    {"title": "", "description": "", "technologies": [], "url": null, "github_url": null}
  ],
  
  "certifications": [
    {"name": "", "issuer": "", "issue_date": "", "credential_url": null}
  ],
  
  "achievements": ["Awards, hackathon wins, honors"],
  "publications": ["Papers, articles, patents"],
  
  "summary": "2-3 sentence professional summary",
  "headline": "One-line professional headline"
}

Rules:
1. Extract EXACT values from resume when available
2. INFER date_of_birth: Calculate based on graduation year (Bachelor's graduates are typically 22, Master's 24, PhD 28). Use format YYYY-01-01 if only year is inferrable.
3. INFER gender: Use the candidate's first name to determine gender. Common patterns: names ending in 'a' are often female in many cultures, but prioritize cultural naming conventions.
4. List ALL work experiences chronologically (most recent first)
5. Include ALL projects mentioned
6. Extract ALL social/portfolio URLs
7. Return valid JSON only
8. DO NOT return null for date_of_birth or gender - always make your best inference`;

        console.log("\n[Profile Autofill] ============================================");
        console.log("[Profile Autofill] COMPREHENSIVE EXTRACTION USING GROQ AI");
        console.log("[Profile Autofill] Model: llama-3.3-70b-versatile");
        console.log("[Profile Autofill] ============================================\n");

        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system",
                    content: "You are a precise resume parser. Extract ALL profile data comprehensively. For date_of_birth, infer from graduation year or work experience. For gender, infer from the candidate's first name. Never return null for these fields - always provide your best inference. Return only valid JSON.",
                },
                { role: "user", content: prompt },
            ],
            temperature: 0.1,
            max_tokens: 4000,
            response_format: { type: "json_object" },
        });

        const responseContent = completion.choices[0]?.message?.content || "{}";

        let parsed: ProfileAutoFill;
        try {
            parsed = JSON.parse(responseContent);
        } catch {
            console.error("[Profile Autofill] JSON parse error:", responseContent);
            return NextResponse.json(
                { error: "Failed to parse resume data" },
                { status: 500 }
            );
        }

        // Merge LinkedIn data if available
        if (linkedinData) {
            parsed = mergeLinkedInData(parsed, linkedinData);
        }

        // Normalize and validate extracted data
        const result: ProfileAutoFill = {
            full_name: parsed.full_name || null,
            phone_number: parsed.phone_number || null,
            date_of_birth: parsed.date_of_birth || null,
            gender: normalizeGender(parsed.gender),
            current_city: parsed.current_city || null,
            country: parsed.country || null,
            address: parsed.address || null,
            nationality: parsed.nationality || null,
            languages: Array.isArray(parsed.languages) ? parsed.languages : [],
            current_education: normalizeEducation(parsed.current_education),
            institute_name: parsed.institute_name || null,
            education_major: parsed.education_major || null,
            graduation_year: parsed.graduation_year?.toString() || null,
            cgpa: parsed.cgpa || null,
            employment_status: normalizeEmploymentStatus(parsed.employment_status),
            years_experience: typeof parsed.years_experience === "number" ? parsed.years_experience : 0,
            preferred_role: parsed.preferred_role || null,
            preferred_work_type: normalizeWorkType(parsed.preferred_work_type),
            current_company: parsed.current_company || null,
            current_designation: parsed.current_designation || null,
            notice_period: parsed.notice_period || null,
            expected_salary: parsed.expected_salary || null,
            skills_primary: Array.isArray(parsed.skills_primary) ? parsed.skills_primary : [],
            skills_secondary: Array.isArray(parsed.skills_secondary) ? parsed.skills_secondary : [],
            linkedin_url: parsed.linkedin_url || linkedinUrl || null,
            github_url: parsed.github_url || null,
            portfolio_url: parsed.portfolio_url || null,
            twitter_url: parsed.twitter_url || null,
            leetcode_url: parsed.leetcode_url || null,
            hackerrank_url: parsed.hackerrank_url || null,
            kaggle_url: parsed.kaggle_url || null,
            stackoverflow_url: parsed.stackoverflow_url || null,
            medium_url: parsed.medium_url || null,
            personal_website: parsed.personal_website || null,
            work_experience: Array.isArray(parsed.work_experience) ? parsed.work_experience : [],
            projects: Array.isArray(parsed.projects) ? parsed.projects : [],
            certifications: Array.isArray(parsed.certifications) ? parsed.certifications : [],
            achievements: Array.isArray(parsed.achievements) ? parsed.achievements : [],
            publications: Array.isArray(parsed.publications) ? parsed.publications : [],
            summary: parsed.summary || null,
            headline: parsed.headline || null,
        };

        return NextResponse.json({
            success: true,
            source: linkedinData ? "resume+linkedin" : "resume",
            profile: result,
            extracted_text_length: resumeContent.length,
            linkedin_data: linkedinData,
        });

    } catch (error) {
        console.error("[Profile Autofill API Error]", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to parse resume" },
            { status: 500 }
        );
    }
}

// Map LinkedIn data to profile structure
function mapLinkedInToProfile(data: LinkedInData): ProfileAutoFill {
    const latestEducation = data.education?.[0];
    
    return {
        full_name: data.full_name,
        phone_number: null,
        date_of_birth: null,
        gender: null,
        current_city: data.location?.split(",")[0]?.trim() || null,
        country: data.location?.split(",").pop()?.trim() || null,
        address: null,
        nationality: null,
        languages: [],
        current_education: latestEducation?.degree || null,
        institute_name: latestEducation?.institute || null,
        education_major: latestEducation?.field || null,
        graduation_year: latestEducation?.end_year || null,
        cgpa: null,
        employment_status: data.current_company ? "Employed" : null,
        years_experience: calculateYearsExperience(data.experiences),
        preferred_role: data.current_designation || null,
        preferred_work_type: "Full-time",
        current_company: data.current_company,
        current_designation: data.current_designation,
        notice_period: null,
        expected_salary: null,
        skills_primary: data.skills.slice(0, 10),
        skills_secondary: data.skills.slice(10),
        linkedin_url: data.public_url,
        github_url: null,
        portfolio_url: null,
        twitter_url: null,
        leetcode_url: null,
        hackerrank_url: null,
        kaggle_url: null,
        stackoverflow_url: null,
        medium_url: null,
        personal_website: null,
        work_experience: data.experiences,
        projects: [],
        certifications: data.certifications,
        achievements: [],
        publications: [],
        summary: data.summary,
        headline: data.headline,
    };
}

// Merge LinkedIn data with resume-extracted data
function mergeLinkedInData(resumeData: ProfileAutoFill, linkedin: LinkedInData): ProfileAutoFill {
    return {
        ...resumeData,
        full_name: resumeData.full_name || linkedin.full_name,
        current_company: resumeData.current_company || linkedin.current_company,
        current_designation: resumeData.current_designation || linkedin.current_designation,
        summary: resumeData.summary || linkedin.summary,
        headline: resumeData.headline || linkedin.headline,
        skills_primary: resumeData.skills_primary.length > 0 
            ? resumeData.skills_primary 
            : linkedin.skills.slice(0, 10),
        work_experience: resumeData.work_experience.length > 0 
            ? resumeData.work_experience 
            : linkedin.experiences,
        linkedin_url: linkedin.public_url,
    };
}

// Calculate years of experience from work history
function calculateYearsExperience(experiences: WorkExperience[]): number {
    if (!experiences || experiences.length === 0) return 0;

    let totalMonths = 0;
    const now = new Date();

    for (const exp of experiences) {
        const startDate = parseDate(exp.start_date);
        const endDate = exp.is_current || !exp.end_date ? now : parseDate(exp.end_date);

        if (startDate && endDate) {
            const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 +
                (endDate.getMonth() - startDate.getMonth());
            totalMonths += Math.max(0, months);
        }
    }

    return Math.round(totalMonths / 12 * 10) / 10;
}

function parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    if (dateStr.toLowerCase() === "present") return new Date();
    
    const parts = dateStr.split("-");
    if (parts.length >= 2) {
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1);
    } else if (parts.length === 1) {
        return new Date(parseInt(parts[0]), 0);
    }
    return null;
}

// Helper functions to normalize values to match form options
function normalizeGender(value: string | null): string | null {
    if (!value) return null;
    const lower = value.toLowerCase();
    if (lower.includes("male") && !lower.includes("female")) return "Male";
    if (lower.includes("female")) return "Female";
    if (lower.includes("other")) return "Other";
    return null;
}

function normalizeEducation(value: string | null): string | null {
    if (!value) return null;
    const lower = value.toLowerCase();
    if (lower.includes("phd") || lower.includes("doctorate")) return "PhD";
    if (lower.includes("master")) return "Master's";
    if (lower.includes("bachelor") || lower.includes("b.tech") || lower.includes("b.e") || lower.includes("bsc")) return "Bachelor's";
    if (lower.includes("high school") || lower.includes("12th")) return "High School";
    return value;
}

function normalizeEmploymentStatus(value: string | null): string | null {
    if (!value) return null;
    const lower = value.toLowerCase();
    if (lower.includes("student")) return "Student";
    if (lower.includes("employed") || lower.includes("working")) return "Employed";
    if (lower.includes("unemployed") || lower.includes("looking")) return "Unemployed";
    if (lower.includes("freelan")) return "Freelancer";
    return value;
}

function normalizeWorkType(value: string | null): string | null {
    if (!value) return null;
    const lower = value.toLowerCase();
    if (lower.includes("full")) return "Full-time";
    if (lower.includes("intern")) return "Internship";
    if (lower.includes("contract") || lower.includes("part")) return "Contract";
    return value;
}
