"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

export default function TextResponsePage() {
    const router = useRouter();
    const [answer, setAnswer] = useState("");
    const WORD_LIMIT = 300;

    const wordCount = answer.trim().split(/\s+/).filter(w => w.length > 0).length;

    const handleNext = () => {
        // Since we don't have the token in URL here easily without context/params, 
        // we'll assume a path or navigate to a generic review
        //Ideally passed via layout/context
        router.push("/assessment/demo-token/review");
    };

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-2xl mx-auto space-y-8">
                <div>
                    <h1 className="text-2xl font-bold text-foreground mb-2">Open Response</h1>
                    <p className="text-muted-foreground">Please answer the following question in your own words.</p>
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    <Card className="p-8 bg-card border-border">
                        <h3 className="text-xl font-medium text-foreground mb-6">
                            Describe a major setback you faced in a project and how you overcame it.
                        </h3>

                        <div className="space-y-2">
                            <Textarea
                                placeholder="Type your answer here..."
                                className="min-h-[200px] bg-background border-border text-foreground resize-none focus:border-[#2E2E2E] dark:focus:border-white"
                                value={answer}
                                onChange={(e) => setAnswer(e.target.value)}
                            />
                            <div className={`text-right text-xs ${wordCount > WORD_LIMIT ? "text-red-400" : "text-muted-foreground"}`}>
                                {wordCount} / {WORD_LIMIT} words
                            </div>
                        </div>
                    </Card>
                </motion.div>

                <div className="flex justify-end pt-6">
                    <Button
                        size="lg"
                        disabled={wordCount === 0 || wordCount > WORD_LIMIT}
                        onClick={handleNext}
                        className="bg-[#2E2E2E] hover:bg-[#404040] text-white"
                    >
                        Review & Submit
                        <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
