"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SliderQuestionProps {
  question: string;
  dimension: string;
  minLabel: string;
  maxLabel: string;
  initialValue?: number;
  onChange: (value: number) => void;
  showValue?: boolean;
  className?: string;
}

export function SliderQuestion({
  question,
  dimension,
  minLabel,
  maxLabel,
  initialValue = 50,
  onChange,
  showValue = true,
  className,
}: SliderQuestionProps) {
  const [value, setValue] = useState(initialValue);

  const handleChange = (newValue: number[]) => {
    const val = newValue[0];
    setValue(val);
    onChange(val);
  };

  const getGradientColor = () => {
    if (value < 33) return "from-rose-500 to-orange-500";
    if (value < 66) return "from-amber-500 to-yellow-500";
    return "from-[#2E2E2E] to-[#404040]";
  };

  return (
    <Card className={cn("p-6 border-2 hover:border-[#2E2E2E]/30 transition-colors", className)}>
      <div className="space-y-6">
        {/* Dimension Badge */}
        <div className="flex items-center justify-between">
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-[#2E2E2E]/10 text-[#2E2E2E] dark:text-white">
            {dimension}
          </span>
          {showValue && (
            <motion.span
              key={value}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={cn(
                "px-3 py-1 text-sm font-bold rounded-full bg-gradient-to-r text-white",
                getGradientColor()
              )}
            >
              {value}%
            </motion.span>
          )}
        </div>

        {/* Question */}
        <p className="text-lg font-medium leading-relaxed">{question}</p>

        {/* Slider */}
        <div className="space-y-3">
          <Slider
            defaultValue={[initialValue]}
            value={[value]}
            onValueChange={handleChange}
            max={100}
            min={0}
            step={1}
            className="w-full"
          />

          {/* Labels */}
          <div className="flex justify-between text-sm text-muted-foreground">
            <span className="max-w-[45%] text-left">{minLabel}</span>
            <span className="max-w-[45%] text-right">{maxLabel}</span>
          </div>
        </div>

        {/* Visual Indicator */}
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            className={cn("h-full rounded-full bg-gradient-to-r", getGradientColor())}
            initial={{ width: `${initialValue}%` }}
            animate={{ width: `${value}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        </div>
      </div>
    </Card>
  );
}

// Preset questions for psychometric assessment
export const psychometricQuestions = [
  {
    id: "openness_1",
    dimension: "Openness",
    question: "How open are you to trying new and unconventional approaches at work?",
    minLabel: "I prefer proven, traditional methods",
    maxLabel: "I actively seek innovative solutions",
  },
  {
    id: "openness_2",
    dimension: "Openness",
    question: "How comfortable are you with ambiguity and uncertainty in projects?",
    minLabel: "I need clear guidelines and structure",
    maxLabel: "I thrive in undefined situations",
  },
  {
    id: "conscientiousness_1",
    dimension: "Conscientiousness",
    question: "How organized and detail-oriented are you in your work?",
    minLabel: "I focus on the big picture",
    maxLabel: "I meticulously track every detail",
  },
  {
    id: "conscientiousness_2",
    dimension: "Conscientiousness",
    question: "How do you handle deadlines and commitments?",
    minLabel: "I prefer flexible timelines",
    maxLabel: "I always meet deadlines without exception",
  },
  {
    id: "extraversion_1",
    dimension: "Extraversion",
    question: "How energized do you feel when working with large teams?",
    minLabel: "I work best independently",
    maxLabel: "I thrive in collaborative environments",
  },
  {
    id: "extraversion_2",
    dimension: "Extraversion",
    question: "How comfortable are you presenting ideas to groups?",
    minLabel: "I prefer written communication",
    maxLabel: "I love public speaking and presentations",
  },
  {
    id: "agreeableness_1",
    dimension: "Agreeableness",
    question: "How do you typically handle conflicts with colleagues?",
    minLabel: "I stand firm on my position",
    maxLabel: "I prioritize harmony and compromise",
  },
  {
    id: "agreeableness_2",
    dimension: "Agreeableness",
    question: "How often do you prioritize others' needs over your own at work?",
    minLabel: "I focus on my own objectives",
    maxLabel: "I often put team needs first",
  },
  {
    id: "neuroticism_1",
    dimension: "Emotional Stability",
    question: "How do you handle high-pressure situations and tight deadlines?",
    minLabel: "I find them very stressful",
    maxLabel: "I remain calm and focused",
  },
  {
    id: "neuroticism_2",
    dimension: "Emotional Stability",
    question: "How quickly do you recover from setbacks or criticism?",
    minLabel: "It affects me for a while",
    maxLabel: "I bounce back immediately",
  },
  {
    id: "leadership_1",
    dimension: "Leadership",
    question: "How naturally do you take charge in group situations?",
    minLabel: "I prefer to follow others' lead",
    maxLabel: "I instinctively step up to lead",
  },
  {
    id: "leadership_2",
    dimension: "Leadership",
    question: "How comfortable are you making decisions that affect others?",
    minLabel: "I avoid such responsibility",
    maxLabel: "I'm very comfortable with decision authority",
  },
  {
    id: "adaptability_1",
    dimension: "Adaptability",
    question: "How well do you adjust when project requirements suddenly change?",
    minLabel: "I find it difficult to pivot",
    maxLabel: "I adapt quickly and seamlessly",
  },
  {
    id: "adaptability_2",
    dimension: "Adaptability",
    question: "How open are you to learning new technologies or methodologies?",
    minLabel: "I prefer mastering what I know",
    maxLabel: "I continuously seek to learn new things",
  },
  {
    id: "problem_solving_1",
    dimension: "Problem Solving",
    question: "How do you approach complex problems with no clear solution?",
    minLabel: "I seek guidance from others",
    maxLabel: "I independently analyze and solve them",
  },
  {
    id: "problem_solving_2",
    dimension: "Problem Solving",
    question: "How do you balance speed vs. thoroughness when solving problems?",
    minLabel: "I prioritize quick solutions",
    maxLabel: "I ensure comprehensive analysis first",
  },
];
