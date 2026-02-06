"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

export default function AssessmentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const params = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);

    // In a real app, we would validate the token here
    const token = params.token as string;

    useEffect(() => {
        // Simulating token validation
        if (token) {
            setLoading(false);
            setAuthorized(true);
        }
    }, [token]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-[#2E2E2E] dark:text-white" />
            </div>
        );
    }

    if (!authorized) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-2">Invalid Assessment Link</h1>
                    <p className="text-muted-foreground">Please check your URL and try again.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            {children}
        </div>
    );
}
