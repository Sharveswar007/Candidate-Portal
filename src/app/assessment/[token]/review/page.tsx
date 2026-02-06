"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flag, ShieldAlert, CheckCircle, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

export default function ReviewPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Mock data - in real app would come from context/store
    const summary = {
        totalQuestions: 25,
        answered: 24,
        flagged: [3, 12, 18],
        proctoringWarnings: 2
    };

    const handleFinalSubmit = () => {
        setIsSubmitting(true);
        // Simulate submission API call
        setTimeout(() => {
            router.push("/assessment/demo-token/complete");
        }, 2000);
    };

    return (
        <div className="min-h-screen bg-background p-6 flex items-center justify-center">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-2xl w-full space-y-8"
            >
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-foreground mb-2">Assessment Review</h1>
                    <p className="text-muted-foreground">Please review your status before final submission.</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <Card className="p-6 bg-card border-border">
                        <h3 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
                            <Flag className="h-5 w-5 text-amber-500" />
                            Flagged Questions
                        </h3>
                        {summary.flagged.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {summary.flagged.map((q) => (
                                    <Button key={q} variant="outline" size="sm" className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10">
                                        Question {q}
                                    </Button>
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-sm">No questions flagged for review.</p>
                        )}
                    </Card>

                    <Card className="p-6 bg-card border-border">
                        <h3 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
                            <ShieldAlert className="h-5 w-5 text-[#2E2E2E] dark:text-white" />
                            Proctoring Summary
                        </h3>
                        <div className="flex items-center gap-3">
                            <div className={`h-3 w-3 rounded-full ${summary.proctoringWarnings > 0 ? "bg-amber-500" : "bg-[#2E2E2E] dark:bg-white"}`} />
                            <p className="text-foreground">
                                {summary.proctoringWarnings > 0
                                    ? `${summary.proctoringWarnings} Minor Warnings Recorded`
                                    : "Clean Session Record"}
                            </p>
                        </div>
                    </Card>
                </div>

                <Card className="p-6 bg-card border-border">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-muted-foreground">Questions Answered</span>
                        <span className="text-foreground font-medium">{summary.answered} / {summary.totalQuestions}</span>
                    </div>
                    <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-[#2E2E2E] dark:bg-white"
                            style={{ width: `${(summary.answered / summary.totalQuestions) * 100}%` }}
                        />
                    </div>
                    {summary.answered < summary.totalQuestions && (
                        <p className="text-xs text-amber-500 mt-2 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            You have unanswered questions.
                        </p>
                    )}
                </Card>

                <div className="flex gap-4">
                    <Button variant="outline" className="w-1/2 py-6" onClick={() => router.back()}>
                        Go Back
                    </Button>
                    <Button
                        className="w-1/2 py-6 bg-[#2E2E2E] hover:bg-[#404040] text-white font-bold text-lg"
                        onClick={handleFinalSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "Submitting..." : "Final Submit"}
                    </Button>
                </div>
            </motion.div>
        </div>
    );
}
