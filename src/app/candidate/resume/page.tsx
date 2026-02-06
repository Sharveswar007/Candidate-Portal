// Candidate Resume Upload Page
// Simple interface: Upload resume → See eligibility (High/Potential/Reject)
// Does NOT show: detailed scores, analytics, decision logic

"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import {
    FileText,
    Upload,
    Loader2,
    CheckCircle2,
    AlertTriangle,
    ArrowRight,
    Target,
    Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

const TARGET_ROLES = [
    "Software Engineer",
    "Data Scientist",
    "Product Manager",
    "UX Designer",
    "DevOps Engineer",
    "AI/ML Engineer",
    "Full-Stack Developer",
    "Frontend Developer",
    "Backend Developer",
    "Data Analyst",
];

interface EligibilityResult {
    status: "high_match" | "potential" | "reject";
    message: string;
}

export default function CandidateResumePage() {
    const [targetRole, setTargetRole] = useState("");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
    const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);
    
    const router = useRouter();
    const supabase = createClient();

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
        if (!file || isAnalyzing) return;

        setIsAnalyzing(true);

        try {
            const formData = new FormData();
            formData.append("file", file);
            if (targetRole) {
                formData.append("targetRole", targetRole);
            }

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
            
            // Save to database
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from("resume_analyses").insert({
                    candidate_id: user.id,
                    file_name: uploadedFileName || "resume",
                    parsed_data: result,
                    ats_score: result.atsScore || result.overallScore,
                    skills_extracted: result.strengthKeywords || [],
                    suggestions: {
                        missingKeywords: result.missingKeywords,
                        formatIssues: result.formatIssues,
                        recommendations: result.recommendations,
                    },
                });
            }

            // Determine eligibility (candidate only sees category, not scores)
            const score = result.atsScore || result.overallScore;
            let status: EligibilityResult["status"];
            let message: string;

            if (score >= 70) {
                status = "high_match";
                message = "Your resume is a strong match! You're eligible to proceed with the assessment.";
            } else if (score >= 50) {
                status = "potential";
                message = "Your resume shows potential. You may proceed with the assessment.";
            } else {
                status = "reject";
                message = "Your resume needs improvement. Consider updating it based on the target role requirements.";
            }

            setEligibility({ status, message });
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

    return (
        <div className="container max-w-2xl mx-auto py-8 px-4">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-8"
            >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 text-blue-600 text-sm font-medium mb-4">
                    <FileText className="h-4 w-4" />
                    Step 1: Resume Upload
                </div>
                <h1 className="text-2xl font-bold mb-2">Upload Your Resume</h1>
                <p className="text-muted-foreground">
                    Our AI will screen your resume for eligibility
                </p>
            </motion.div>

            {/* Upload Area */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-6"
            >
                {/* Target Role Selection */}
                <div>
                    <label className="text-sm font-medium mb-2 block">
                        Target Position
                    </label>
                    <Select value={targetRole} onValueChange={setTargetRole}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select target role..." />
                        </SelectTrigger>
                        <SelectContent>
                            {TARGET_ROLES.map((role) => (
                                <SelectItem key={role} value={role}>
                                    {role}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Dropzone */}
                <Card
                    {...getRootProps()}
                    className={cn(
                        "p-12 border-2 border-dashed cursor-pointer transition-all text-center",
                        isDragActive
                            ? "border-[#2E2E2E] bg-[#2E2E2E]/5"
                            : uploadedFileName
                            ? "border-[#2E2E2E] bg-[#f5f5f5]"
                            : "hover:border-[#2E2E2E]/50"
                    )}
                >
                    <input {...getInputProps()} />
                    <div className="flex flex-col items-center">
                        {uploadedFileName ? (
                            <>
                                <CheckCircle2 className="h-12 w-12 text-[#2E2E2E] mb-4" />
                                <p className="font-medium text-[#2E2E2E]">
                                    {uploadedFileName}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Click or drag to replace
                                </p>
                            </>
                        ) : (
                            <>
                                <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                                <p className="font-medium">
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
                            Analyzing Resume...
                        </>
                    ) : (
                        <>
                            <Target className="h-5 w-5 mr-2" />
                            Check Eligibility
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
                        eligibility.status === "high_match" && "border-[#2E2E2E] bg-[#f5f5f5]",
                        eligibility.status === "potential" && "border-amber-500 bg-amber-500/5",
                        eligibility.status === "reject" && "border-red-500 bg-red-500/5"
                    )}>
                        <div className="flex flex-col items-center gap-4">
                            <Sparkles className={cn(
                                "h-12 w-12",
                                eligibility.status === "high_match" && "text-[#2E2E2E]",
                                eligibility.status === "potential" && "text-amber-500",
                                eligibility.status === "reject" && "text-red-500"
                            )} />
                            
                            {getStatusBadge()}
                            
                            <p className="text-muted-foreground max-w-md">
                                {eligibility.message}
                            </p>

                            {eligibility.status !== "reject" ? (
                                <Link href="/candidate/assessment">
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
                                >
                                    Upload New Resume
                                </Button>
                            )}
                        </div>
                    </Card>
                </motion.div>
            )}

            {/* Info Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-6"
            >
                <Card className="p-4 bg-muted/50">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                        <div className="text-sm text-muted-foreground">
                            <p className="font-medium text-foreground">What happens next?</p>
                            <p className="mt-1">
                                Your resume will be screened by our AI to check if it matches the role requirements.
                                Based on the result, you may proceed to the assessment phase.
                            </p>
                        </div>
                    </div>
                </Card>
            </motion.div>
        </div>
    );
}
