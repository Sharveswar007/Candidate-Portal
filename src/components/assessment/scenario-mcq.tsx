"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Briefcase,
  ChevronRight,
  AlertCircle,
} from "lucide-react";

interface MCQOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}

interface ScenarioMCQProps {
  scenario: string;
  question: string;
  category: string;
  options: MCQOption[];
  timeLimit?: number;
  onAnswer: (selectedId: string, isCorrect: boolean) => void;
  showFeedback?: boolean;
  explanation?: string;
  className?: string;
}

export function ScenarioMCQ({
  scenario,
  question,
  category,
  options,
  timeLimit,
  onAnswer,
  showFeedback = true,
  explanation,
  className,
}: ScenarioMCQProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(timeLimit || 0);

  const handleSelect = (optionId: string) => {
    if (isAnswered) return;
    setSelectedOption(optionId);
  };

  const handleSubmit = () => {
    if (!selectedOption || isAnswered) return;
    
    const selected = options.find((o) => o.id === selectedOption);
    const isCorrect = selected?.isCorrect || false;
    setIsAnswered(true);
    onAnswer(selectedOption, isCorrect);
  };

  const getOptionState = (option: MCQOption) => {
    if (!isAnswered) {
      return selectedOption === option.id ? "selected" : "default";
    }
    if (option.isCorrect) return "correct";
    if (selectedOption === option.id && !option.isCorrect) return "incorrect";
    return "default";
  };

  const optionStyles = {
    default: "border-border hover:border-[#2E2E2E]/50 hover:bg-accent/50",
    selected: "border-[#2E2E2E] bg-[#2E2E2E]/10 ring-2 ring-[#2E2E2E]/30",
    correct: "border-[#2E2E2E] bg-[#2E2E2E]/10",
    incorrect: "border-red-500 bg-red-500/10",
  };

  return (
    <Card className={cn("p-6 border-2", className)}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-[#2E2E2E]/10">
              <Briefcase className="h-4 w-4 text-[#2E2E2E] dark:text-white" />
            </span>
            <span className="px-3 py-1 text-xs font-medium rounded-full bg-[#2E2E2E]/10 text-[#2E2E2E] dark:text-white">
              {category}
            </span>
          </div>
          {timeLimit && timeRemaining > 0 && !isAnswered && (
            <div className="flex items-center gap-1 text-muted-foreground text-sm">
              <Clock className="h-4 w-4" />
              {Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, "0")}
            </div>
          )}
        </div>

        {/* Scenario */}
        <div className="p-4 rounded-xl bg-muted/50 border border-border">
          <p className="text-sm text-muted-foreground mb-2 font-medium">SCENARIO:</p>
          <p className="text-base leading-relaxed">{scenario}</p>
        </div>

        {/* Question */}
        <p className="text-lg font-semibold">{question}</p>

        {/* Options */}
        <div className="space-y-3">
          {options.map((option, index) => {
            const state = getOptionState(option);
            return (
              <motion.button
                key={option.id}
                onClick={() => handleSelect(option.id)}
                disabled={isAnswered}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  "w-full p-4 rounded-xl border-2 text-left transition-all duration-200 flex items-start gap-3",
                  optionStyles[state],
                  isAnswered && "cursor-not-allowed"
                )}
              >
                {/* Option Letter */}
                <span
                  className={cn(
                    "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold",
                    state === "default" && "bg-muted text-muted-foreground",
                    state === "selected" && "bg-[#2E2E2E] text-white",
                    state === "correct" && "bg-[#2E2E2E] text-white",
                    state === "incorrect" && "bg-red-500 text-white"
                  )}
                >
                  {String.fromCharCode(65 + index)}
                </span>

                {/* Option Text */}
                <span className="flex-1 pt-1">{option.text}</span>

                {/* Feedback Icon */}
                {isAnswered && showFeedback && (
                  <span className="flex-shrink-0 pt-1">
                    {option.isCorrect ? (
                      <CheckCircle2 className="h-5 w-5 text-[#2E2E2E] dark:text-white" />
                    ) : selectedOption === option.id ? (
                      <XCircle className="h-5 w-5 text-red-500" />
                    ) : null}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Explanation */}
        <AnimatePresence>
          {isAnswered && showFeedback && explanation && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-700 dark:text-blue-400 mb-1">
                    Explanation
                  </p>
                  <p className="text-sm text-muted-foreground">{explanation}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit Button */}
        {!isAnswered && (
          <Button
            onClick={handleSubmit}
            disabled={!selectedOption}
            className="w-full bg-[#2E2E2E] hover:bg-[#404040] text-white"
          >
            Submit Answer
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </Card>
  );
}

// Preset scenario-based MCQ questions
export const scenarioMCQQuestions = [
  {
    id: "workplace_ethics_1",
    category: "Workplace Ethics",
    scenario: "You're working on a critical project with a tight deadline. A colleague shares a shortcut that would save significant time, but you notice it bypasses some quality checks. The colleague mentions that management won't notice since the final output looks the same.",
    question: "What would you do in this situation?",
    options: [
      { id: "a", text: "Use the shortcut since the deadline is critical and management won't notice.", isCorrect: false },
      { id: "b", text: "Raise your concerns with the colleague and suggest discussing with the manager about the deadline.", isCorrect: true },
      { id: "c", text: "Ignore the suggestion and work overtime to meet the deadline properly.", isCorrect: false },
      { id: "d", text: "Report the colleague to management immediately.", isCorrect: false },
    ],
    explanation: "The best approach is to address concerns constructively. Raising issues with the colleague first shows teamwork, while involving management about realistic timelines demonstrates professional judgment. Simply reporting or using shortcuts isn't ideal.",
  },
  {
    id: "team_conflict_1",
    category: "Team Dynamics",
    scenario: "During a team meeting, two senior team members get into a heated argument about the technical approach for a project. The discussion becomes unproductive, and other team members look uncomfortable. You have some ideas that might help bridge both perspectives.",
    question: "How would you handle this situation?",
    options: [
      { id: "a", text: "Stay quiet and let them work it out themselves since they're senior.", isCorrect: false },
      { id: "b", text: "Wait for a pause and calmly suggest taking a short break, then share your bridging idea.", isCorrect: true },
      { id: "c", text: "Interrupt immediately and share your solution to end the argument.", isCorrect: false },
      { id: "d", text: "Leave the meeting and send your thoughts via email later.", isCorrect: false },
    ],
    explanation: "Waiting for an appropriate moment and suggesting a break shows emotional intelligence. Sharing a bridging idea demonstrates initiative while being respectful of the ongoing discussion.",
  },
  {
    id: "client_handling_1",
    category: "Client Relations",
    scenario: "A client calls you extremely upset because they received the wrong deliverable. After investigating, you realize it was indeed your team's mistake. The client is demanding immediate resolution and threatening to escalate to your senior management.",
    question: "What is the best way to handle this situation?",
    options: [
      { id: "a", text: "Apologize profusely and offer a significant discount to calm them down.", isCorrect: false },
      { id: "b", text: "Explain that mistakes happen and ask them to be patient while you fix it.", isCorrect: false },
      { id: "c", text: "Acknowledge the mistake, apologize sincerely, outline specific steps and timeline to fix it.", isCorrect: true },
      { id: "d", text: "Transfer the call to your manager since the client wants to escalate anyway.", isCorrect: false },
    ],
    explanation: "Taking ownership, apologizing sincerely, and providing a clear action plan demonstrates accountability and professionalism. Clients typically want to know the problem is understood and being addressed with a clear timeline.",
  },
  {
    id: "priority_management_1",
    category: "Priority Management",
    scenario: "You have three tasks due by end of day: 1) A presentation for tomorrow's client meeting, 2) A bug fix that's blocking a colleague's work, and 3) A monthly report that your manager asked for this morning. It's now 2 PM and you can realistically complete only two tasks.",
    question: "How would you prioritize and communicate?",
    options: [
      { id: "a", text: "Work on the manager's report first since they asked for it directly.", isCorrect: false },
      { id: "b", text: "Fix the bug first, then the presentation, and inform your manager about the report delay.", isCorrect: true },
      { id: "c", text: "Work on all three partially so each stakeholder sees progress.", isCorrect: false },
      { id: "d", text: "Complete the presentation first since it affects the client.", isCorrect: false },
    ],
    explanation: "The bug fix unblocks a colleague (immediate dependency), and the presentation is client-facing for tomorrow. Proactively informing your manager about the report delay shows good communication and priority management.",
  },
  {
    id: "innovation_1",
    category: "Innovation & Initiative",
    scenario: "You've identified a process improvement that could save your team 5 hours per week. However, implementing it would require a 2-day initial time investment and changes to how everyone works. Your team is currently in the middle of a busy quarter.",
    question: "What approach would you take?",
    options: [
      { id: "a", text: "Implement it immediately since the long-term benefits outweigh the short-term cost.", isCorrect: false },
      { id: "b", text: "Wait until the quiet season to avoid disrupting current work.", isCorrect: false },
      { id: "c", text: "Document the idea and present it to your manager with a proposed timeline after the busy period.", isCorrect: true },
      { id: "d", text: "Implement it yourself first to prove it works before telling anyone.", isCorrect: false },
    ],
    explanation: "Documenting the idea and proposing a timeline shows initiative while being considerate of current workloads. It also involves appropriate stakeholders in decision-making about changes that affect the team.",
  },
  {
    id: "feedback_1",
    category: "Feedback & Growth",
    scenario: "During your performance review, your manager provides feedback that you struggle with time estimation for tasks - often underestimating how long things take. You feel this feedback is partially unfair because external dependencies often cause delays.",
    question: "How would you respond to this feedback?",
    options: [
      { id: "a", text: "Explain that the external dependencies are the real problem, not your estimation.", isCorrect: false },
      { id: "b", text: "Accept the feedback quietly and commit to doing better.", isCorrect: false },
      { id: "c", text: "Thank them for the feedback, acknowledge the issue, and discuss both your estimation process and external factors.", isCorrect: true },
      { id: "d", text: "Ask for specific examples before responding to the feedback.", isCorrect: false },
    ],
    explanation: "Receiving feedback gracefully while also having a constructive discussion shows maturity. Acknowledging your part while also raising external factors demonstrates self-awareness and opens a collaborative dialogue.",
  },
];
