"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SliderQuestion, psychometricQuestions } from "@/components/assessment";
import {
  ArrowLeft,
  ArrowRight,
  SlidersHorizontal,
  Brain,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function PsychometricPage() {
  const router = useRouter();
  const supabase = createClient();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [values, setValues] = useState<Record<string, number>>({});
  const [isComplete, setIsComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (value: number) => {
    setValues((prev) => ({
      ...prev,
      [psychometricQuestions[currentIndex].id]: value,
    }));
  };

  const handleNext = () => {
    if (currentIndex < psychometricQuestions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      completeAssessment();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const completeAssessment = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Calculate dimension averages
        const dimensions: Record<string, number[]> = {};
        
        Object.entries(values).forEach(([id, value]) => {
          const question = psychometricQuestions.find((q) => q.id === id);
          if (question) {
            if (!dimensions[question.dimension]) {
              dimensions[question.dimension] = [];
            }
            dimensions[question.dimension].push(value);
          }
        });

        const dimensionAverages: Record<string, number> = {};
        Object.entries(dimensions).forEach(([dim, vals]) => {
          dimensionAverages[dim] = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
        });

        // Save to database
        await supabase.from("psychometric_profiles").insert({
          user_id: user.id,
          openness_score: dimensionAverages["Openness"] || null,
          conscientiousness_score: dimensionAverages["Conscientiousness"] || null,
          extraversion_score: dimensionAverages["Extraversion"] || null,
          agreeableness_score: dimensionAverages["Agreeableness"] || null,
          neuroticism_score: 100 - (dimensionAverages["Emotional Stability"] || 50),
          leadership_score: dimensionAverages["Leadership"] || null,
          problem_solving_score: dimensionAverages["Problem Solving"] || null,
          adaptability_score: dimensionAverages["Adaptability"] || null,
        });
      }

      setIsComplete(true);
    } catch (error) {
      console.error("Error saving psychometric profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const currentQuestion = psychometricQuestions[currentIndex];
  const currentValue = values[currentQuestion.id] ?? 50;
  const progress = ((currentIndex + 1) / psychometricQuestions.length) * 100;

  if (isComplete) {
    // Calculate dimension averages for display
    const dimensions: Record<string, number[]> = {};
    Object.entries(values).forEach(([id, value]) => {
      const question = psychometricQuestions.find((q) => q.id === id);
      if (question) {
        if (!dimensions[question.dimension]) {
          dimensions[question.dimension] = [];
        }
        dimensions[question.dimension].push(value);
      }
    });

    const results = Object.entries(dimensions).map(([dim, vals]) => ({
      dimension: dim,
      score: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
    }));

    return (
      <div className="min-h-screen py-8 px-4">
        <div className="container max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-8"
          >
            <div className="p-4 rounded-full bg-[#2E2E2E] w-20 h-20 mx-auto flex items-center justify-center">
              <Brain className="h-10 w-10 text-white" />
            </div>

            <div className="space-y-4">
              <h1 className="text-3xl font-bold">Psychometric Profile Complete</h1>
              <p className="text-muted-foreground">
                Here's your personality and work style assessment results.
              </p>
            </div>

            <div className="grid gap-4">
              {results.map((result) => (
                <Card key={result.dimension} className="p-4 border-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{result.dimension}</span>
                    <span className="text-lg font-bold text-[#2E2E2E] dark:text-white">
                      {result.score}%
                    </span>
                  </div>
                  <Progress value={result.score} className="h-2" />
                </Card>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button variant="outline" onClick={() => router.push("/assessment")}>
                Take Full Assessment
              </Button>
              <Button
                onClick={() => router.push("/results")}
                className="bg-[#2E2E2E] hover:bg-[#404040] text-white"
              >
                View All Results
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container max-w-3xl mx-auto">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="p-3 rounded-full bg-[#2E2E2E] w-16 h-16 mx-auto flex items-center justify-center mb-4">
            <SlidersHorizontal className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Psychometric Assessment</h1>
          <p className="text-muted-foreground">
            Rate yourself on each dimension to build your personality profile.
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>Question {currentIndex + 1} of {psychometricQuestions.length}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question */}
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
        >
          <SliderQuestion
            question={currentQuestion.question}
            dimension={currentQuestion.dimension}
            minLabel={currentQuestion.minLabel}
            maxLabel={currentQuestion.maxLabel}
            initialValue={currentValue}
            onChange={handleChange}
          />
        </motion.div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>

          <Button
            onClick={handleNext}
            disabled={isLoading}
            className="bg-[#2E2E2E] hover:bg-[#404040] text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : currentIndex === psychometricQuestions.length - 1 ? (
              <>
                Complete
                <CheckCircle2 className="ml-2 h-4 w-4" />
              </>
            ) : (
              <>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
