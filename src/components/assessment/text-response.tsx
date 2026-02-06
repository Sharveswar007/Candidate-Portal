"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MessageSquare, Send, CheckCircle, Clock, Loader2 } from "lucide-react";

interface TextResponseProps {
  question: string;
  category: string;
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
  timeLimit?: number; // in seconds
  onSubmit: (response: string) => void;
  isLoading?: boolean;
  className?: string;
}

export function TextResponse({
  question,
  category,
  placeholder = "Type your response here...",
  minLength = 50,
  maxLength = 1000,
  timeLimit,
  onSubmit,
  isLoading = false,
  className,
}: TextResponseProps) {
  const [response, setResponse] = useState("");
  const [timeRemaining, setTimeRemaining] = useState(timeLimit || 0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [wordCount, setWordCount] = useState(0);

  useEffect(() => {
    const words = response.trim().split(/\s+/).filter(Boolean).length;
    setWordCount(words);
  }, [response]);

  useEffect(() => {
    if (timeLimit && timeRemaining > 0 && !isSubmitted) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeLimit, timeRemaining, isSubmitted]);

  const handleSubmit = () => {
    if (response.length >= minLength) {
      setIsSubmitted(true);
      onSubmit(response);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getCharacterProgress = () => {
    if (response.length < minLength) {
      return (response.length / minLength) * 100;
    }
    return 100;
  };

  const isValid = response.length >= minLength && response.length <= maxLength;

  return (
    <Card className={cn("p-6 border-2 hover:border-[#2E2E2E]/30 transition-colors", className)}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-blue-500/10">
              <MessageSquare className="h-4 w-4 text-blue-500" />
            </span>
            <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
              {category}
            </span>
          </div>
          {timeLimit && timeRemaining > 0 && !isSubmitted && (
            <motion.div
              className={cn(
                "flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium",
                timeRemaining < 60
                  ? "bg-red-500/10 text-red-600 dark:text-red-400"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              )}
              animate={timeRemaining < 30 ? { scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 0.5, repeat: timeRemaining < 30 ? Infinity : 0 }}
            >
              <Clock className="h-4 w-4" />
              {formatTime(timeRemaining)}
            </motion.div>
          )}
        </div>

        {/* Question */}
        <p className="text-lg font-medium leading-relaxed">{question}</p>

        {/* Text Area */}
        <AnimatePresence mode="wait">
          {!isSubmitted ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              <Textarea
                value={response}
                onChange={(e) => setResponse(e.target.value.slice(0, maxLength))}
                placeholder={placeholder}
                className="min-h-[150px] resize-none text-base"
                disabled={isLoading}
              />

              {/* Progress & Stats */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground">
                    {wordCount} words
                  </span>
                  <span
                    className={cn(
                      "text-muted-foreground",
                      response.length < minLength && "text-amber-600 dark:text-amber-400",
                      response.length >= minLength && "text-[#2E2E2E] dark:text-white"
                    )}
                  >
                    {response.length}/{maxLength} characters
                  </span>
                </div>
                {response.length < minLength && (
                  <span className="text-amber-600 dark:text-amber-400 text-xs">
                    Minimum {minLength} characters required
                  </span>
                )}
              </div>

              {/* Progress Bar */}
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className={cn(
                    "h-full rounded-full",
                    response.length < minLength
                      ? "bg-gradient-to-r from-amber-500 to-orange-500"
                      : "bg-[#2E2E2E]"
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${getCharacterProgress()}%` }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleSubmit}
                disabled={!isValid || isLoading}
                className="w-full bg-[#2E2E2E] hover:bg-[#404040] text-white"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing Response...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Submit Response
                  </>
                )}
              </Button>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 rounded-xl bg-[#2E2E2E]/10 border border-[#2E2E2E]/20 text-center"
            >
              <CheckCircle className="h-12 w-12 mx-auto text-[#2E2E2E] dark:text-white mb-3" />
              <p className="font-medium text-[#2E2E2E] dark:text-white">
                Response submitted successfully!
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Your answer is being evaluated by AI.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
}

// Preset text response questions
export const textResponseQuestions = [
  {
    id: "communication_1",
    category: "Communication",
    question: "Describe a situation where you had to explain a complex technical concept to a non-technical audience. How did you approach it?",
    minLength: 100,
    maxLength: 800,
    timeLimit: 300,
  },
  {
    id: "communication_2",
    category: "Communication",
    question: "How would you handle a disagreement with a team member about a project approach? Walk me through your process.",
    minLength: 100,
    maxLength: 800,
    timeLimit: 300,
  },
  {
    id: "problem_solving_1",
    category: "Problem Solving",
    question: "Describe a challenging problem you faced in your work or studies. What steps did you take to solve it?",
    minLength: 100,
    maxLength: 800,
    timeLimit: 300,
  },
  {
    id: "problem_solving_2",
    category: "Problem Solving",
    question: "If you discovered a critical bug in production on a Friday evening, how would you handle the situation?",
    minLength: 100,
    maxLength: 800,
    timeLimit: 300,
  },
  {
    id: "leadership_1",
    category: "Leadership",
    question: "Describe a time when you had to lead a team or take initiative on a project. What was the outcome?",
    minLength: 100,
    maxLength: 800,
    timeLimit: 300,
  },
  {
    id: "ethics_1",
    category: "Ethics & Judgment",
    question: "Your manager asks you to do something that conflicts with your personal values but isn't illegal. How would you handle this?",
    minLength: 100,
    maxLength: 800,
    timeLimit: 300,
  },
  {
    id: "adaptability_1",
    category: "Adaptability",
    question: "Tell me about a time when you had to quickly learn a new skill or technology. How did you approach the learning process?",
    minLength: 100,
    maxLength: 800,
    timeLimit: 300,
  },
  {
    id: "teamwork_1",
    category: "Teamwork",
    question: "Describe your ideal team environment. What role do you typically play, and how do you contribute to team success?",
    minLength: 100,
    maxLength: 800,
    timeLimit: 300,
  },
];
