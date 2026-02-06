"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
    ArrowLeft,
    MapPin,
    Building2,
    Briefcase,
    Target,
    CheckCircle2,
    AlertCircle,
    Upload,
    ClipboardCheck,
    Clock,
    Sparkles,
    Shield,
    Loader2
} from "lucide-react";

// ...

export default function JobDetailsPage() {
    const [loading, setLoading] = useState(true);
    const [job, setJob] = useState<any>(null);
    const [applying, setApplying] = useState(false);
    const [hasApplied, setHasApplied] = useState(false);
    const [status, setStatus] = useState<any>({
        resumeStatus: null,
        assessmentStatus: 'not_started',
        hasResume: false
    });

    const params = useParams();
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const fetchJobAndStatus = async () => {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push("/login?redirect=/jobs/" + params.id);
                return;
            }

            // 1. Fetch Job
            const { data: jobData, error: jobError } = await supabase
                .from("job_descriptions")
                .select("*")
                .eq("id", params.id)
                .single();

            if (jobError) {
                toast.error("Job not found");
                router.push("/jobs");
                return;
            }
            setJob(jobData);

            // 2. Check Application Status (gracefully handle if table has issues)
            const { data: applicationData, error: appError } = await supabase
                .from("applications")
                .select("*")
                .eq("job_id", params.id)
                .eq("candidate_id", user.id)
                .maybeSingle();

            if (applicationData && !appError) {
                setHasApplied(true);
            }

            // 3. Determine Resume/Eligibility Status from APPLICATION (job-specific)
            let hasResume = false;
            let resumeStatus = null;

            if (applicationData) {
                hasResume = applicationData.resume_uploaded || false;
                const score = applicationData.resume_score || 0;
                if (hasResume && score > 0) {
                    if (score >= 70) resumeStatus = "high_match";
                    else if (score >= 50) resumeStatus = "potential";
                    else resumeStatus = "reject";
                }
            }

            // 4. Fetch Assessment Status for THIS SPECIFIC JOB (with error handling)
            let assessmentStatus = "not_started";
            try {
                const { data: sessionData } = await supabase
                    .from("assessment_sessions")
                    .select("status")
                    .eq("candidate_id", user.id)
                    .eq("job_id", params.id)
                    .order("created_at", { ascending: false })
                    .limit(1);

                if (sessionData && sessionData.length > 0) {
                    if (sessionData[0].status === "completed") assessmentStatus = "completed";
                    else assessmentStatus = "in_progress";
                }
            } catch (err) {
                // Silently handle RLS or table access errors
                console.log("Assessment status check skipped");
            }

            setStatus({ hasResume, resumeStatus, assessmentStatus });
            setLoading(false);
        };

        if (params.id) {
            fetchJobAndStatus();
        }
    }, [params.id]);

    const handleApply = async () => {
        setApplying(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        try {
            // 1. Get the job_assessment for this job
            const { data: jobAssessment } = await supabase
                .from("job_assessments")
                .select("id")
                .eq("job_id", job.id)
                .single();

            // 2. Create application with pipeline stage tracking
            const { error } = await supabase
                .from("applications")
                .insert({
                    candidate_id: user.id,
                    job_id: job.id,
                    status: 'pending',
                    match_score: 0,
                    // Pipeline stage fields
                    current_stage: 'resume',
                    decision: 'pending',
                    job_assessment_id: jobAssessment?.id || null,
                    resume_uploaded: false,
                    is_eligible: null
                });

            if (error) {
                console.error(error);
                toast.error("Failed to apply. Please try again.");
            } else {
                toast.success("Application Submitted! Upload your resume to proceed.");
                setHasApplied(true);
            }
        } catch (e) {
            console.error(e);
            toast.error("Something went wrong. Please try again.");
        }
        setApplying(false);
    };

    const getApplicationSteps = () => {
        return [
            {
                title: "Upload Resume",
                description: "AI screening",
                icon: Upload,
                completed: status.hasResume,
                href: `/jobs/${job?.id}/resume`, // Now job-specific!
                color: "from-blue-500 to-cyan-500",
            },
            {
                title: "Eligibility",
                description: "Match Score",
                icon: Target,
                completed: status.resumeStatus !== null,
                href: null,
                color: "from-[#2E2E2E] to-[#404040]",
            },
            {
                title: "Assessment",
                description: "Multi-modal test",
                icon: ClipboardCheck,
                completed: status.assessmentStatus === 'completed',
                href: `/assessment?jobId=${job?.id}`, // Now job-specific!
                color: "from-[#2E2E2E] to-[#404040]",
                disabled: !status.hasResume || status.resumeStatus === 'reject'
            },
            {
                title: "Decision",
                description: "HR Review",
                icon: Clock,
                completed: false,
                href: null,
                color: "from-amber-500 to-orange-500",
            },
        ];
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#2E2E2E] dark:text-white" />
        </div>
    );
    if (!job) return null;

    return (
        <div className="min-h-screen bg-background text-foreground pb-20">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
                <div className="container mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/candidate/dashboard">
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold">{job.title}</h1>
                            <p className="text-xs text-muted-foreground flex items-center gap-2">
                                {job.company_name} <span className="text-muted-foreground/50">•</span> {job.location}
                            </p>
                        </div>
                    </div>

                    {!hasApplied && (
                        <Button
                            onClick={handleApply}
                            disabled={applying}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8"
                        >
                            {applying ? "Submitting..." : "Apply Now"}
                        </Button>
                    )}
                </div>
            </header>

            <main className="container mx-auto px-6 py-8 max-w-4xl">
                <div className="grid gap-8 md:grid-cols-3">
                    {/* Left Column: Job Details */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={hasApplied ? "md:col-span-2" : "md:col-span-3"}
                    >
                        <Card className="p-8 bg-card border-border space-y-8 shadow-sm">
                            {/* Tags */}
                            <div className="flex flex-wrap gap-4 pb-6 border-b border-border">
                                <Badge variant="outline" className="text-sm py-1 px-3 flex items-center gap-2">
                                    <Building2 className="h-3 w-3" /> {job.company_name}
                                </Badge>
                                <Badge variant="outline" className="text-sm py-1 px-3 flex items-center gap-2">
                                    <MapPin className="h-3 w-3" /> {job.location}
                                </Badge>
                                <Badge variant="outline" className="text-sm py-1 px-3 flex items-center gap-2">
                                    <Briefcase className="h-3 w-3" /> {job.employment_type?.replace('_', ' ')}
                                </Badge>
                            </div>

                            {/* Description */}
                            <div>
                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-primary">
                                    About the Role
                                </h3>
                                <div className="prose prose-slate dark:prose-invert max-w-none text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                    {job.description}
                                </div>
                            </div>

                            {/* Requirements */}
                            <div>
                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-primary">
                                    Requirements
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {job.requirements?.map((req: string, i: number) => (
                                        <Badge key={i} variant="secondary" className="px-3 py-1">
                                            <Target className="mr-1 h-3 w-3" /> {req}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </Card>
                    </motion.div>

                    {/* Right Column: Application Tracker (Visible ONLY if Applied) */}
                    {hasApplied && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="md:col-span-1 space-y-6"
                        >
                            <Card className="p-6 border-[#2E2E2E]/20 shadow-lg shadow-[#2E2E2E]/5 sticky top-24">
                                <h3 className="font-semibold mb-4 flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-[#2E2E2E] dark:text-white" /> Application Status
                                </h3>

                                <div className="space-y-6 relative">
                                    {/* Vertical Line */}
                                    <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-muted z-0" />

                                    {getApplicationSteps().map((step, index) => (
                                        <div key={index} className="relative z-10 flex gap-4">
                                            <div className={`h-12 w-12 shrink-0 rounded-full flex items-center justify-center border-4 border-background ${step.completed ? 'bg-[#2E2E2E] text-white' : 'bg-muted text-muted-foreground'
                                                }`}>
                                                {step.completed ? <CheckCircle2 className="h-5 w-5" /> : <step.icon className="h-5 w-5" />}
                                            </div>
                                            <div className="pt-1">
                                                <h4 className="font-medium text-sm">{step.title}</h4>
                                                <p className="text-xs text-muted-foreground mb-2">{step.description}</p>

                                                {step.href && !step.completed && !step.disabled && (
                                                    <Link href={step.href}>
                                                        <Button size="sm" variant="outline" className="h-7 text-xs">
                                                            Start <ArrowLeft className="ml-1 h-3 w-3 rotate-180" />
                                                        </Button>
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>

                            <Card className="p-4 bg-amber-500/10 border-amber-500/30">
                                <div className="flex gap-3">
                                    <Shield className="h-5 w-5 text-amber-600 shrink-0" />
                                    <p className="text-xs text-amber-800 dark:text-amber-200">
                                        Surveillance active during assessment. Ensure camera is enabled.
                                    </p>
                                </div>
                            </Card>
                        </motion.div>
                    )}
                </div>
            </main>
        </div>
    );
}
