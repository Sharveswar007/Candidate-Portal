// Resume Upload API - Uploads resume to Cloudinary and returns URL
// Endpoint: POST /api/resume/upload
// Used during job application to store resume file for HR access

import { NextRequest, NextResponse } from "next/server";
import { createUntypedClient } from "@/lib/supabase/server";
import { v2 as cloudinary } from "cloudinary";

export const runtime = "nodejs";
export const maxDuration = 30;

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface UploadResult {
    success: boolean;
    url?: string;
    publicId?: string;
    error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const supabase = await createUntypedClient();

        // Verify authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const jobId = formData.get("jobId") as string | null;
        const applicationId = formData.get("applicationId") as string | null;

        if (!file) {
            return NextResponse.json(
                { error: "No file provided" },
                { status: 400 }
            );
        }

        // Validate file type
        const allowedTypes = [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "image/jpeg",
            "image/png",
        ];

        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { error: "Invalid file type. Allowed: PDF, DOC, DOCX, JPG, PNG" },
                { status: 400 }
            );
        }

        // Check file size (max 10MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            return NextResponse.json(
                { error: "File too large. Maximum size is 10MB" },
                { status: 400 }
            );
        }

        // Check if Cloudinary is configured
        if (!process.env.CLOUDINARY_CLOUD_NAME) {
            console.log("[Resume Upload] Cloudinary not configured");
            return NextResponse.json({
                success: false,
                error: "Cloud storage not configured",
            }, { status: 503 });
        }

        // Convert file to base64
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Data = buffer.toString("base64");

        // Determine resource type based on file type
        const isImage = file.type.startsWith("image/");
        const resourceType = isImage ? "image" : "raw";

        // Create folder structure: resumes/{userId}/{timestamp}
        const timestamp = Date.now();
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const folder = `resumes/${user.id}`;
        const publicId = `${timestamp}_${sanitizedFileName}`;

        // Determine MIME type for data URI
        const mimeType = file.type;

        // Upload to Cloudinary
        const uploadResult = await new Promise<UploadResult>((resolve) => {
            cloudinary.uploader.upload(
                `data:${mimeType};base64,${base64Data}`,
                {
                    resource_type: resourceType,
                    folder: folder,
                    public_id: publicId,
                    overwrite: false,
                    access_mode: "public",
                    tags: ["resume", user.id, jobId || "general"].filter(Boolean),
                },
                (error, result) => {
                    if (error) {
                        console.error("[Cloudinary Resume Upload Error]", error);
                        resolve({ success: false, error: error.message });
                    } else {
                        resolve({
                            success: true,
                            url: result?.secure_url,
                            publicId: result?.public_id,
                        });
                    }
                }
            );
        });

        if (!uploadResult.success) {
            return NextResponse.json(
                { error: uploadResult.error || "Upload failed" },
                { status: 500 }
            );
        }

        // If applicationId provided, update application with resume URL
        // Note: resume_file_url column added in migration 20260205_domain_proctoring_enhancements.sql
        if (applicationId && uploadResult.url) {
            const { error: updateError } = await supabase
                .from("applications")
                .update({ resume_file_url: uploadResult.url })
                .eq("id", applicationId)
                .eq("candidate_id", user.id);

            if (updateError) {
                console.error("[Resume Upload] Failed to update application:", updateError);
            }
        }

        // Store reference in resume_analyses if needed
        if (uploadResult.url) {
            // Check if resume analysis exists for this user
            const { data: existingAnalysis } = await supabase
                .from("resume_analyses")
                .select("id")
                .eq("candidate_id", user.id)
                .order("created_at", { ascending: false })
                .limit(1)
                .single();

            if (existingAnalysis) {
                // Update existing analysis with file URL
                await supabase
                    .from("resume_analyses")
                    .update({ file_url: uploadResult.url })
                    .eq("id", existingAnalysis.id);
            }

            // Also update profile resume_url
            await supabase
                .from("profiles")
                .update({ resume_url: uploadResult.url })
                .eq("id", user.id);
        }

        return NextResponse.json({
            success: true,
            url: uploadResult.url,
            publicId: uploadResult.publicId,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
        });

    } catch (error) {
        console.error("[Resume Upload API Error]", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// GET endpoint to retrieve candidate's uploaded resumes
export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const supabase = await createUntypedClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const candidateId = searchParams.get("candidateId");

        // If candidateId provided (HR viewing), check if requester is recruiter
        if (candidateId && candidateId !== user.id) {
            const { data: profile } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .single();

            if (!profile || !["recruiter", "admin"].includes(profile.role || "")) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
            }
        }

        const targetUserId = candidateId || user.id;

        // Get profile resume URL
        const { data: profile } = await supabase
            .from("profiles")
            .select("resume_url, full_name")
            .eq("id", targetUserId)
            .single();

        // Get resume analyses with file URLs
        const { data: analyses } = await supabase
            .from("resume_analyses")
            .select("id, file_name, file_url, created_at")
            .eq("candidate_id", targetUserId)
            .order("created_at", { ascending: false })
            .limit(5);

        // Get applications with resume URLs
        const { data: applications } = await supabase
            .from("applications")
            .select("id, job_id, resume_file_url, created_at")
            .eq("candidate_id", targetUserId)
            .not("resume_file_url", "is", null)
            .order("created_at", { ascending: false })
            .limit(10);

        return NextResponse.json({
            profileResumeUrl: profile?.resume_url || null,
            candidateName: profile?.full_name || null,
            resumeAnalyses: analyses || [],
            applicationResumes: applications || [],
        });

    } catch (error) {
        console.error("[Get Resumes Error]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
