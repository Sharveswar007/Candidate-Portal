"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function CompletionPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md w-full text-center"
            >
                <div className="mb-8">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 10, delay: 0.2 }}
                        className="h-24 w-24 bg-[#2E2E2E] rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl"
                    >
                        <CheckCircle className="h-12 w-12 text-white" />
                    </motion.div>
                    <h1 className="text-3xl font-bold text-foreground mb-2">Assessment Completed!</h1>
                    <p className="text-muted-foreground">Your results have been securely submitted.</p>
                </div>

                <Card className="p-6 bg-card border-border mb-8">
                    <p className="text-foreground">
                        Thank you for taking the time to complete the assessment. Our team will review your results and get back to you within <span className="text-foreground font-semibold">48 hours</span>.
                    </p>
                </Card>

                <Link href="/">
                    <Button variant="outline" className="text-muted-foreground hover:text-foreground border-border hover:border-[#2E2E2E]">
                        Return to Home
                    </Button>
                </Link>
            </motion.div>
        </div>
    );
}
