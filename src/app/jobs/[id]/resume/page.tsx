// Job-Specific Resume Upload Page
// Upload resume for a specific job application
// Analyzes resume against job requirements and updates application stage

"use client";

import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { useRouter, useParams } from "next/navigation";
import {
    FileText,
    Upload,
    Loader2,
    CheckCircle2,
    AlertTriangle,
    ArrowRight,
    Target,
    Sparkles,
    Briefcase,
    ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface EligibilityResult {
    status: "high_match" | "potential" | "reject";
    message: string;
    score: number;
}

interface Job {
    id: string;
    title: string;
    company_name: string;
    skills_config: { required: string[]; nice_to_have: string[] };
    description: string;
}

export default function JobResumePage() {
    const [job, setJob] = useState<Job | null>(null);
    const [application, setApplication] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
    const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);

    const router = useRouter();
    const params = useParams();
    const jobId = params.id as string;
    const supabase = createClient();

    useEffect(() => {
        if (jobId) {
            loadJobAndApplication();
        } else {
            setLoading(false);
        }
    }, [jobId]);

    const loadJobAndApplication = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push(`/login?redirect=/jobs/${jobId}/resume`);
            return;
        }

        // Fetch job details
        const { data: jobData } = await supabase
            .from("job_descriptions")
            .select("id, title, company_name, skills_config, description")
            .eq("id", jobId)
            .single();

        if (!jobData) {
            toast.error("Job not found");
            router.push("/jobs");
            return;
        }
        setJob(jobData);

        // Fetch application
        const { data: appData } = await supabase
            .from("applications")
            .select("*")
            .eq("job_id", jobId)
            .eq("candidate_id", user.id)
            .maybeSingle();

        if (appData) {
            setApplication(appData);
            // If resume already uploaded, show the result
            if (appData.resume_uploaded && appData.resume_score) {
                let status: EligibilityResult["status"];
                let message: string;
                const score = appData.resume_score;

                if (score >= 70) {
                    status = "high_match";
                    message = "Your resume is a strong match! You're eligible to proceed.";
                } else if (score >= 50) {
                    status = "potential";
                    message = "Your resume shows potential. You may proceed.";
                } else {
                    status = "reject";
                    message = "Your resume needs improvement for this role.";
                }
                setEligibility({ status, message, score });
            }
        }

        setLoading(false);
    };

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const uploadedFile = acceptedFiles[0];
        if (uploadedFile) {
            setFile(uploadedFile);
            setUploadedFileName(uploadedFile.name);
            setEligibility(null);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            "text/plain": [".txt"],
            "application/pdf": [".pdf"],
            "image/png": [".png"],
            "image/jpeg": [".jpg", ".jpeg"],
            "image/webp": [".webp"],
        },
        maxFiles: 1,
        maxSize: 10 * 1024 * 1024,
    });

    const analyzeResume = async () => {
        if (!file || isAnalyzing || !job) return;

        setIsAnalyzing(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error("Please login first");
                return;
            }

            const formData = new FormData();
            formData.append("file", file);
            formData.append("targetRole", job.title);
            formData.append("jobId", job.id);
            formData.append("requiredSkills", JSON.stringify(job.skills_config?.required || []));

            const response = await fetch("/api/resume/analyze", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                toast.error(errorData.error || "Analysis failed");
                setIsAnalyzing(false);
                return;
            }

            const result = await response.json();
            const score = result.atsScore || result.overallScore || 0;

            // Upload resume file to Cloudinary for HR access
            let resumeFileUrl: string | null = null;
            try {
                const uploadFormData = new FormData();
                uploadFormData.append("file", file);
                uploadFormData.append("jobId", job.id);
                if (application?.id) {
                    uploadFormData.append("applicationId", application.id);
                }

                const uploadResponse = await fetch("/api/resume/upload", {
                    method: "POST",
                    body: uploadFormData,
                });

                if (uploadResponse.ok) {
                    const uploadResult = await uploadResponse.json();
                    resumeFileUrl = uploadResult.url;
                }
            } catch (uploadError) {
                console.error("Resume file upload failed:", uploadError);
                // Continue with analysis even if upload fails
            }

            // Update application with resume data
            const updateData: any = {
                resume_uploaded: true,
                resume_score: score,
                resume_file_url: resumeFileUrl,
                skills_extracted: result.strengthKeywords || [],
                resume_analyzed_at: new Date().toISOString(),
                current_stage: score >= 50 ? 'eligibility' : 'resume', // Only advance if passing
                eligibility_score: score,
                is_eligible: score >= 50,
                eligibility_checked_at: new Date().toISOString(),
                // Detailed resume analysis data
                resume_summary: result.summary || result.overallAssessment || '',
                resume_strengths: result.strengths || result.strengthKeywords || [],
                resume_weaknesses: result.weaknesses || result.improvementAreas || [],
                resume_skills: result.skills || result.strengthKeywords || [],
                resume_experience_years: result.experience?.years || null,
                resume_education: result.education?.level || result.education || null,
            };

            // Advance to assessment stage if eligible
            if (score >= 50) {
                updateData.current_stage = 'assessment';
            }

            if (application) {
                await supabase
                    .from("applications")
                    .update(updateData)
                    .eq("id", application.id);
            }

            // Also save to resume_analyses for global profile
            await supabase.from("resume_analyses").insert({
                candidate_id: user.id,
                file_name: uploadedFileName || "resume",
                file_url: resumeFileUrl,
                parsed_data: result,
                ats_score: score,
                skills_extracted: result.strengthKeywords || [],
                suggestions: {
                    missingKeywords: result.missingKeywords,
                    formatIssues: result.formatIssues,
                    recommendations: result.recommendations,
                },
            });

            // Determine eligibility display
            let status: EligibilityResult["status"];
            let message: string;

            if (score >= 70) {
                status = "high_match";
                message = `Your resume is a strong match for ${job.title}! Proceed to assessment.`;
            } else if (score >= 50) {
                status = "potential";
                message = `Your resume shows potential for ${job.title}. You may proceed.`;
            } else {
                status = "reject";
                message = `Your resume needs improvement for ${job.title}. Consider updating it.`;
            }

            setEligibility({ status, message, score });
            toast.success("Resume analyzed successfully!");
        } catch (error) {
            console.error("Analysis error:", error);
            toast.error("Failed to analyze resume");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const getStatusBadge = () => {
        if (!eligibility) return null;

        switch (eligibility.status) {
            case "high_match":
                return (
                    <Badge className="bg-[#2E2E2E] text-white text-lg px-4 py-1">
                        High Match
                    </Badge>
                );
            case "potential":
                return (
                    <Badge className="bg-amber-500 text-white text-lg px-4 py-1">
                        Potential Match
                    </Badge>
                );
            case "reject":
                return (
                    <Badge className="bg-red-500 text-white text-lg px-4 py-1">
                        Needs Improvement
                    </Badge>
                );
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#2E2E2E] dark:text-white" />
            </div>
        );
    }

    if (!jobId) {
        return (
            <div className="container max-w-lg mx-auto py-16 px-4 text-center">
                <Card className="p-8">
                    <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold mb-2">No Job Selected</h2>
                    <p className="text-muted-foreground mb-6">
                        Please select a job to upload your resume for.
                    </p>
                    <Link href="/jobs">
                        <Button>Browse Jobs</Button>
                    </Link>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background py-8 px-4">
            <div className="container max-w-2xl mx-auto">
                {/* Back Link */}
                <Link href={`/jobs/${jobId}`} className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6 transition-colors">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Job Details
                </Link>

                {/* Job Info Header */}
                {job && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6"
                    >
                        <Card className="p-4 bg-card border-border">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-[#2E2E2E] flex items-center justify-center">
                                    <Briefcase className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-foreground">{job.title}</h2>
                                    <p className="text-muted-foreground text-sm">{job.company_name}</p>
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                )}

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-center mb-8"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#2E2E2E]/20 text-[#2E2E2E] dark:text-white text-sm font-medium mb-4">
                        <FileText className="h-4 w-4" />
                        Step 1: Resume Upload
                    </div>
                    <h1 className="text-2xl font-bold text-foreground mb-2">Upload Your Resume</h1>
                    <p className="text-muted-foreground">
                        AI will screen your resume against <span className="text-foreground">{job?.title}</span> requirements
                    </p>
                </motion.div>

                {/* Required Skills Preview */}
                {job?.skills_config?.required && job.skills_config.required.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="mb-6"
                    >
                        <Card className="p-4 bg-muted/30 border-border">
                            <p className="text-sm text-muted-foreground mb-2">Required Skills for this role:</p>
                            <div className="flex flex-wrap gap-2">
                                {job.skills_config.required.map((skill) => (
                                    <Badge key={skill} variant="outline" className="border-[#2E2E2E]/50 text-foreground">
                                        {skill}
                                    </Badge>
                                ))}
                            </div>
                        </Card>
                    </motion.div>
                )}

                {/* Upload Area */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-6"
                >
                    {/* Dropzone */}
                    <Card
                        {...getRootProps()}
                        className={cn(
                            "p-12 border-2 border-dashed cursor-pointer transition-all text-center bg-muted/30",
                            isDragActive
                                ? "border-[#2E2E2E] bg-[#2E2E2E]/10"
                                : uploadedFileName
                                    ? "border-[#2E2E2E] bg-[#2E2E2E]/10"
                                    : "border-border hover:border-[#2E2E2E]/50"
                        )}
                    >
                        <input {...getInputProps()} />
                        <div className="flex flex-col items-center">
                            {uploadedFileName ? (
                                <>
                                    <CheckCircle2 className="h-12 w-12 text-[#2E2E2E] dark:text-white mb-4" />
                                    <p className="font-medium text-foreground">
                                        {uploadedFileName}
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Click or drag to replace
                                    </p>
                                </>
                            ) : (
                                <>
                                    <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                                    <p className="font-medium text-foreground">
                                        Drop your resume here or click to upload
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Supports PDF, Images, and TXT files (max 10MB)
                                    </p>
                                </>
                            )}
                        </div>
                    </Card>

                    {/* Analyze Button */}
                    <Button
                        onClick={analyzeResume}
                        disabled={!file || isAnalyzing}
                        className="w-full h-12 bg-[#2E2E2E] hover:bg-[#404040] text-white"
                    >
                        {isAnalyzing ? (
                            <>
                                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                Analyzing against {job?.title}...
                            </>
                        ) : (
                            <>
                                <Target className="h-5 w-5 mr-2" />
                                Check Eligibility for {job?.title}
                            </>
                        )}
                    </Button>
                </motion.div>

                {/* Eligibility Result */}
                {eligibility && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-8"
                    >
                        <Card className={cn(
                            "p-6 text-center border-2",
                            eligibility.status === "high_match" && "border-[#2E2E2E] bg-[#2E2E2E]/10",
                            eligibility.status === "potential" && "border-amber-500 bg-amber-500/10",
                            eligibility.status === "reject" && "border-red-500 bg-red-500/10"
                        )}>
                            <div className="flex flex-col items-center gap-4">
                                <Sparkles className={cn(
                                    "h-12 w-12",
                                    eligibility.status === "high_match" && "text-[#2E2E2E] dark:text-white",
                                    eligibility.status === "potential" && "text-amber-500",
                                    eligibility.status === "reject" && "text-red-500"
                                )} />

                                {getStatusBadge()}

                                <p className="text-muted-foreground max-w-md">
                                    {eligibility.message}
                                </p>

                                {eligibility.status !== "reject" ? (
                                    <Link href={`/assessment?jobId=${jobId}`}>
                                        <Button className="mt-2 bg-[#2E2E2E] hover:bg-[#404040] text-white">
                                            Proceed to Assessment
                                            <ArrowRight className="h-4 w-4 ml-2" />
                                        </Button>
                                    </Link>
                                ) : (
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setFile(null);
                                            setUploadedFileName(null);
                                            setEligibility(null);
                                        }}
                                        className="border-border text-foreground"
                                    >
                                        Upload New Resume
                                    </Button>
                                )}
                            </div>
                        </Card>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
