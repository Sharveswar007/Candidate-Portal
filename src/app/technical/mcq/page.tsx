"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ChevronRight, ChevronLeft, Flag } from "lucide-react";

export default function MCQPage() {
    const router = useRouter();
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [flagged, setFlagged] = useState<number[]>([]);

    const questions = [
        {
            id: 1,
            scenario: "Your team is facing a critical deadline, but you discover a significant bug in the production environment that affects 5% of users. The bug fix is complex and might introduce regressions.",
            question: "What is your immediate next step?",
            options: [
                { id: "a", text: "Immediately deploy a hotfix to minimize user impact." },
                { id: "b", text: "Notify stakeholders and the team lead to assess the risk before acting." },
                { id: "c", text: "Rollback the last deployment to a stable version." },
                { id: "d", text: "Ignore the bug for now and focus on meeting the deadline." }
            ]
        },
        {
            id: 2,
            scenario: "You are designing a database schema for a high-traffic social media application. Read-heavy operations are expected to be 100x more frequent than write operations.",
            question: "Which strategy would best optimize performance?",
            options: [
                { id: "a", text: "Normalize the database to 3NF to ensure data integrity." },
                { id: "b", text: "Implement heavy caching and read replicas." },
                { id: "c", text: "Use a single large instance to handle all traffic." },
                { id: "d", text: "Switch to a graph database for all data storage." }
            ]
        },
        // Add more mock questions as needed
    ];

    const handleNext = () => {
        if (currentQuestion < questions.length - 1) {
            setCurrentQuestion(prev => prev + 1);
        } else {
            // Navigate to coding section
            router.push("/technical/coding/two-sum");
        }
    };

    const handlePrev = () => {
        if (currentQuestion > 0) {
            setCurrentQuestion(prev => prev - 1);
        }
    };

    const toggleFlag = () => {
        if (flagged.includes(currentQuestion)) {
            setFlagged(prev => prev.filter(q => q !== currentQuestion));
        } else {
            setFlagged(prev => [...prev, currentQuestion]);
        }
    };

    const q = questions[currentQuestion];

    return (
        <div className="flex h-[calc(100vh-64px)]">
            {/* Left: Scenario/Question */}
            <div className="w-1/2 p-8 border-r border-border overflow-y-auto">
                <div className="max-w-xl mx-auto space-y-8">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Question {currentQuestion + 1} of {questions.length}</span>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={`${flagged.includes(currentQuestion) ? "text-amber-500" : "text-muted-foreground"}`}
                            onClick={toggleFlag}
                        >
                            <Flag className="h-4 w-4 mr-2" fill={flagged.includes(currentQuestion) ? "currentColor" : "none"} />
                            {flagged.includes(currentQuestion) ? "Flagged" : "Flag for Review"}
                        </Button>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-muted/50 p-6 rounded-lg border border-border">
                            <h3 className="text-xs font-semibold text-[#2E2E2E] dark:text-white mb-2 uppercase tracking-wider">Scenario</h3>
                            <p className="text-foreground leading-relaxed text-lg">
                                {q.scenario}
                            </p>
                        </div>

                        <div>
                            <h3 className="text-xl font-medium text-foreground mb-6">
                                {q.question}
                            </h3>

                            <RadioGroup
                                value={answers[currentQuestion]}
                                onValueChange={(val) => setAnswers(prev => ({ ...prev, [currentQuestion]: val }))}
                                className="space-y-4"
                            >
                                {q.options.map((opt) => (
                                    <div key={opt.id} className="flex items-center space-x-2">
                                        <RadioGroupItem value={opt.id} id={`opt-${opt.id}`} className="border-border text-[#2E2E2E] dark:text-white" />
                                        <Label
                                            htmlFor={`opt-${opt.id}`}
                                            className="flex-1 p-4 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 cursor-pointer transition-all peer-data-[state=checked]:border-[#2E2E2E]/50 peer-data-[state=checked]:bg-[#2E2E2E]/10"
                                        >
                                            {opt.text}
                                        </Label>
                                    </div>
                                ))}
                            </RadioGroup>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right: Navigation / Summary */}
            <div className="w-1/2 bg-background p-8 flex flex-col justify-between">
                <div className="max-w-md mx-auto w-full">
                    <h2 className="text-lg font-semibold mb-6">Question Map</h2>
                    <div className="grid grid-cols-5 gap-3">
                        {questions.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentQuestion(idx)}
                                className={`
                                    h-10 w-10 rounded-lg flex items-center justify-center text-sm font-medium transition-all
                                    ${currentQuestion === idx ? "bg-[#2E2E2E] text-white dark:bg-white dark:text-[#2E2E2E] shadow-lg scale-105" :
                                        answers[idx] ? "bg-[#2E2E2E]/30 dark:bg-white/30 text-foreground border border-[#2E2E2E]/50 dark:border-white/50" :
                                            flagged.includes(idx) ? "bg-amber-900/20 text-amber-400 border border-amber-900/50" :
                                                "bg-muted text-muted-foreground hover:bg-muted/80"}
                                `}
                            >
                                {idx + 1}
                                {flagged.includes(idx) && <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-amber-500 rounded-full" />}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="max-w-md mx-auto w-full flex justify-between pt-8 border-t border-border">
                    <Button
                        variant="outline"
                        onClick={handlePrev}
                        disabled={currentQuestion === 0}
                        className="w-32"
                    >
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Previous
                    </Button>
                    <Button
                        onClick={handleNext}
                        className="w-32 bg-[#2E2E2E] dark:bg-white text-white dark:text-[#2E2E2E] hover:bg-[#404040] dark:hover:bg-[#e0e0e0]"
                    >
                        {currentQuestion === questions.length - 1 ? "Start Coding" : "Next"}
                        <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
