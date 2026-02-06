"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

export default function SlidersPage() {
    const router = useRouter();
    const [answers, setAnswers] = useState<Record<number, number>>({});

    const statements = [
        { id: 1, text: "I stay calm under pressure", left: "Strongly Disagree", right: "Strongly Agree" },
        { id: 2, text: "I enjoy leading teams", left: "Prefer Following", right: "Love Leading" },
        { id: 3, text: "I pay attention to details", left: "Big Picture Only", right: "Detail Oriented" },
        { id: 4, text: "I adapt easily to change", left: "Prefer Routine", right: "Embrace Change" }
    ];

    const isComplete = Object.keys(answers).length === statements.length;

    const handleNext = () => {
        router.push("/psychometric/text");
    };

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-2xl mx-auto space-y-8">
                <div>
                    <h1 className="text-2xl font-bold text-foreground mb-2">Personality Traits</h1>
                    <p className="text-muted-foreground">Rate how much you agree with the following statements.</p>
                </div>

                <div className="space-y-8">
                    {statements.map((stmt, index) => (
                        <motion.div
                            key={stmt.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Card className="p-8 bg-card border-border">
                                <h3 className="text-xl font-medium text-center text-foreground mb-8">
                                    "{stmt.text}"
                                </h3>

                                <div className="space-y-6">
                                    <Slider
                                        defaultValue={[5]}
                                        max={10}
                                        min={1}
                                        step={1}
                                        onValueChange={(val) => setAnswers(prev => ({ ...prev, [stmt.id]: val[0] }))}
                                        className="py-4"
                                    />

                                    <div className="flex justify-between text-sm font-medium text-muted-foreground uppercase tracking-wide">
                                        <span>{stmt.left}</span>
                                        <span>{stmt.right}</span>
                                    </div>
                                </div>

                                {answers[stmt.id] && (
                                    <div className="mt-4 text-center">
                                        <span className="inline-block px-3 py-1 rounded-full bg-[#2E2E2E]/10 text-[#2E2E2E] dark:text-white text-sm font-bold">
                                            {answers[stmt.id]}/10
                                        </span>
                                    </div>
                                )}
                            </Card>
                        </motion.div>
                    ))}
                </div>

                <div className="flex justify-end pt-6">
                    <Button
                        size="lg"
                        disabled={!isComplete}
                        onClick={handleNext}
                        className="bg-[#2E2E2E] hover:bg-[#404040] text-white"
                    >
                        Next Section
                        <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
