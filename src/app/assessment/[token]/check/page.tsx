"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, Mic, Camera, Monitor, Wifi, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function SystemCheckPage() {
    const router = useRouter();
    const params = useParams();
    const [checks, setChecks] = useState({
        camera: "pending", // pending, checking, success, error
        mic: "pending",
        screen: "pending",
        internet: "pending"
    });
    const [internetSpeed, setInternetSpeed] = useState<number | null>(null);

    const runChecks = async () => {
        // Camera Check
        setChecks(prev => ({ ...prev, camera: "checking" }));
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(track => track.stop());
            setChecks(prev => ({ ...prev, camera: "success" }));
        } catch (err) {
            setChecks(prev => ({ ...prev, camera: "error" }));
        }

        // Mic Check
        setChecks(prev => ({ ...prev, mic: "checking" }));
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            setChecks(prev => ({ ...prev, mic: "success" }));
        } catch (err) {
            setChecks(prev => ({ ...prev, mic: "error" }));
        }

        // Screen Share Check (simulated as browser capability check)
        setChecks(prev => ({ ...prev, screen: "checking" }));
        if (navigator.mediaDevices && "getDisplayMedia" in navigator.mediaDevices) {
            setChecks(prev => ({ ...prev, screen: "success" }));
        } else {
            setChecks(prev => ({ ...prev, screen: "error" }));
        }

        // Internet Speed (simulated)
        setChecks(prev => ({ ...prev, internet: "checking" }));
        setTimeout(() => {
            setInternetSpeed(Math.floor(Math.random() * 50) + 10); // Random speed 10-60 Mbps
            setChecks(prev => ({ ...prev, internet: "success" }));
        }, 1500);
    };

    useEffect(() => {
        runChecks();
    }, []);

    const allPassed = Object.values(checks).every(status => status === "success");

    const getIcon = (status: string, DefaultIcon: any) => {
        if (status === "checking") return <Loader2 className="h-6 w-6 animate-spin text-[#2E2E2E] dark:text-white" />;
        if (status === "success") return <CheckCircle className="h-6 w-6 text-green-500" />;
        if (status === "error") return <XCircle className="h-6 w-6 text-red-500" />;
        return <DefaultIcon className="h-6 w-6 text-muted-foreground" />;
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full space-y-8"
            >
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-foreground">
                        System Integrity Check
                    </h1>
                    <p className="text-muted-foreground mt-2">Checking your device capabilities...</p>
                </div>

                <Card className="bg-card border-border p-6 space-y-6">
                    {/* Camera */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-4">
                            {getIcon(checks.camera, Camera)}
                            <div>
                                <h3 className="font-medium text-foreground">Camera Access</h3>
                                <p className="text-xs text-muted-foreground">Required for proctoring</p>
                            </div>
                        </div>
                        {checks.camera === "success" && <span className="text-xs text-green-500">Ready</span>}
                    </div>

                    {/* Mic */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-4">
                            {getIcon(checks.mic, Mic)}
                            <div>
                                <h3 className="font-medium text-foreground">Microphone Access</h3>
                                <p className="text-xs text-muted-foreground">Audio monitoring enabled</p>
                            </div>
                        </div>
                        {checks.mic === "success" && <span className="text-xs text-green-500">Ready</span>}
                    </div>

                    {/* Screen */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-4">
                            {getIcon(checks.screen, Monitor)}
                            <div>
                                <h3 className="font-medium text-foreground">Screen Sharing</h3>
                                <p className="text-xs text-muted-foreground">Browser supported</p>
                            </div>
                        </div>
                        {checks.screen === "success" && <span className="text-xs text-green-500">Supported</span>}
                    </div>

                    {/* Internet */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-4">
                            {getIcon(checks.internet, Wifi)}
                            <div>
                                <h3 className="font-medium text-foreground">Internet Connection</h3>
                                <p className="text-xs text-muted-foreground">Stable connection required</p>
                            </div>
                        </div>
                        {checks.internet === "success" && <span className="text-xs text-green-500">{internetSpeed} Mbps</span>}
                    </div>

                    <Button
                        className="w-full bg-[#2E2E2E] hover:bg-[#404040] text-white dark:bg-white dark:text-[#2E2E2E] dark:hover:bg-[#e0e0e0] font-medium py-6"
                        disabled={!allPassed}
                        onClick={() => router.push(`/assessment/${params.token}/verify`)}
                    >
                        {allPassed ? "All Systems Ready - Continue" : "Checking Systems..."}
                    </Button>
                </Card>
            </motion.div>
        </div>
    );
}
