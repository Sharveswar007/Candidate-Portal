"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import { Clock, ShieldCheck, Flag } from "lucide-react";

export default function TechnicalLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const [timeLeft, setTimeLeft] = useState(3600); // 60 minutes in seconds
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    // auto submit functionality would go here
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            {/* Top Bar */}
            <div className="h-16 border-b border-border bg-card flex items-center justify-between px-6 z-50">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <h1 className="font-bold text-lg">Technical Assessment</h1>
                        <p className="text-xs text-muted-foreground">Software Engineer Role</p>
                    </div>
                </div>

                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-2 px-4 py-1.5 bg-muted rounded-full border border-border">
                        <Clock className={`h-4 w-4 ${timeLeft < 300 ? "text-red-500 animate-pulse" : "text-muted-foreground"}`} />
                        <span className={`font-mono font-medium ${timeLeft < 300 ? "text-red-400" : "text-foreground"}`}>
                            {formatTime(timeLeft)}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 text-[#2E2E2E] dark:text-white text-sm bg-[#2E2E2E]/10 dark:bg-white/10 px-3 py-1 rounded-full border border-[#2E2E2E]/20 dark:border-white/20">
                        <ShieldCheck className="h-4 w-4" />
                        <span>Proctoring Active</span>
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="h-1 bg-muted w-full">
                <div
                    className="h-full bg-[#2E2E2E] dark:bg-white transition-all duration-300"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative">
                {children}
            </div>
        </div>
    );
}
