// API Route: Generate and Store Job-Specific Assessment Questions
import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { createUntypedClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

export async function POST(request: NextRequest) {
    try {
        const supabase = await createUntypedClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { jobId, forceRegenerate } = await request.json();

        if (!jobId) return NextResponse.json({ error: "Job ID required" }, { status: 400 });

        // 1. Check if job_assessment already has questions
        const { data: jobAssessment } = await supabase
            .from("job_assessments")
            .select("*")
            .eq("job_id", jobId)
            .single();

        if (!jobAssessment) {
            return NextResponse.json({ error: "Job assessment not found" }, { status: 404 });
        }

        // If already generated and not forcing, return existing
        if (jobAssessment.is_generated && !forceRegenerate) {
            return NextResponse.json({
                success: true,
                message: "Assessment already generated",
                job_assessment_id: jobAssessment.id,
                mcq_count: (jobAssessment.mcq_questions as any[])?.length || 0,
                coding_count: (jobAssessment.coding_challenges as any[])?.length || 0
            });
        }

        // 2. Fetch Job Config
        const { data: job } = await supabase
            .from("job_descriptions")
            .select(`
                title, description, role_focus, seniority_level, experience_range,
                skills_config, weights_config, cutoffs_config, assessment_config
            `)
            .eq("id", jobId)
            .single();

        if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

        // 3. Construct AI Payload
        const aiPayload = {
            job_title: job.title,
            seniority: job.seniority_level,
            experience: job.experience_range,
            role_focus: job.role_focus,
            skills: job.skills_config,
            weights: job.weights_config,
            difficulty: jobAssessment.difficulty || "Medium",
            description: job.description?.substring(0, 500) || ""
        };

        // 4. Generate MCQs
        const mcqPrompt = `
        JOB CONTEXT: ${JSON.stringify(aiPayload)}
        
        Generate 10 SCENARIO-BASED Multiple Choice Questions for this job assessment.
        
        Structure:
        - 4 Technical Problem Solving questions (based on required skills)
        - 3 System Design/Architecture questions
        - 3 Situational Judgment questions
        
        STRICT OUTPUT FORMAT (JSON Array only, no extra text):
        [
          {
            "id": "mcq_1",
            "question_text": "Scenario description...",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correct_option": 0,
            "track": "Technical",
            "competency_tag": "Problem Solving",
            "difficulty": "Medium",
            "expected_time": 60
          }
        ]
        `;

        const mcqResponse = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: [{ role: "user", content: mcqPrompt }],
            temperature: 0.7,
            max_tokens: 4000
        });

        const mcqs = parseJson(mcqResponse.choices[0]?.message?.content || "[]");

        // 5. Generate Coding Challenges (if applicable)
        let codingChallenges: any[] = [];
        const role = job.role_focus || "";
        if (["Full Stack", "Backend", "Frontend", "Mobile", "Data Science"].some(r => role.includes(r))) {
            const codingPrompt = `
            JOB CONTEXT: ${JSON.stringify(aiPayload)}
            
            Generate 2 CODING CHALLENGES for this job assessment.
            
            STRICT OUTPUT FORMAT (JSON Array only, no extra text):
            [
              {
                "id": "code_1",
                "problem_statement": "Detailed problem description...",
                "allowed_languages": ["python", "javascript"],
                "visible_test_cases": [{"input": "example", "output": "result"}],
                "hidden_test_cases": [{"input": "hidden", "output": "result"}],
                "competency_tag": "Algorithms",
                "difficulty": "${jobAssessment.difficulty}",
                "time_limit": 15,
                "starter_code": {"python": "def solve():\\n    pass", "javascript": "function solve() {\\n}"}
              }
            ]
            `;
            const codingResponse = await groq.chat.completions.create({
                model: "llama-3.3-70b-versatile",
                messages: [{ role: "user", content: codingPrompt }],
                temperature: 0.5,
            });
            codingChallenges = parseJson(codingResponse.choices[0]?.message?.content || "[]");
        }

        // 6. Generate Psychometric Questions
        const psychPrompt = `
        JOB CONTEXT: ${JSON.stringify(aiPayload)}
        
        Generate 5 PSYCHOMETRIC questions to assess personality traits and work style.
        
        STRICT OUTPUT FORMAT (JSON Array only):
        [
          {
            "id": "psych_1",
            "question_text": "In a stressful situation where deadlines are tight, you would...",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "trait": "Stress Management",
            "scoring_weights": [3, 2, 1, 0]
          }
        ]
        `;

        const psychResponse = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: [{ role: "user", content: psychPrompt }],
            temperature: 0.7,
            max_tokens: 2000
        });

        const psychQuestions = parseJson(psychResponse.choices[0]?.message?.content || "[]");

        // 7. Update job_assessment with generated questions
        const { error: updateError } = await supabase
            .from("job_assessments")
            .update({
                mcq_questions: mcqs,
                coding_challenges: codingChallenges,
                psychometric_questions: psychQuestions,
                is_generated: true,
                generated_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq("id", jobAssessment.id);

        if (updateError) {
            console.error("Update error:", updateError);
            return NextResponse.json({ error: "Failed to save questions" }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            job_assessment_id: jobAssessment.id,
            mcq_count: mcqs.length,
            coding_count: codingChallenges.length,
            psychometric_count: psychQuestions.length,
            generated_at: new Date().toISOString()
        });

    } catch (error: any) {
        console.error("Generation Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

function parseJson(content: string) {
    try {
        const clean = content.replace(/```json\n?|\n?```/g, "").trim();
        const match = clean.match(/\[[\s\S]*\]/);
        return match ? JSON.parse(match[0]) : [];
    } catch (e) {
        console.error("JSON parse error:", e);
        return [];
    }
}
