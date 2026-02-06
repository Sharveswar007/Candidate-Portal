// API Route: Update Application Stage Progress
import { NextRequest, NextResponse } from "next/server";
import { createUntypedClient } from "@/lib/supabase/server";
import { SupabaseClient } from "@supabase/supabase-js";

// Request body type
interface StageUpdateRequest {
    applicationId: string;
    stage: string;
    data?: {
        resume_score?: number;
        is_eligible?: boolean;
        completed?: boolean;
        decision?: string;
        rationale?: string;
    };
}

// Helper function to update application
async function updateApplication(
    supabase: SupabaseClient,
    applicationId: string,
    updates: {
        status?: string;
        match_score?: number;
        final_decision?: string;
        decision_rationale?: string;
        updated_at: string;
    }
) {
    return supabase
        .from("applications")
        .update({
            status: updates.status,
            match_score: updates.match_score,
            final_decision: updates.final_decision,
            decision_rationale: updates.decision_rationale,
            updated_at: updates.updated_at,
        })
        .eq("id", applicationId);
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createUntypedClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body: StageUpdateRequest = await request.json();
        const { applicationId, stage, data } = body;

        if (!applicationId || !stage) {
            return NextResponse.json({ error: "Application ID and stage required" }, { status: 400 });
        }

        // Verify application belongs to user
        const { data: applicationData, error: fetchError } = await supabase
            .from("applications")
            .select("id, candidate_id, job_id, status, match_score, final_decision, decision_rationale, created_at, updated_at")
            .eq("id", applicationId)
            .eq("candidate_id", user.id)
            .single();

        if (fetchError || !applicationData) {
            return NextResponse.json({ error: "Application not found" }, { status: 404 });
        }

        const previousStatus = String(applicationData.status || 'pending');
        const timestamp = new Date().toISOString();

        // Process update based on stage
        let newStatus: string = previousStatus;
        let matchScore: number | undefined;
        let finalDecision: string | undefined;
        let decisionRationale: string | undefined;

        switch (stage) {
            case 'resume':
                matchScore = data?.resume_score || 0;
                newStatus = 'shortlisted';
                break;

            case 'eligibility':
                newStatus = data?.is_eligible !== false ? 'assessment' : 'rejected';
                break;

            case 'assessment':
                newStatus = data?.completed ? 'interview' : 'assessment';
                break;

            case 'decision':
                // Only HR can update decision (check role)
                const { data: profileData, error: profileError } = await supabase
                    .from("profiles")
                    .select("id, role")
                    .eq("id", user.id)
                    .single();

                if (profileError || !profileData) {
                    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
                }

                const role = String(profileData.role || 'candidate');

                if (role !== 'recruiter') {
                    return NextResponse.json({ error: "Only recruiters can make decisions" }, { status: 403 });
                }

                finalDecision = data?.decision || 'pending';
                decisionRationale = data?.rationale;
                newStatus = data?.decision === 'hire' ? 'hired' : 'rejected';
                break;

            default:
                return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
        }

        // Update application
        const { error: updateError } = await updateApplication(supabase, applicationId, {
            status: newStatus,
            match_score: matchScore,
            final_decision: finalDecision,
            decision_rationale: decisionRationale,
            updated_at: timestamp,
        });

        if (updateError) {
            console.error("Update error:", updateError);
            return NextResponse.json({ error: "Failed to update stage" }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            applicationId,
            previousStatus,
            newStatus,
            updated_at: timestamp
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("Stage update error:", errorMessage);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

// GET: Fetch application progress
export async function GET(request: NextRequest) {
    try {
        const supabase = await createUntypedClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const applicationId = searchParams.get("applicationId");
        const jobId = searchParams.get("jobId");

        let query = supabase
            .from("applications")
            .select(`
                id,
                candidate_id,
                job_id,
                status,
                match_score,
                match_category,
                final_decision,
                decision_rationale,
                created_at,
                updated_at,
                job:job_descriptions (id, title),
                job_assessment:job_assessments (id, is_generated, difficulty, duration_minutes)
            `)
            .eq("candidate_id", user.id);

        if (applicationId) {
            query = query.eq("id", applicationId);
        }
        if (jobId) {
            query = query.eq("job_id", jobId);
        }

        const { data, error } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, applications: data });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
