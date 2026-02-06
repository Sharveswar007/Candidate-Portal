"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Mail, Lock, Eye, EyeOff, Zap } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isSignUp) {
                const { error, data } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${location.origin}/auth/callback`,
                        data: { role: "candidate" } // Force candidate role on signup here
                    },
                });
                if (error) throw error;
                toast.success("Account created! Please check your email to verify.");
            } else {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;

                // Dual Login Check
                if (data.user) {
                    const { data: profile } = await supabase
                        .from("profiles")
                        .select("role, onboarding_complete")
                        .eq("id", data.user.id)
                        .single();

                    if (profile?.role === "recruiter" || profile?.role === "hr") {
                        await supabase.auth.signOut();
                        toast.error("Recruiters must use the HR Portal", {
                            description: "Redirecting you to the HR Dashboard...",
                            duration: 3000,
                        });
                        setTimeout(() => {
                            window.location.href = "http://localhost:3001";
                        }, 1500);
                        return;
                    }

                    // Check if onboarding is complete
                    if (!profile?.onboarding_complete) {
                        toast.success("Welcome! Let's complete your profile.");
                        router.push("/candidate/onboarding");
                        return;
                    }
                }

                toast.success("Signed in successfully!");
                router.push("/candidate/dashboard");
            }
        } catch (error: any) {
            toast.error(error.message || "Authentication failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-md"
            >
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 mb-4">
                        <div className="h-12 w-12 rounded-xl bg-[#2E2E2E] dark:bg-white flex items-center justify-center shadow-lg">
                            <Zap className="h-6 w-6 text-white dark:text-[#2E2E2E]" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-[#2E2E2E] dark:text-white">
                        HIRENEX
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        AI-Powered Talent Evaluation
                    </p>
                </div>

                <Card className="p-8 border-[#e0e0e0] dark:border-[#4a4a4a] shadow-xl">
                    <div className="mb-6 text-center">
                        <h2 className="text-xl font-semibold">
                            {isSignUp ? "Create Account" : "Welcome Back"}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            {isSignUp
                                ? "Sign up to start your assessment journey"
                                : "Sign in to continue your assessment"}
                        </p>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-10"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pl-10 pr-10"
                                    required
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 text-base bg-[#2E2E2E] hover:bg-[#404040] text-white dark:bg-white dark:text-[#2E2E2E] dark:hover:bg-[#e0e0e0]"
                        >
                            {loading ? (
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : null}
                            {isSignUp ? "Create Account" : "Sign In"}
                        </Button>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            type="button"
                            onClick={() => setIsSignUp(!isSignUp)}
                            className="text-sm text-[#2E2E2E] hover:text-[#4a4a4a] dark:text-white dark:hover:text-[#e0e0e0] underline-offset-4 hover:underline"
                        >
                            {isSignUp
                                ? "Already have an account? Sign in"
                                : "Don't have an account? Sign up"}
                        </button>
                    </div>

                    <p className="text-xs text-center text-muted-foreground mt-6">
                        By signing in, you agree to our Terms of Service and Privacy Policy
                    </p>
                </Card>

                <p className="text-center text-sm text-muted-foreground mt-6">
                    Secure authentication powered by Supabase
                </p>
            </motion.div>
        </div>
    );
}
