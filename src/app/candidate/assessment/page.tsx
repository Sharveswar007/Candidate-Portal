// Candidate Assessment Page - Job-Specific
// Fetches questions from job_assessments table for the specific job

"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, AlertTriangle, Briefcase, Clock, Target, CheckCircle2, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";

// Type definitions
interface JobInfo {
    id: string;
    title: string;
    company_name: string | null;
    role_focus: string | null;
    seniority_level: string | null;
}

interface JobAssessmentInfo {
    id: string;
    job_id: string;
    is_generated: boolean;
    difficulty: string | null;
    duration_minutes: number | null;
    webcam_required: boolean | null;
    mcq_questions: unknown[] | null;
    coding_challenges: unknown[] | null;
    psychometric_questions: unknown[] | null;
}

interface ApplicationInfo {
    id: string;
    job_id: string;
    candidate_id: string;
    current_stage: string | null;
    job: JobInfo | null;
    job_assessment: JobAssessmentInfo | null;
}

function CandidateAssessmentContent() {
    const [loading, setLoading] = useState(true);
    const [eligible, setEligible] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [application, setApplication] = useState<ApplicationInfo | null>(null);
    const [jobAssessment, setJobAssessment] = useState<JobAssessmentInfo | null>(null);
    const [job, setJob] = useState<JobInfo | null>(null);
    const [generating, setGenerating] = useState(false);

    const router = useRouter();
    const supabase = createClient();
    const searchParams = useSearchParams();
    const jobId = searchParams.get("jobId");

    useEffect(() => {
        if (jobId) {
            checkEligibility();
        } else {
            setError("No job specified. Please select a job to take the assessment.");
            setLoading(false);
        }
    }, [jobId]);

    const checkEligibility = async () => {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            router.push("/login?redirect=/candidate/assessment?jobId=" + jobId);
            return;
        }

        // 1. Check application exists
        const { data: appData, error: appError } = await supabase
            .from("applications")
            .select(`
                *,
                job:job_descriptions (id, title, company_name, role_focus, seniority_level),
                job_assessment:job_assessments (*)
            `)
            .eq("job_id", jobId)
            .eq("candidate_id", user.id)
            .single();

        if (appError || !appData) {
            setError("You haven't applied for this job yet. Please apply first.");
            setLoading(false);
            return;
        }

        const app = appData as ApplicationInfo;
        setApplication(app);
        setJob(app.job);
        setJobAssessment(app.job_assessment);

        // 2. Check stage eligibility
        if (app.current_stage !== 'assessment') {
            if (app.current_stage === 'resume') {
                setError("Please complete the resume upload stage first.");
            } else if (app.current_stage === 'eligibility') {
                setError("Your eligibility is being reviewed. Please wait.");
            } else if (app.current_stage === 'decision' || app.current_stage === 'completed') {
                setError("You have already completed the assessment for this job.");
            }
            setLoading(false);
            return;
        }

        // 3. Check if questions are generated
        if (!app.job_assessment?.is_generated) {
            // Need to generate questions
            setEligible(true);
            setLoading(false);
            return;
        }

        setEligible(true);
        setLoading(false);
    };

    const generateQuestions = async () => {
        setGenerating(true);
        try {
            const response = await fetch("/api/job-assessment/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ jobId })
            });

            const data = await response.json();

            if (data.success) {
                toast.success(`Generated ${data.mcq_count} MCQs, ${data.coding_count} coding challenges!`);
                // Refresh job assessment
                const { data: updated } = await supabase
                    .from("job_assessments")
                    .select("*")
                    .eq("job_id", jobId)
                    .single();
                setJobAssessment(updated as JobAssessmentInfo);
            } else {
                toast.error(data.error || "Failed to generate questions");
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : "Generation failed";
            toast.error(message);
        }
        setGenerating(false);
    };

    const startAssessment = async () => {
        if (!application) return;
        
        // Update application to mark assessment started
        await fetch("/api/applications/progress", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                applicationId: application.id,
                stage: "assessment",
                data: { started_at: new Date().toISOString() }
            })
        });

        // Navigate to actual assessment taking page
        router.push(`/assessment?jobId=${jobId}`);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <Loader2 className="h-10 w-10 animate-spin text-[#2E2E2E] dark:text-white mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading assessment...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container max-w-lg mx-auto py-16 px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <Card className="p-8 text-center border-amber-500/30 bg-amber-500/5">
                        <AlertTriangle className="h-14 w-14 text-amber-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold mb-2">Cannot Start Assessment</h2>
                        <p className="text-muted-foreground mb-6">{error}</p>
                        <div className="flex gap-3 justify-center">
                            <Link href="/candidate/dashboard">
                                <Button variant="outline">Back to Dashboard</Button>
                            </Link>
                            {error.includes("resume") && (
                                <Link href="/candidate/resume">
                                    <Button className="bg-[#2E2E2E] hover:bg-[#404040] text-white">
                                        Upload Resume
                                    </Button>
                                </Link>
                            )}
                            {error.includes("apply") && jobId && (
                                <Link href={`/jobs/${jobId}`}>
                                    <Button className="bg-[#2E2E2E] hover:bg-[#404040] text-white">
                                        Apply Now
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </Card>
                </motion.div>
            </div>
        );
    }

    // Show assessment overview before starting
    return (
        <div className="min-h-screen bg-white dark:bg-[#2E2E2E] py-12 px-4">
            <div className="container max-w-3xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                >
                    {/* Job Info */}
                    <Card className="p-6 bg-[#f5f5f5] dark:bg-[#3a3a3a] border-[#e0e0e0] dark:border-[#4a4a4a]">
                        <div className="flex items-start gap-4">
                            <div className="h-14 w-14 rounded-xl bg-[#2E2E2E] dark:bg-white flex items-center justify-center">
                                <Briefcase className="h-7 w-7 text-white dark:text-[#2E2E2E]" />
                            </div>
                            <div className="flex-1">
                                <h1 className="text-2xl font-bold text-[#2E2E2E] dark:text-white">{job?.title}</h1>
                                <p className="text-muted-foreground">{job?.company_name}</p>
                                <div className="flex gap-2 mt-2">
                                    <Badge variant="secondary">{job?.role_focus}</Badge>
                                    <Badge variant="outline">{job?.seniority_level}</Badge>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Assessment Details */}
                    <Card className="p-6 bg-[#f5f5f5] dark:bg-[#3a3a3a] border-[#e0e0e0] dark:border-[#4a4a4a]">
                        <h2 className="text-lg font-semibold text-[#2E2E2E] dark:text-white mb-6">Assessment Overview</h2>

                        <div className="grid md:grid-cols-3 gap-4 mb-6">
                            <div className="p-4 rounded-xl bg-white dark:bg-[#404040] border border-[#e0e0e0] dark:border-[#4a4a4a]">
                                <Clock className="h-5 w-5 text-[#2E2E2E] dark:text-white mb-2" />
                                <p className="text-2xl font-bold text-[#2E2E2E] dark:text-white">{jobAssessment?.duration_minutes || 60}</p>
                                <p className="text-sm text-muted-foreground">Minutes</p>
                            </div>
                            <div className="p-4 rounded-xl bg-white dark:bg-[#404040] border border-[#e0e0e0] dark:border-[#4a4a4a]">
                                <Target className="h-5 w-5 text-[#2E2E2E] dark:text-white mb-2" />
                                <p className="text-2xl font-bold text-[#2E2E2E] dark:text-white">{jobAssessment?.difficulty || "Medium"}</p>
                                <p className="text-sm text-muted-foreground">Difficulty</p>
                            </div>
                            <div className="p-4 rounded-xl bg-white dark:bg-[#404040] border border-[#e0e0e0] dark:border-[#4a4a4a]">
                                <CheckCircle2 className="h-5 w-5 text-[#2E2E2E] dark:text-white mb-2" />
                                <p className="text-2xl font-bold text-[#2E2E2E] dark:text-white">
                                    {jobAssessment?.is_generated
                                        ? (jobAssessment.mcq_questions?.length || 0) + (jobAssessment.coding_challenges?.length || 0)
                                        : "—"
                                    }
                                </p>
                                <p className="text-sm text-muted-foreground">Questions</p>
                            </div>
                        </div>

                        {/* Assessment Sections */}
                        <div className="space-y-3 mb-6">
                            <h3 className="text-sm font-medium text-[#2E2E2E] dark:text-white">This assessment includes:</h3>
                            <div className="grid gap-2">
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-[#404040]">
                                    <div className="h-8 w-8 rounded-lg bg-[#2E2E2E]/10 dark:bg-white/10 flex items-center justify-center">
                                        <span>MCQ</span>
                                    </div>
                                    <div>
                                        <p className="text-[#2E2E2E] dark:text-white font-medium">Technical MCQs</p>
                                        <p className="text-sm text-muted-foreground">Scenario-based problem solving</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-[#404040]">
                                    <div className="h-8 w-8 rounded-lg bg-[#2E2E2E]/10 dark:bg-white/10 flex items-center justify-center">
                                        <span>CODE</span>
                                    </div>
                                    <div>
                                        <p className="text-[#2E2E2E] dark:text-white font-medium">Coding Challenges</p>
                                        <p className="text-sm text-muted-foreground">Real-world coding problems</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-[#404040]">
                                    <div className="h-8 w-8 rounded-lg bg-[#2E2E2E]/10 dark:bg-white/10 flex items-center justify-center">
                                        <span>PSY</span>
                                    </div>
                                    <div>
                                        <p className="text-[#2E2E2E] dark:text-white font-medium">Psychometric Evaluation</p>
                                        <p className="text-sm text-muted-foreground">Personality & work style assessment</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Webcam Notice */}
                        {jobAssessment?.webcam_required && (
                            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 mb-6">
                                <p className="text-amber-400 text-sm flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 shrink-0" /> <strong>Webcam Required:</strong> This assessment requires webcam proctoring.
                                    Please ensure your camera is working before starting.
                                </p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-4">
                            {!jobAssessment?.is_generated ? (
                                <Button
                                    onClick={generateQuestions}
                                    disabled={generating}
                                    className="flex-1 bg-[#2E2E2E] hover:bg-[#404040] text-white dark:bg-white dark:text-[#2E2E2E] dark:hover:bg-[#e0e0e0]"
                                >
                                    {generating ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            Generating Questions...
                                        </>
                                    ) : (
                                        "Generate Assessment Questions"
                                    )}
                                </Button>
                            ) : (
                                <Button
                                    onClick={startAssessment}
                                    className="flex-1 bg-[#2E2E2E] hover:bg-[#404040] text-white dark:bg-white dark:text-[#2E2E2E] dark:hover:bg-[#e0e0e0]"
                                >
                                    Start Assessment
                                    <ArrowRight className="h-4 w-4 ml-2" />
                                </Button>
                            )}
                        </div>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
}

function AssessmentLoading() {
    return (
        <div className="min-h-screen bg-white dark:bg-[#2E2E2E] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 text-[#2E2E2E] dark:text-white animate-spin" />
                <p className="text-muted-foreground">Loading assessment...</p>
            </div>
        </div>
    );
}

export default function CandidateAssessmentPage() {
    return (
        <Suspense fallback={<AssessmentLoading />}>
            <CandidateAssessmentContent />
        </Suspense>
    );
}
