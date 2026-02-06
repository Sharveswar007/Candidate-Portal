"use client";

import { useRouter, useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Clock,
    Video,
    Monitor,
    AlertCircle,
    FileText,
    CheckSquare,
    ShieldAlert
} from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

export default function InstructionsPage() {
    const router = useRouter();
    const params = useParams();
    const [accepted, setAccepted] = useState(false);

    const startAssessment = () => {
        // In a real app, we would initialize the session start time here
        router.push(`/technical/mcq`);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-3xl w-full"
            >
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-foreground mb-2">
                        Assessment Instructions
                    </h1>
                    <p className="text-muted-foreground">Please read the following rules carefully before starting.</p>
                </div>

                <div className="grid md:grid-cols-3 gap-6 mb-8">
                    <Card className="p-6 bg-card border-border flex flex-col items-center text-center">
                        <Clock className="h-8 w-8 text-[#2E2E2E] dark:text-white mb-4" />
                        <h3 className="font-semibold text-foreground mb-2">90 Minutes</h3>
                        <p className="text-sm text-muted-foreground">Total duration for Technical & Psychometric sections</p>
                    </Card>

                    <Card className="p-6 bg-card border-border flex flex-col items-center text-center">
                        <Video className="h-8 w-8 text-[#2E2E2E] dark:text-white mb-4" />
                        <h3 className="font-semibold text-foreground mb-2">Webcam On</h3>
                        <p className="text-sm text-muted-foreground">You must remain visible within the frame at all times</p>
                    </Card>

                    <Card className="p-6 bg-card border-border flex flex-col items-center text-center">
                        <Monitor className="h-8 w-8 text-[#2E2E2E] dark:text-white mb-4" />
                        <h3 className="font-semibold text-foreground mb-2">Fullscreen</h3>
                        <p className="text-sm text-muted-foreground">Switching tabs or exiting fullscreen is monitored</p>
                    </Card>
                </div>

                <Card className="bg-card border-border overflow-hidden mb-6">
                    <div className="p-6 border-b border-border">
                        <h3 className="font-semibold text-foreground flex items-center gap-2">
                            <ShieldAlert className="h-5 w-5 text-amber-500" />
                            Proctoring Policy
                        </h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="flex items-start gap-4">
                            <div className="h-2 w-2 rounded-full bg-amber-500 mt-2" />
                            <p className="text-sm text-foreground">
                                <span className="text-foreground font-medium">Tab Switching:</span>
                                {" "}Navigating away from the assessment window will trigger a warning. Three warnings will result in auto-submission.
                            </p>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="h-2 w-2 rounded-full bg-amber-500 mt-2" />
                            <p className="text-sm text-foreground">
                                <span className="text-foreground font-medium">No External Devices:</span>
                                {" "}Use of mobile phones or secondary screens is strictly prohibited and detected by AI.
                            </p>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="h-2 w-2 rounded-full bg-amber-500 mt-2" />
                            <p className="text-sm text-foreground">
                                <span className="text-foreground font-medium">Constant Monitoring:</span>
                                {" "}Your video, audio, and screen activity are recorded and reviewed by AI proctoring systems.
                            </p>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="h-2 w-2 rounded-full bg-amber-500 mt-2" />
                            <p className="text-sm text-foreground">
                                <span className="text-foreground font-medium">Copy/Paste Disabled:</span>
                                {" "}Clipboard functionality is disabled within the assessment environment.
                            </p>
                        </div>
                    </div>
                </Card>

                <div className="flex items-center gap-3 mb-8 bg-muted/30 border border-border p-4 rounded-lg">
                    <Checkbox
                        id="terms"
                        checked={accepted}
                        onCheckedChange={(checked) => setAccepted(checked as boolean)}
                        className="data-[state=checked]:bg-[#2E2E2E] border-border"
                    />
                    <label
                        htmlFor="terms"
                        className="text-sm text-foreground cursor-pointer select-none"
                    >
                        I have read and agree to the <span className="text-[#2E2E2E] dark:text-white font-medium underline">Terms & Conditions</span> and understand the proctoring policies.
                    </label>
                </div>

                <Button
                    className="w-full bg-[#2E2E2E] hover:bg-[#404040] text-white font-medium py-6 text-lg tracking-wide uppercase disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    disabled={!accepted}
                    onClick={startAssessment}
                >
                    Start Assessment
                </Button>
            </motion.div>
        </div>
    );
}
