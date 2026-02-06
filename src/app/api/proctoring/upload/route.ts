// Proctoring Upload API - Supabase Storage
// Endpoint: POST /api/proctoring/upload

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60; // 60 seconds for video uploads

// Configure for larger file uploads (50MB for video recordings)
export const fetchCache = 'force-no-store';

interface UploadResult {
    success: boolean;
    url?: string;
    path?: string;
    error?: string;
}

// Upload video or screenshot to Supabase Storage
export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const supabase = await createClient();

        // Verify authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get("file") as Blob | null;
        const type = formData.get("type") as string; // "video" | "screenshot" | "chunk"
        const attemptId = formData.get("attemptId") as string;
        const sessionId = formData.get("sessionId") as string | null;
        const chunkIndex = formData.get("chunkIndex") as string | null;
        const eventType = formData.get("eventType") as string | null; // For violation screenshots

        if (!file || !type || !attemptId) {
            return NextResponse.json(
                { error: "Missing required fields: file, type, attemptId" },
                { status: 400 }
            );
        }

        // Convert Blob to ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);

        // Determine bucket and path
        const isVideo = type === "video" || type === "chunk";
        const bucket = isVideo ? "proctoring-recordings" : "proctoring-screenshots";
        const fileExtension = isVideo ? "webm" : "jpg";
        const timestamp = Date.now();
        const fileName = chunkIndex
            ? `chunk_${chunkIndex}_${timestamp}.${fileExtension}`
            : `${type}_${eventType ? eventType + "_" : ""}${timestamp}.${fileExtension}`;
        
        // Path: userId/attemptId/filename
        const filePath = `${user.id}/${attemptId}/${fileName}`;

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(filePath, buffer, {
                contentType: isVideo ? "video/webm" : "image/jpeg",
                upsert: true,
            });

        if (uploadError) {
            console.error("[Supabase Storage Upload Error]", uploadError);
            return NextResponse.json(
                { error: uploadError.message },
                { status: 500 }
            );
        }

        // Get signed URL (valid for 7 days for HR viewing)
        const { data: signedUrlData } = await supabase.storage
            .from(bucket)
            .createSignedUrl(filePath, 60 * 60 * 24 * 7); // 7 days

        const publicUrl = signedUrlData?.signedUrl || null;

        // If this is a violation screenshot, update the proctoring event
        if (type === "screenshot" && eventType) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase.from("proctor_events") as any)
                .update({ 
                    screenshot_url: publicUrl,
                    screenshot_path: filePath,
                })
                .eq("attempt_id", attemptId)
                .eq("event_type", eventType)
                .order("client_timestamp", { ascending: false })
                .limit(1);
        }

        // If this is a complete video, store reference in session
        if (type === "video" && sessionId) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase.from("assessment_sessions") as any)
                .update({
                    proctoring_log: {
                        recording_path: filePath,
                        recording_url: publicUrl,
                        uploaded_at: new Date().toISOString(),
                    }
                })
                .eq("id", sessionId);
        }

        // Also store in proctoring_media table for easier querying by HR
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase.from("proctoring_media") as any)
                .insert({
                    candidate_id: user.id,
                    attempt_id: attemptId,
                    session_id: sessionId,
                    media_type: type,
                    bucket: bucket,
                    file_path: filePath,
                    event_type: eventType,
                    created_at: new Date().toISOString(),
                });
        } catch {
            // Table might not exist yet, ignore
        }

        return NextResponse.json({
            success: true,
            url: publicUrl,
            path: filePath,
            bucket: bucket,
        });

    } catch (error) {
        console.error("[Proctoring Upload API Error]", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// GET endpoint to retrieve recording URLs for a session
export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const attemptId = searchParams.get("attemptId");
        const candidateId = searchParams.get("candidateId"); // For HR viewing specific candidate

        if (!attemptId) {
            return NextResponse.json({ error: "attemptId required" }, { status: 400 });
        }

        // Check if user is HR/admin - they can view any candidate's media
        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single() as { data: { role: string } | null };

        const isHR = profile?.role === "recruiter" || profile?.role === "admin";
        const targetUserId = isHR && candidateId ? candidateId : user.id;

        // List all recordings for this attempt from Supabase Storage
        const recordingsPath = `${targetUserId}/${attemptId}`;
        
        const { data: recordings } = await supabase.storage
            .from("proctoring-recordings")
            .list(recordingsPath, {
                limit: 100,
                sortBy: { column: "created_at", order: "asc" },
            });

        const { data: screenshots } = await supabase.storage
            .from("proctoring-screenshots")
            .list(recordingsPath, {
                limit: 100,
                sortBy: { column: "created_at", order: "asc" },
            });

        // Generate signed URLs for each file
        const recordingUrls = await Promise.all(
            (recordings || []).map(async (file) => {
                const { data } = await supabase.storage
                    .from("proctoring-recordings")
                    .createSignedUrl(`${recordingsPath}/${file.name}`, 60 * 60 * 24); // 24 hours
                return {
                    name: file.name,
                    url: data?.signedUrl,
                    created_at: file.created_at,
                };
            })
        );

        const screenshotUrls = await Promise.all(
            (screenshots || []).map(async (file) => {
                const { data } = await supabase.storage
                    .from("proctoring-screenshots")
                    .createSignedUrl(`${recordingsPath}/${file.name}`, 60 * 60 * 24); // 24 hours
                return {
                    name: file.name,
                    url: data?.signedUrl,
                    created_at: file.created_at,
                    event_type: file.name.includes("_") ? file.name.split("_")[1] : null,
                };
            })
        );

        // Also get from proctor_events table for event details
        const { data: events } = await supabase
            .from("proctor_events")
            .select("event_type, screenshot_url, client_timestamp, severity")
            .eq("attempt_id", attemptId)
            .not("screenshot_url", "is", null)
            .order("client_timestamp", { ascending: false });

        return NextResponse.json({
            recordings: recordingUrls,
            screenshots: screenshotUrls,
            events: events || [],
        });

    } catch (error) {
        console.error("[Get Recordings Error]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
