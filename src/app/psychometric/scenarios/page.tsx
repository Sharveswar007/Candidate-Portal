"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

export default function ScenariosPage() {
    const router = useRouter();
    const [answers, setAnswers] = useState<Record<number, string>>({});

    const scenarios = [
        {
            id: 1,
            text: "A team member consistently misses deadlines, affecting your work. How do you handle this?",
            options: [
                "Report them to the manager immediately",
                "Have a private conversation to understand their challenges",
                "Ignore it and focus on your own work",
                "Publicly call them out during the next stand-up"
            ]
        },
        {
            id: 2,
            text: "You discover a major flaw in your project design that would require significant rework just days before the deadline.",
            options: [
                "Hide the flaw and hope nobody notices",
                "Work overtime to fix it without telling anyone",
                "Immediately inform stakeholders and propose a revised timeline",
                "Blame the requirements gathering phase"
            ]
        }
    ];

    const isComplete = Object.keys(answers).length === scenarios.length;

    const handleNext = () => {
        router.push("/psychometric/sliders");
    };

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-2xl mx-auto space-y-8">
                <div>
                    <h1 className="text-2xl font-bold text-foreground mb-2">Situational Judgment</h1>
                    <p className="text-muted-foreground">Select the most appropriate action for each workplace scenario.</p>
                </div>

                <div className="space-y-6">
                    {scenarios.map((scenario, index) => (
                        <motion.div
                            key={scenario.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Card className="p-6 bg-card border-border">
                                <h3 className="text-lg font-medium text-foreground mb-4">
                                    {index + 1}. {scenario.text}
                                </h3>
                                <RadioGroup
                                    onValueChange={(val) => setAnswers(prev => ({ ...prev, [scenario.id]: val }))}
                                    className="space-y-3"
                                >
                                    {scenario.options.map((option, i) => (
                                        <div key={i} className="flex items-center space-x-3 p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors">
                                            <RadioGroupItem value={option} id={`s${scenario.id}-o${i}`} className="border-border text-[#2E2E2E] dark:text-white" />
                                            <Label htmlFor={`s${scenario.id}-o${i}`} className="flex-1 cursor-pointer text-foreground">
                                                {option}
                                            </Label>
                                        </div>
                                    ))}
                                </RadioGroup>
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
