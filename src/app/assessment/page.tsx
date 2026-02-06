// TalentPulse Multi-Modal Assessment Page
// 4 Stages: MCQ (10) → Coding (3) → Text (3) → Slider (12)
// Total: 28 items, ~90 minutes

"use client";

import { useEffect, useState, useCallback, Suspense, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Brain,
  Code2,
  MessageSquareText,
  SlidersHorizontal,
  Shield,
  AlertTriangle,
  Loader2,
  Play,
  Target,
  Trophy,
  Timer,
  ChevronRight,
  Sparkles,
  Zap,
  Star,
  Rocket,
  Camera,
  Maximize,
  Video,
  XCircle,
  Monitor,
  MonitorX,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Editor from "@monaco-editor/react";

// Dynamic import ProctoringMonitor to prevent SSR issues with face-api.js
const ProctoringMonitor = dynamic(
  () => import("@/components/proctoring").then((mod) => mod.ProctoringMonitor),
  { ssr: false }
);

// Assessment phases
type Phase = "intro" | "setup" | "mcq" | "coding" | "text" | "psychometric" | "review" | "complete";

// Type definitions
interface MCQQuestion {
  id: string;
  category: string;
  difficulty: string;
  scenario_text: string;
  question_text: string;
  options: { id: string; text: string }[];
  correct_option_id: string;
  points: number;
  time_limit_seconds: number;
}

interface CodingChallenge {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  category: string;
  starter_code: Record<string, string>;
  test_cases: { input: string; expected: string; hidden: boolean }[];
  time_limit_minutes: number;
  max_points: number;
}

interface TextQuestion {
  id: string;
  category: string;
  question_text: string;
  context: string;
  min_words: number;
  max_words: number;
  time_limit_seconds: number;
  max_points: number;
}

interface PsychQuestion {
  id: string;
  dimension: string;
  question_text: string;
  scale_min_label: string;
  scale_max_label: string;
  reverse_scored: boolean;
  category: string;
}

// Stage info with theme colors
const stageInfo = [
  { id: "mcq", label: "Scenario MCQs", icon: Brain, count: 10, time: "12-15 min", gradient: "from-[#2E2E2E] to-[#404040]", bg: "bg-[#2E2E2E]/10" },
  { id: "coding", label: "Coding", icon: Code2, count: 3, time: "60-75 min", gradient: "from-[#2E2E2E] to-[#404040]", bg: "bg-[#2E2E2E]/10" },
  { id: "text", label: "Written", icon: MessageSquareText, count: 3, time: "12-15 min", gradient: "from-[#2E2E2E] to-[#404040]", bg: "bg-[#2E2E2E]/10" },
  { id: "psychometric", label: "Self-Assessment", icon: SlidersHorizontal, count: 12, time: "4-5 min", gradient: "from-[#2E2E2E] to-[#404040]", bg: "bg-[#2E2E2E]/10" },
];




function AssessmentPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId");
  const supabase = createClient();

  // Core state
  const [user, setUser] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("intro");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [proctorEnabled, setProctorEnabled] = useState(false);
  const [monitorMinimized, setMonitorMinimized] = useState(false);
  
  // Disqualification state
  const [isDisqualified, setIsDisqualified] = useState(false);
  const [disqualificationReason, setDisqualificationReason] = useState<string | null>(null);

  // Setup phase state
  const [cameraPermission, setCameraPermission] = useState<"pending" | "granted" | "denied">("pending");
  const [screenPermission, setScreenPermission] = useState<"pending" | "granted" | "denied">("pending");
  const [fullscreenActive, setFullscreenActive] = useState(false);
  const [setupStream, setSetupStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  
  // Ref to keep the camera preview video element
  const cameraPreviewRef = useRef<HTMLVideoElement | null>(null);
  
  // Callback ref for camera preview - ensures video plays properly
  const cameraPreviewCallback = useCallback((video: HTMLVideoElement | null) => {
    cameraPreviewRef.current = video;
    if (video && setupStream) {
      // Always set srcObject and try to play
      if (video.srcObject !== setupStream) {
        video.srcObject = setupStream;
      }
      // Ensure video is playing
      video.play().catch(err => console.warn("Camera preview play error:", err));
    }
  }, [setupStream]);
  
  // Effect to keep camera preview active when screen sharing changes
  useEffect(() => {
    const video = cameraPreviewRef.current;
    if (video && setupStream) {
      if (video.srcObject !== setupStream) {
        video.srcObject = setupStream;
      }
      video.play().catch(err => console.warn("Camera preview play error:", err));
    }
  }, [screenPermission, setupStream]);

  // Questions from database
  const [mcqQuestions, setMcqQuestions] = useState<MCQQuestion[]>([]);
  const [codingChallenges, setCodingChallenges] = useState<CodingChallenge[]>([]);
  const [textQuestions, setTextQuestions] = useState<TextQuestion[]>([]);
  const [psychQuestions, setPsychQuestions] = useState<PsychQuestion[]>([]);

  // MCQ state
  const [currentMcq, setCurrentMcq] = useState(0);
  const [mcqAnswers, setMcqAnswers] = useState<Record<string, string>>({});

  // Coding state
  const [currentCoding, setCurrentCoding] = useState(0);
  const [codeAnswers, setCodeAnswers] = useState<Record<string, string>>({});
  const [codeLanguage, setCodeLanguage] = useState("python");
  const [codeOutput, setCodeOutput] = useState<string>("");
  const [runningCode, setRunningCode] = useState(false);

  // Text response state
  const [currentText, setCurrentText] = useState(0);
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({});
  const [textTimer, setTextTimer] = useState(300);

  // Psychometric state
  const [currentPsych, setCurrentPsych] = useState(0);
  const [psychAnswers, setPsychAnswers] = useState<Record<string, number>>({});

  // Timer state
  const [stageStartTime, setStageStartTime] = useState<number>(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);

  // Load questions - First try AI generation, fallback to database
  const loadQuestions = useCallback(async () => {
    try {
      setGeneratingQuestions(true);

      // Try AI-generated questions first
      const aiResponse = await fetch("/api/questions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "both",
          count: 10,
          jobId: jobId // Pass job ID from search params
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();

        if (aiData.mcq_questions?.length > 0) {
          setMcqQuestions(aiData.mcq_questions);
        }

        if (aiData.coding_challenges?.length > 0) {
          setCodingChallenges(aiData.coding_challenges);
        }
      }

      // If AI generation failed or returned empty, fallback to database
      if (mcqQuestions.length === 0) {
        const { data: mcqs } = await supabase.from("mcq_questions").select("*").order("id");
        if (mcqs) setMcqQuestions(mcqs);
      }

      if (codingChallenges.length === 0) {
        const { data: coding } = await supabase.from("coding_challenges").select("*").order("difficulty");
        if (coding) setCodingChallenges(coding);
      }

      // Text and psychometric questions from database (these are standardized)
      const { data: texts } = await supabase.from("text_questions").select("*").order("id");
      if (texts) setTextQuestions(texts);

      const { data: psychs } = await supabase.from("psychometric_questions").select("*").order("id");
      if (psychs) setPsychQuestions(psychs);

      setGeneratingQuestions(false);
    } catch (error) {
      console.error("Failed to load questions:", error);
      setGeneratingQuestions(false);
    }
  }, [supabase, mcqQuestions.length, codingChallenges.length]);

  // Initialize user and load questions
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUser(user);
      await loadQuestions();
      setLoading(false);
    };
    init();
  }, [router, supabase, loadQuestions]);

  // Timer effect
  useEffect(() => {
    if (phase === "intro" || phase === "review" || phase === "complete") return;
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - stageStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, stageStartTime]);

  // Text question timer
  useEffect(() => {
    if (phase !== "text" || textTimer <= 0) return;
    const interval = setInterval(() => {
      setTextTimer((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, textTimer]);

  // Track fullscreen state changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreenActive(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Cleanup setup stream and screen stream on unmount
  useEffect(() => {
    return () => {
      if (setupStream) {
        setupStream.getTracks().forEach(track => track.stop());
      }
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [setupStream, screenStream]);

  // Handle disqualification (e.g., multiple faces detected)
  const handleDisqualification = useCallback(async (reason: string) => {
    setIsDisqualified(true);
    setDisqualificationReason(reason);
    
    // Mark session as flagged (disqualified) in database
    // Using 'flagged' status since 'disqualified' is not in the schema constraint
    // Store reason in recommendation_rationale field
    if (sessionId) {
      await supabase
        .from("assessment_sessions")
        .update({
          status: "flagged",
          completed_at: new Date().toISOString(),
          recommendation_rationale: `DISQUALIFIED: ${reason}`,
          proctoring_flags: 999, // High flag count indicates disqualification
        })
        .eq("id", sessionId);
    }
    
    // Stop all streams
    if (setupStream) {
      setupStream.getTracks().forEach(track => track.stop());
    }
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
    }
    
    // Exit fullscreen
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    
    toast.error("Assessment terminated due to proctoring violation.");
  }, [sessionId, setupStream, screenStream, supabase]);

  // Start assessment session
  const startAssessment = async () => {
    if (!user) {
      toast.error("Please log in to start the assessment.");
      return;
    }
    if (!user.id) {
      toast.error("User session invalid. Please log in again.");
      return;
    }
    if (!jobId) {
      toast.error("No job selected. Please access assessment from a job listing.");
      return;
    }

    console.log("[Assessment] Starting session for user:", user.id, "job:", jobId);

    try {
      // Check if session already exists for this job
      const { data: existingSession, error: sessionError } = await supabase
        .from("assessment_sessions")
        .select("id, status, recommendation_rationale, proctoring_flags")
        .eq("candidate_id", user.id)
        .eq("job_id", jobId)
        .maybeSingle();

      if (sessionError) {
        console.error("Session query error:", sessionError);
        throw sessionError;
      }

      if (existingSession) {
        if (existingSession.status === "completed") {
          toast.error("You have already completed the assessment for this job.");
          return;
        }
        // Check if previously disqualified (flagged with high proctoring_flags or DISQUALIFIED in rationale)
        if (existingSession.status === "flagged" && 
            (existingSession.proctoring_flags >= 999 || 
             existingSession.recommendation_rationale?.startsWith("DISQUALIFIED:"))) {
          setIsDisqualified(true);
          const reason = existingSession.recommendation_rationale?.replace("DISQUALIFIED: ", "") || 
                         "You have been disqualified from this assessment due to a proctoring violation. Re-attempts are not allowed.";
          setDisqualificationReason(reason);
          toast.error("You have been disqualified from this assessment.");
          return;
        }
        // Resume existing session
        setSessionId(existingSession.id);
        toast.info("Resuming your previous session...");
      } else {
        // Create new session WITH job_id
        const { data, error } = await supabase
          .from("assessment_sessions")
          .insert({
            candidate_id: user.id,
            job_id: jobId,
            session_type: "full",
            status: "in_progress",
            proctoring_enabled: true,
            time_limit_minutes: 90,
          })
          .select()
          .single();

        if (error) {
          console.error("Insert error details:", {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          });
          throw new Error(error.message || "Failed to create session");
        }
        if (!data) {
          throw new Error("Session created but no data returned");
        }
        setSessionId(data.id);
      }

      setProctorEnabled(false); // Will enable after setup
      setPhase("setup");
      toast.info("Please enable camera and fullscreen to begin.");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Failed to start session:", errorMessage, error);
      toast.error(`Failed to start assessment: ${errorMessage}`);
    }
  };

  // Handle MCQ answer
  const selectMcqAnswer = (optionId: string) => {
    const q = mcqQuestions[currentMcq];
    setMcqAnswers((prev) => ({ ...prev, [q.id]: optionId }));
  };

  // Navigate MCQ
  const nextMcq = async () => {
    const q = mcqQuestions[currentMcq];
    const answer = mcqAnswers[q.id];

    // Store answer locally - will be submitted via scoring API at the end
    // No need to insert to mcq_responses during the assessment
    // The scoring API will handle all response storage

    if (currentMcq < mcqQuestions.length - 1) {
      setCurrentMcq((prev) => prev + 1);
    } else {
      setPhase("coding");
      setStageStartTime(Date.now());
      if (codingChallenges.length > 0) {
        const starter = codingChallenges[0].starter_code;
        setCodeAnswers({ [codingChallenges[0].id]: starter?.javascript || "" });
      }
    }
  };

  // Run code
  const runCode = async () => {
    const challenge = codingChallenges[currentCoding];
    const code = codeAnswers[challenge.id] || "";

    if (!code.trim()) {
      setCodeOutput("[ERROR] No code provided. Please write your solution first.");
      return;
    }

    setRunningCode(true);
    setCodeOutput("Running tests...\n");

    try {
      // Get visible test cases
      const testCases = challenge.test_cases?.filter((t: { hidden?: boolean }) => !t.hidden) || [];

      if (testCases.length === 0) {
        // Just run the code without test cases
        const response = await fetch("/api/challenges/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, language: codeLanguage }),
        });
        const result = await response.json();
        setCodeOutput(result.output || result.error || "No output");
        return;
      }

      // Run each test case
      let output = "";
      let passedCount = 0;

      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        // Convert JSON to Python-compatible format (null -> None, true -> True, false -> False)
        let testInput = typeof testCase.input === "string" ? testCase.input : JSON.stringify(testCase.input);
        testInput = testInput.replace(/\bnull\b/g, "None").replace(/\btrue\b/g, "True").replace(/\bfalse\b/g, "False");

        // Wrap user code to call the main function and print result
        // Detect the function name from the code (usually first 'def' statement)
        const functionMatch = code.match(/def\s+(\w+)\s*\(/);
        const functionName = functionMatch ? functionMatch[1] : "solve";

        // Create test wrapper code for Python
        const wrappedCode = `${code}

# Auto-generated test execution
_test_input = ${testInput}
try:
    _result = ${functionName}(_test_input)
except TypeError as e:
    if isinstance(_test_input, list):
        _result = ${functionName}(*_test_input)
    else:
        raise e
print("__RESULT__:" + str(_result))
`;

        const response = await fetch("/api/challenges/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: wrappedCode, language: codeLanguage }),
        });

        const result = await response.json();
        const wholeOutput = (result.output || "").trim();
        const resultLine = wholeOutput.split("\n").find((line: string) => line.startsWith("__RESULT__:"));
        const actualOutput = resultLine ? resultLine.replace("__RESULT__:", "").trim() : "No result returned";
        const expectedOutput = (testCase.expected || "").toString().trim();
        const passed = actualOutput === expectedOutput;

        if (passed) passedCount++;

        output += `Test ${i + 1}: ${passed ? "[PASS]" : "[FAIL]"}\n`;
        output += `  Input: ${testInput}\n`;
        if (!passed) {
          if (result.error) {
            output += `  Error: ${result.error}\n`;
          } else {
            output += `  Expected: ${expectedOutput}\n`;
            output += `  Got: ${actualOutput}\n`;
          }
        }
        output += "\n";
      }

      output += `\n━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      output += `Results: ${passedCount}/${testCases.length} tests passed\n`;

      setCodeOutput(output);
    } catch (error) {
      console.error("Run code error:", error);
      setCodeOutput("[ERROR] Error running code. Please try again.");
    } finally {
      setRunningCode(false);
    }
  };

  // Navigate Coding
  const nextCoding = async () => {
    const challenge = codingChallenges[currentCoding];
    const code = codeAnswers[challenge.id] || "";

    // Store code locally - will be submitted via scoring API at the end
    // Don't insert to coding_submissions here as challenge_id may not exist in DB

    if (currentCoding < codingChallenges.length - 1) {
      setCurrentCoding((prev) => prev + 1);
      const nextChallenge = codingChallenges[currentCoding + 1];
      if (!codeAnswers[nextChallenge.id]) {
        setCodeAnswers((prev) => ({
          ...prev,
          [nextChallenge.id]: nextChallenge.starter_code?.javascript || "",
        }));
      }
      setCodeOutput("");
    } else {
      setPhase("text");
      setStageStartTime(Date.now());
      if (textQuestions.length > 0) {
        setTextTimer(textQuestions[0].time_limit_seconds);
      }
    }
  };

  // Navigate Text
  const nextText = async () => {
    const q = textQuestions[currentText];
    const answer = textAnswers[q.id] || "";

    if (sessionId && answer) {
      await supabase.from("text_responses").insert({
        session_id: sessionId,
        candidate_id: user.id,
        question_id: q.id,
        response_text: answer,
        word_count: answer.split(/\s+/).filter(Boolean).length,
      });
    }

    if (currentText < textQuestions.length - 1) {
      setCurrentText((prev) => prev + 1);
      setTextTimer(textQuestions[currentText + 1].time_limit_seconds);
    } else {
      setPhase("psychometric");
      setStageStartTime(Date.now());
    }
  };

  // Navigate Psychometric
  const nextPsych = async () => {
    const q = psychQuestions[currentPsych];
    const answer = psychAnswers[q.id];

    // Store answer locally - will be submitted via scoring API at the end
    // No need to insert to psychometric_responses during the assessment

    if (currentPsych < psychQuestions.length - 1) {
      setCurrentPsych((prev) => prev + 1);
    } else {
      setPhase("review");
    }
  };

  // Submit assessment - Triggers Stage-4 Scoring and Stage-5 Decision Engine
  const submitAssessment = async () => {
    if (!sessionId || !user) return;
    setSubmitting(true);

    try {
      // Mark session as in_progress while processing (don't change status until complete)
      // The 'processing' status is not in the DB constraint, so we keep it as 'in_progress'

      // Map MCQ category to competency
      const categoryToCompetency: Record<string, string> = {
        "Workplace Ethics": "ethics",
        "Team Dynamics": "teamwork",
        "Client Relations": "communication",
        "Priority Management": "decision_making",
        "Innovation & Initiative": "problem_solving",
        "Communication": "communication",
        "Technical": "coding_fundamentals",
      };

      // Map psychometric dimension to trait
      const dimensionToTrait: Record<string, string> = {
        "Openness": "adaptability",
        "Conscientiousness": "resilience",
        "Extraversion": "teamwork",
        "Agreeableness": "teamwork",
        "Emotional Stability": "emotional_intelligence",
        "Leadership": "leadership",
        "Adaptability": "adaptability",
      };

      // Prepare MCQ data for scoring API (technical/scenario MCQs)
      const mcqData = Object.entries(mcqAnswers).map(([qId, answer]) => {
        const q = mcqQuestions.find(q => q.id === qId);
        return {
          question_id: qId,
          question_type: "technical_mcq" as const,
          selected_option: answer,
          correct_option: q?.correct_option_id || "",
          competency: categoryToCompetency[q?.category || ""] || "problem_solving",
        };
      });

      // Prepare text responses for scoring
      const textData = Object.entries(textAnswers).map(([qId, answer]) => {
        const q = textQuestions.find(q => q.id === qId);
        return {
          question_id: qId,
          question_type: "behavioral_text" as const,
          question_text: q?.question_text || "",
          answer_text: answer,
          competency: "communication" as const,
        };
      });

      // Prepare slider/psychometric responses
      const sliderData: Record<string, number> = {};
      Object.entries(psychAnswers).forEach(([qId, value]) => {
        const q = psychQuestions.find(q => q.id === qId);
        const trait = dimensionToTrait[q?.dimension || ""] || "resilience";
        sliderData[trait] = Math.round(((sliderData[trait] || 0) + value) / 2);
      });

      // Call Stage-4 Scoring API
      const scoringRes = await fetch("/api/scoring/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attempt_id: sessionId,
          candidate_id: user.id,
          mcq_answers: mcqData,
          text_answers: textData,
          slider_responses: sliderData,
        }),
      });

      const scoringResult = await scoringRes.json();

      if (!scoringResult.success) {
        throw new Error(scoringResult.error || "Scoring failed");
      }

      // Extract scores from the summary object (where API returns them)
      const scores = scoringResult.summary || scoringResult;

      // Update session with scores from the scoring engine
      await supabase
        .from("assessment_sessions")
        .update({
          status: "completed",
          technical_score: scores.technical_score,
          psychometric_score: scores.psychometric_score,
          total_score: scores.composite_score,
          completed_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      // Call Stage-5 Decision Engine
      const decisionRes = await fetch("/api/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attempt_id: sessionId,
          candidate_id: user.id,
          technical_score: scores.technical_score,
          psychometric_score: scores.psychometric_score,
          integrity_score: scores.integrity_score,
          composite_score: scores.composite_score,
          competency_scores: scoringResult.score?.competency_scores,
          trait_scores: scoringResult.score?.trait_scores,
        }),
      });

      const decisionResult = await decisionRes.json();

      // Update session with recommendation and strengths/weaknesses
      if (decisionResult.success) {
        // Extract strength/weakness labels from the decision result
        const strengthLabels = (decisionResult.decision?.strengths || []).map(
          (s: { label?: string; competency?: string }) => s.label || s.competency
        );
        const weaknessLabels = (decisionResult.decision?.weaknesses || []).map(
          (w: { label?: string; competency?: string }) => w.label || w.competency
        );

        await supabase
          .from("assessment_sessions")
          .update({
            recommendation: decisionResult.decision.decision,
            strengths: strengthLabels,
            weaknesses: weaknessLabels,
            recommendation_rationale: decisionResult.explanation,
          })
          .eq("id", sessionId);
      }

      // Update applications table with assessment scores and advance to decision stage
      if (jobId) {
        // Fetch job configuration to check for auto_hire
        const { data: jobConfig } = await supabase
          .from("job_descriptions")
          .select("assessment_config, cutoffs_config")
          .eq("id", jobId)
          .single();

        const autoHireEnabled = jobConfig?.assessment_config?.auto_hire === true;
        const cutoffs = jobConfig?.cutoffs_config || { technical: 70, psychometric: 60 };

        let applicationDecision = "pending"; // Default: HR manual review
        let applicationStage = "decision";

        // Auto-hire logic: if enabled, automatically hire/reject based on scores
        if (autoHireEnabled) {
          const meetsRequirements = 
            scores.technical_score >= cutoffs.technical &&
            scores.psychometric_score >= (cutoffs.psychometric || 60);

          if (meetsRequirements) {
            applicationDecision = "hired";
            applicationStage = "hired";
          } else {
            applicationDecision = "rejected";
            applicationStage = "rejected";
          }
        }

        await supabase
          .from("applications")
          .update({
            current_stage: applicationStage,
            composite_score: scores.composite_score,
            decision: applicationDecision,
          })
          .eq("candidate_id", user.id)
          .eq("job_id", jobId);
      }

      setPhase("complete");
      toast.success("Assessment submitted and analyzed!");
      setTimeout(() => router.push(`/results?session=${sessionId}`), 2000);
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("Failed to submit assessment");
      // Mark session as abandoned on error (allowed status value)
      await supabase
        .from("assessment_sessions")
        .update({ status: "abandoned" })
        .eq("id", sessionId);
    } finally {
      setSubmitting(false);
    }
  };

  // Format time
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-6"
        >
          <Loader2 className="w-12 h-12 text-[#2E2E2E] dark:text-white animate-spin" />
          <p className="text-muted-foreground text-lg font-medium">Preparing your assessment...</p>
        </motion.div>
      </div>
    );
  }

  // Disqualification screen - shown when multiple faces detected or other critical violations
  if (isDisqualified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-8 max-w-lg text-center p-8"
        >
          <div className="w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center">
            <XCircle className="w-12 h-12 text-destructive" />
          </div>
          <div className="space-y-4">
            <h1 className="text-3xl font-bold text-destructive">Assessment Terminated</h1>
            <p className="text-lg text-muted-foreground">
              {disqualificationReason || "Your assessment has been terminated due to a proctoring violation."}
            </p>
          </div>
          <Card className="w-full p-6 bg-destructive/5 border-destructive/20">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-6 h-6 text-destructive flex-shrink-0 mt-0.5" />
              <div className="text-left space-y-2">
                <p className="font-semibold text-destructive">Critical Violation Detected</p>
                <p className="text-sm text-muted-foreground">
                  Multiple faces were detected during your assessment. This is a serious violation of proctoring rules.
                  Your attempt has been recorded and you are not eligible to re-attempt this assessment.
                </p>
              </div>
            </div>
          </Card>
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => router.push("/candidate/dashboard")}
              className="px-8"
            >
              Return to Dashboard
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            If you believe this was an error, please contact support with your session ID: {sessionId}
          </p>
        </motion.div>
      </div>
    );
  }

  // =====================================================
  // INTRO PHASE
  // =====================================================
  if (phase === "intro") {
    return (
      <div className="min-h-screen bg-background overflow-hidden">
        <div className="relative z-10 container max-w-5xl mx-auto px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-10"
          >
            {/* Header */}
            <div className="text-center space-y-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-[#2E2E2E]/10 border border-border backdrop-blur-sm"
              >
                <Rocket className="h-5 w-5 text-[#2E2E2E] dark:text-white" />
                <span className="text-foreground font-semibold">HIRENEX Assessment</span>
                <Sparkles className="h-5 w-5 text-[#2E2E2E] dark:text-white" />
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-5xl md:text-6xl font-bold"
              >
                <span className="text-[#2E2E2E] dark:text-white">
                  Multi-Modal
                </span>
                <br />
                <span className="text-foreground">Candidate Evaluation</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
              >
                A comprehensive assessment evaluating your technical abilities, problem-solving skills,
                and workplace competencies through 4 carefully designed stages.
              </motion.p>
            </div>

            {/* Stage Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="grid md:grid-cols-2 gap-4"
            >
              {stageInfo.map((stage, i) => (
                <motion.div
                  key={stage.id}
                  initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.1 }}
                  whileHover={{ scale: 1.02, y: -4 }}
                  className={`relative overflow-hidden rounded-2xl border border-border ${stage.bg} backdrop-blur-sm p-6 group cursor-default`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${stage.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />

                  <div className="relative flex items-center gap-5">
                    <div className={`flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${stage.gradient} shadow-lg`}>
                      <stage.icon className="h-7 w-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Stage {i + 1}</span>
                      </div>
                      <h3 className="text-lg font-semibold text-foreground">{stage.label}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {stage.count} items • {stage.time}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Time & Proctoring Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="grid md:grid-cols-2 gap-4"
            >
              {/* Duration Card */}
              <Card className="p-6 bg-muted/30 border-border backdrop-blur-sm">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-[#2E2E2E] shadow-lg">
                    <Timer className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Total Duration</h3>
                    <p className="text-muted-foreground mt-1">~90 minutes • 28 total items</p>
                    <p className="text-sm text-muted-foreground mt-2">Take your time on each question for the best results.</p>
                  </div>
                </div>
              </Card>

              {/* Proctoring Card */}
              <Card className="p-6 bg-muted/30 border-border backdrop-blur-sm">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-[#2E2E2E] shadow-lg">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">AI Proctoring</h3>
                    <p className="text-muted-foreground mt-1">Camera monitoring enabled</p>
                    <p className="text-sm text-muted-foreground mt-2">Ensure a quiet, well-lit environment.</p>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Start Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="flex justify-center pt-4"
            >
              <motion.button
                onClick={startAssessment}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                className="group relative overflow-hidden px-12 py-5 rounded-2xl bg-[#2E2E2E] hover:bg-[#404040] text-white text-lg font-semibold shadow-2xl"
              >
                <span className="relative flex items-center gap-3">
                  <Zap className="h-6 w-6" />
                  Begin Assessment
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </motion.button>
            </motion.div>
          </motion.div>
        </div>
      </div>
    );
  }

  // =====================================================
  // SETUP PHASE - Camera permission, screen share, and fullscreen
  // =====================================================
  if (phase === "setup") {
    const requestCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
          audio: true,
        });
        setSetupStream(stream);
        setCameraPermission("granted");
      } catch (error) {
        console.error("Camera permission denied:", error);
        setCameraPermission("denied");
        toast.error("Camera access is required for the proctored assessment.");
      }
    };

    const requestScreenPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 15 } },
          audio: false,
        });
        setScreenStream(stream);
        setScreenPermission("granted");
        
        // Listen for when user stops sharing
        stream.getVideoTracks()[0].addEventListener("ended", () => {
          setScreenPermission("denied");
          setScreenStream(null);
          toast.error("Screen sharing was stopped. Please re-enable to continue.");
        });
      } catch (error) {
        console.error("Screen permission denied:", error);
        setScreenPermission("denied");
        toast.error("Screen sharing is required for the proctored assessment.");
      }
    };

    const requestFullscreen = async () => {
      try {
        await document.documentElement.requestFullscreen();
        setFullscreenActive(true);
      } catch (error) {
        console.error("Fullscreen request failed:", error);
        toast.error("Fullscreen mode is required for the assessment.");
      }
    };

    const proceedToAssessment = () => {
      // Keep the setup stream - it will be passed to the proctoring monitor
      // Don't stop it here, let the proctoring monitor use it
      setProctorEnabled(true);
      setStageStartTime(Date.now());
      setPhase("mcq");
      toast.success("Assessment started! Good luck!");
    };

    const canProceed = cameraPermission === "granted" && screenPermission === "granted" && fullscreenActive;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="container max-w-2xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Header */}
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#2E2E2E]/10 border border-border">
                <Shield className="h-5 w-5 text-[#2E2E2E] dark:text-white" />
                <span className="text-foreground font-medium">Proctoring Setup</span>
              </div>
              <h2 className="text-3xl font-bold text-foreground">
                Before We Begin
              </h2>
              <p className="text-muted-foreground">
                Please enable camera access and fullscreen mode to start your proctored assessment.
              </p>
            </div>

            {/* Setup Cards */}
            <div className="space-y-4">
              {/* Camera Permission Card */}
              <Card className="p-6 border-border bg-card">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${cameraPermission === "granted" ? "bg-green-500/20" : cameraPermission === "denied" ? "bg-red-500/20" : "bg-[#2E2E2E]/10"}`}>
                    {cameraPermission === "granted" ? (
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                    ) : cameraPermission === "denied" ? (
                      <XCircle className="h-6 w-6 text-red-500" />
                    ) : (
                      <Camera className="h-6 w-6 text-[#2E2E2E] dark:text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">Camera Access</h3>
                    <p className="text-sm text-muted-foreground">
                      {cameraPermission === "granted" 
                        ? "Camera is ready for proctoring" 
                        : cameraPermission === "denied"
                        ? "Camera access was denied. Please allow camera access."
                        : "Required for AI-powered proctoring"}
                    </p>
                  </div>
                  {cameraPermission !== "granted" && (
                    <Button onClick={requestCameraPermission} variant="default">
                      <Video className="h-4 w-4 mr-2" />
                      Enable
                    </Button>
                  )}
                </div>

                {/* Camera Preview */}
                {setupStream && (
                  <div className="mt-4 rounded-lg overflow-hidden bg-black aspect-video max-w-sm mx-auto">
                    <video
                      ref={cameraPreviewCallback}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </Card>

              {/* Screen Share Card */}
              <Card className="p-6 border-border bg-card">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${screenPermission === "granted" ? "bg-green-500/20" : screenPermission === "denied" ? "bg-red-500/20" : "bg-[#2E2E2E]/10"}`}>
                    {screenPermission === "granted" ? (
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                    ) : screenPermission === "denied" ? (
                      <MonitorX className="h-6 w-6 text-red-500" />
                    ) : (
                      <Monitor className="h-6 w-6 text-[#2E2E2E] dark:text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">Screen Sharing</h3>
                    <p className="text-sm text-muted-foreground">
                      {screenPermission === "granted" 
                        ? "Screen sharing is active" 
                        : screenPermission === "denied"
                        ? "Screen sharing was denied. Please allow to continue."
                        : "Required for screen recording during assessment"}
                    </p>
                  </div>
                  {screenPermission !== "granted" && (
                    <Button onClick={requestScreenPermission} variant="default">
                      <Monitor className="h-4 w-4 mr-2" />
                      Share Screen
                    </Button>
                  )}
                </div>
              </Card>

              {/* Fullscreen Card */}
              <Card className="p-6 border-border bg-card">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${fullscreenActive ? "bg-green-500/20" : "bg-[#2E2E2E]/10"}`}>
                    {fullscreenActive ? (
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                    ) : (
                      <Maximize className="h-6 w-6 text-[#2E2E2E] dark:text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">Fullscreen Mode</h3>
                    <p className="text-sm text-muted-foreground">
                      {fullscreenActive 
                        ? "Fullscreen mode is active" 
                        : "Required for secure assessment environment"}
                    </p>
                  </div>
                  {!fullscreenActive && (
                    <Button onClick={requestFullscreen} variant="default">
                      <Maximize className="h-4 w-4 mr-2" />
                      Enable
                    </Button>
                  )}
                </div>
              </Card>
            </div>

            {/* Important Notes */}
            <Card className="p-4 bg-amber-500/10 border-amber-500/30">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-600 dark:text-amber-400">Important Notes</p>
                  <ul className="mt-2 space-y-1 text-muted-foreground">
                    <li>Your webcam and screen will be recorded throughout the assessment</li>
                    <li>Tab switching and window changes will be logged</li>
                    <li>Ensure good lighting and a quiet environment</li>
                    <li>Do not exit fullscreen or stop screen sharing during the assessment</li>
                    <li>Share your entire screen when prompted</li>
                  </ul>
                </div>
              </div>
            </Card>

            {/* Proceed Button */}
            <div className="flex justify-center">
              <Button
                onClick={proceedToAssessment}
                disabled={!canProceed}
                size="lg"
                className="px-8 py-6 text-lg"
              >
                <Zap className="h-5 w-5 mr-2" />
                Start Assessment
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>

            {!canProceed && (
              <p className="text-center text-sm text-muted-foreground">
                Please complete all three steps above to continue
              </p>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  // =====================================================
  // MCQ PHASE
  // =====================================================
  if (phase === "mcq" && mcqQuestions.length > 0) {
    const question = mcqQuestions[currentMcq];
    const progress = ((currentMcq + 1) / mcqQuestions.length) * 100;

    // Guard against undefined question
    if (!question) {
      setPhase("coding");
      return null;
    }

    return (
      <div className="min-h-screen bg-background">
        {proctorEnabled && sessionId && (
          <ProctoringMonitor
            attemptId={sessionId}
            sessionId={sessionId}
            candidateId={user?.id || ''}
            minimized={monitorMinimized}
            onMinimizeToggle={() => setMonitorMinimized(!monitorMinimized)}
            onDisqualified={handleDisqualification}
            existingStream={setupStream || undefined}
            existingScreenStream={screenStream || undefined}
          />
        )}

        {/* Progress Header */}
        <div className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border">
          <div className="container max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#2E2E2E]/10 border border-border">
                  <Brain className="h-4 w-4 text-[#2E2E2E] dark:text-white" />
                  <span className="text-foreground font-medium text-sm">Stage 1: MCQs</span>
                </div>
                <Badge variant="outline" className="border-border text-muted-foreground">
                  {currentMcq + 1} / {mcqQuestions.length}
                </Badge>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted border border-border">
                <Clock className="h-4 w-4 text-[#2E2E2E] dark:text-white" />
                <span className="text-foreground font-mono">{formatTime(elapsedTime)}</span>
              </div>
            </div>
            <div className="relative h-2 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 bg-[#2E2E2E] dark:bg-white rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </div>

        {/* Question Content */}
        <div className="container max-w-4xl mx-auto px-4 py-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={question.id}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {/* Category Badges */}
              <div className="flex items-center gap-3">
                <Badge className="bg-[#2E2E2E]/10 text-foreground border-border">
                  {question.category}
                </Badge>
                <Badge className="bg-[#2E2E2E]/10 text-foreground border-border">
                  <Star className="h-3 w-3 mr-1" />
                  {question.points} pts
                </Badge>
              </div>

              {/* Scenario */}
              {question.scenario_text && (
                <Card className="p-6 bg-card border-border backdrop-blur-sm">
                  <p className="text-muted-foreground italic leading-relaxed">{question.scenario_text}</p>
                </Card>
              )}

              {/* Question */}
              <h2 className="text-2xl font-semibold text-foreground leading-relaxed">{question.question_text}</h2>

              {/* Options */}
              <div className="space-y-4">
                {question.options.map((option, idx) => (
                  <motion.button
                    key={option.id}
                    onClick={() => selectMcqAnswer(option.id)}
                    whileHover={{ scale: 1.01, x: 4 }}
                    whileTap={{ scale: 0.99 }}
                    className={`w-full text-left p-5 rounded-xl border-2 transition-all duration-200 ${mcqAnswers[question.id] === option.id
                      ? "border-[#2E2E2E] bg-[#2E2E2E]/10 shadow-lg"
                      : "border-border bg-card hover:border-[#2E2E2E]/50 hover:bg-muted"
                      }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex items-center justify-center w-10 h-10 rounded-xl font-bold transition-all ${mcqAnswers[question.id] === option.id
                          ? "bg-[#2E2E2E] text-white"
                          : "bg-muted text-muted-foreground"
                          }`}
                      >
                        {String.fromCharCode(65 + idx)}
                      </div>
                      <span className={`text-lg ${mcqAnswers[question.id] === option.id ? "text-foreground" : "text-muted-foreground"}`}>
                        {option.text}
                      </span>
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Navigation */}
              <div className="flex justify-between pt-6">
                <Button
                  variant="outline"
                  onClick={() => setCurrentMcq(Math.max(0, currentMcq - 1))}
                  disabled={currentMcq === 0}
                  className="border-border text-muted-foreground hover:bg-muted"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
                <Button
                  onClick={nextMcq}
                  disabled={!mcqAnswers[question.id]}
                  className="bg-[#2E2E2E] hover:bg-[#404040] text-white px-8"
                >
                  {currentMcq < mcqQuestions.length - 1 ? (
                    <>Next <ArrowRight className="h-4 w-4 ml-2" /></>
                  ) : (
                    <>Continue to Coding <Code2 className="h-4 w-4 ml-2" /></>
                  )}
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // =====================================================
  // CODING PHASE
  // =====================================================
  if (phase === "coding" && codingChallenges.length > 0) {
    const challenge = codingChallenges[currentCoding];
    const progress = ((currentCoding + 1) / codingChallenges.length) * 100;

    // Guard against undefined challenge
    if (!challenge) {
      setPhase("text");
      return null;
    }

    return (
      <div className="min-h-screen bg-background">
        {proctorEnabled && sessionId && (
          <ProctoringMonitor
            attemptId={sessionId}
            sessionId={sessionId}
            candidateId={user?.id || ''}
            minimized={monitorMinimized}
            onMinimizeToggle={() => setMonitorMinimized(!monitorMinimized)}
            onDisqualified={handleDisqualification}
            existingStream={setupStream || undefined}
            existingScreenStream={screenStream || undefined}
          />
        )}

        {/* Header */}
        <div className="sticky top-0 z-40 bg-card/95 backdrop-blur-xl border-b border-border">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#2E2E2E]/10 border border-border">
                  <Code2 className="h-4 w-4 text-[#2E2E2E] dark:text-white" />
                  <span className="text-foreground font-medium text-sm">Stage 2: Coding</span>
                </div>
                <Badge className="bg-[#2E2E2E]/10 text-foreground border-border">
                  {challenge.difficulty}
                </Badge>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted border border-border">
                <Clock className="h-4 w-4 text-[#2E2E2E] dark:text-white" />
                <span className="text-foreground font-mono">{formatTime(elapsedTime)}</span>
              </div>
            </div>
            <div className="relative h-2 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 bg-[#2E2E2E] dark:bg-white rounded-full"
                animate={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Coding Content */}
        <div className="container mx-auto px-4 py-4">
          <div className="grid lg:grid-cols-2 gap-4 h-[calc(100vh-160px)]">
            {/* Problem Description */}
            <Card className="p-6 overflow-auto bg-card border-border">
              <h2 className="text-2xl font-bold text-foreground mb-4">{challenge.title}</h2>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <pre className="whitespace-pre-wrap text-muted-foreground text-sm leading-relaxed">{challenge.description}</pre>
              </div>
              <div className="mt-6 p-4 rounded-xl bg-muted border border-border">
                <p className="text-sm font-semibold text-foreground mb-3">Test Cases:</p>
                {challenge.test_cases.filter(t => !t.hidden).map((tc, i) => (
                  <div key={i} className="text-xs font-mono text-muted-foreground mb-2 p-2 rounded bg-background">
                    Input: <span className="text-[#2E2E2E] dark:text-white">{tc.input}</span> → Expected: <span className="text-[#2E2E2E] dark:text-white">{tc.expected}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Code Editor */}
            <div className="flex flex-col gap-4">
              <Card className="flex-1 overflow-hidden border-border">
                <Editor
                  height="100%"
                  language={codeLanguage}
                  value={codeAnswers[challenge.id] || challenge.starter_code?.python || "# Write your solution here\ndef solve(input):\n    pass"}
                  onChange={(value) => setCodeAnswers((prev) => ({ ...prev, [challenge.id]: value || "" }))}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: "on",
                    automaticLayout: true,
                    padding: { top: 16 },
                  }}
                />
              </Card>

              {/* Output Console */}
              <Card className="h-28 p-4 bg-background border-border font-mono text-sm overflow-auto">
                <pre className="text-foreground">{codeOutput || "// Output will appear here..."}</pre>
              </Card>

              {/* Actions */}
              <div className="flex justify-between">
                <div className="flex gap-3">
                  <Button
                    onClick={runCode}
                    disabled={runningCode}
                    className="bg-[#2E2E2E] hover:bg-[#404040] text-white"
                  >
                    {runningCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    <span className="ml-2">Run Tests</span>
                  </Button>
                  <select
                    value={codeLanguage}
                    onChange={(e) => setCodeLanguage(e.target.value)}
                    className="px-4 py-2 rounded-lg border border-border bg-muted text-foreground"
                  >
                    <option value="python">Python</option>
                  </select>
                </div>
                <Button onClick={nextCoding} className="bg-[#2E2E2E] hover:bg-[#404040] text-white">
                  {currentCoding < codingChallenges.length - 1 ? (
                    <>Next Challenge <ChevronRight className="h-4 w-4 ml-1" /></>
                  ) : (
                    <>Continue to Written <MessageSquareText className="h-4 w-4 ml-1" /></>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =====================================================
  // TEXT PHASE
  // =====================================================
  if (phase === "text" && textQuestions.length > 0) {
    const question = textQuestions[currentText];
    const progress = ((currentText + 1) / textQuestions.length) * 100;

    // Guard against undefined question
    if (!question) {
      setPhase("psychometric");
      return null;
    }

    const wordCount = (textAnswers[question.id] || "").split(/\s+/).filter(Boolean).length;

    return (
      <div className="min-h-screen bg-background">
        {proctorEnabled && sessionId && (
          <ProctoringMonitor
            attemptId={sessionId}
            sessionId={sessionId}
            candidateId={user?.id || ''}
            minimized={monitorMinimized}
            onMinimizeToggle={() => setMonitorMinimized(!monitorMinimized)}
            onDisqualified={handleDisqualification}
            existingStream={setupStream || undefined}
            existingScreenStream={screenStream || undefined}
          />
        )}

        {/* Header */}
        <div className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border">
          <div className="container max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#2E2E2E]/10 border border-border">
                  <MessageSquareText className="h-4 w-4 text-[#2E2E2E] dark:text-white" />
                  <span className="text-foreground font-medium text-sm">Stage 3: Written</span>
                </div>
              </div>
              <Badge variant={textTimer < 60 ? "destructive" : "outline"} className="gap-1">
                <Clock className="h-3 w-3" />
                {formatTime(textTimer)}
              </Badge>
            </div>
            <div className="relative h-2 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 bg-[#2E2E2E] dark:bg-white rounded-full"
                animate={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container max-w-4xl mx-auto px-4 py-10">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <Badge className="bg-[#2E2E2E]/10 text-foreground border-border">{question.category}</Badge>

            {question.context && (
              <Card className="p-5 bg-card border-border text-muted-foreground">
                {question.context}
              </Card>
            )}

            <h2 className="text-2xl font-semibold text-foreground">{question.question_text}</h2>

            <Textarea
              value={textAnswers[question.id] || ""}
              onChange={(e) => setTextAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))}
              placeholder="Write your response here..."
              className="min-h-[280px] text-base bg-card border-border text-foreground placeholder:text-muted-foreground"
            />

            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Word count: <span className={wordCount < question.min_words ? "text-amber-500" : "text-foreground font-medium"}>
                  {wordCount}
                </span> / {question.min_words}-{question.max_words}
              </div>
              <Button
                onClick={nextText}
                disabled={wordCount < question.min_words}
                className="bg-[#2E2E2E] hover:bg-[#404040] text-white"
              >
                {currentText < textQuestions.length - 1 ? (
                  <>Next <ArrowRight className="h-4 w-4 ml-2" /></>
                ) : (
                  <>Continue to Sliders <SlidersHorizontal className="h-4 w-4 ml-2" /></>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // =====================================================
  // PSYCHOMETRIC PHASE
  // =====================================================
  if (phase === "psychometric" && psychQuestions.length > 0) {
    const question = psychQuestions[currentPsych];
    const progress = ((currentPsych + 1) / psychQuestions.length) * 100;

    // Guard against undefined question
    if (!question) {
      setPhase("review");
      return null;
    }

    return (
      <div className="min-h-screen bg-background">
        {proctorEnabled && sessionId && (
          <ProctoringMonitor
            attemptId={sessionId}
            sessionId={sessionId}
            candidateId={user?.id || ''}
            minimized={monitorMinimized}
            onMinimizeToggle={() => setMonitorMinimized(!monitorMinimized)}
            onDisqualified={handleDisqualification}
            existingStream={setupStream || undefined}
            existingScreenStream={screenStream || undefined}
          />
        )}

        {/* Header */}
        <div className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border">
          <div className="container max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#2E2E2E]/10 border border-border">
                  <SlidersHorizontal className="h-4 w-4 text-[#2E2E2E] dark:text-white" />
                  <span className="text-foreground font-medium text-sm">Stage 4: Self-Assessment</span>
                </div>
                <Badge className="bg-[#2E2E2E]/10 text-foreground border-border">
                  {question.dimension}
                </Badge>
              </div>
              <span className="text-muted-foreground text-sm">{currentPsych + 1} / {psychQuestions.length}</span>
            </div>
            <div className="relative h-2 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 bg-[#2E2E2E] dark:bg-white rounded-full"
                animate={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Slider Content */}
        <div className="container max-w-2xl mx-auto px-4 py-16">
          <AnimatePresence mode="wait">
            <motion.div
              key={question.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-10"
            >
              <Card className="p-10 bg-card border-border backdrop-blur-sm">
                <h2 className="text-xl font-medium text-foreground text-center mb-10 leading-relaxed">
                  {question.question_text}
                </h2>

                <div className="space-y-8">
                  <div className="relative">
                    <Slider
                      value={[psychAnswers[question.id] ?? 50]}
                      onValueChange={(val) => setPsychAnswers((prev) => ({ ...prev, [question.id]: val[0] }))}
                      min={0}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
                      <motion.div
                        key={psychAnswers[question.id]}
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        className="px-4 py-2 rounded-full bg-[#2E2E2E] text-white font-bold"
                      >
                        {psychAnswers[question.id] ?? 50}%
                      </motion.div>
                    </div>
                  </div>

                  <div className="flex justify-between text-sm text-muted-foreground pt-6">
                    <span>{question.scale_min_label}</span>
                    <span>{question.scale_max_label}</span>
                  </div>
                </div>
              </Card>

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPsych(Math.max(0, currentPsych - 1))}
                  disabled={currentPsych === 0}
                  className="border-border text-foreground"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
                <Button
                  onClick={nextPsych}
                  className="bg-[#2E2E2E] hover:bg-[#404040] text-white"
                >
                  {currentPsych < psychQuestions.length - 1 ? (
                    <>Next <ArrowRight className="h-4 w-4 ml-2" /></>
                  ) : (
                    <>Review & Submit <CheckCircle2 className="h-4 w-4 ml-2" /></>
                  )}
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // =====================================================
  // REVIEW PHASE
  // =====================================================
  if (phase === "review") {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-3xl mx-auto px-4 py-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="w-20 h-20 mx-auto rounded-full bg-[#2E2E2E] flex items-center justify-center mb-6"
              >
                <CheckCircle2 className="h-10 w-10 text-white" />
              </motion.div>
              <h1 className="text-3xl font-bold text-foreground">Review Your Assessment</h1>
              <p className="text-muted-foreground mt-2">You&apos;ve completed all 4 stages. Review before submitting.</p>
            </div>

            <Card className="p-6 bg-card border-border">
              <h2 className="text-lg font-semibold text-foreground mb-4">Completion Summary</h2>
              <div className="space-y-3">
                {[
                  { icon: Brain, label: "Scenario MCQs", count: Object.keys(mcqAnswers).length, total: mcqQuestions.length },
                  { icon: Code2, label: "Coding Challenges", count: Object.keys(codeAnswers).length, total: codingChallenges.length },
                  { icon: MessageSquareText, label: "Written Responses", count: Object.keys(textAnswers).length, total: textQuestions.length },
                  { icon: SlidersHorizontal, label: "Self-Assessment", count: Object.keys(psychAnswers).length, total: psychQuestions.length },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
                    <div className="flex items-center gap-3">
                      <item.icon className="h-5 w-5 text-[#2E2E2E] dark:text-white" />
                      <span className="text-foreground">{item.label}</span>
                    </div>
                    <Badge className="bg-[#2E2E2E]/10 text-foreground border-border">
                      {item.count}/{item.total} completed
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5 bg-amber-500/10 border-amber-500/30">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-600 dark:text-amber-400">Before you submit</p>
                  <p className="text-sm text-amber-700/70 dark:text-amber-300/70 mt-1">
                    Once submitted, you cannot modify your responses. The AI will analyze your answers.
                  </p>
                </div>
              </div>
            </Card>

            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={() => setPhase("mcq")} className="border-border text-foreground">
                Review Answers
              </Button>
              <Button
                onClick={submitAssessment}
                disabled={submitting}
                className="bg-[#2E2E2E] hover:bg-[#404040] text-white px-8"
              >
                {submitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting...</>
                ) : (
                  <><CheckCircle2 className="h-4 w-4 mr-2" /> Submit Assessment</>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // =====================================================
  // COMPLETE PHASE
  // =====================================================
  if (phase === "complete") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-8"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="relative"
          >
            <div className="w-28 h-28 mx-auto rounded-full bg-[#2E2E2E] flex items-center justify-center shadow-2xl">
              <Trophy className="h-14 w-14 text-white" />
            </div>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full border-2 border-dashed border-[#2E2E2E]/30"
            />
          </motion.div>
          <div>
            <h1 className="text-4xl font-bold text-foreground">Assessment Complete!</h1>
            <p className="text-muted-foreground mt-3 max-w-md">
              Your responses have been submitted. Our AI is analyzing your performance.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 text-[#2E2E2E] dark:text-white">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Generating your results...</span>
          </div>
        </motion.div>
      </div>
    );
  }

  // Fallback - no questions
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="p-8 text-center bg-card border-border max-w-md">
        <AlertTriangle className="h-12 w-12 mx-auto text-amber-500 mb-4" />
        <h2 className="text-xl font-semibold text-foreground">No Questions Available</h2>
        <p className="text-muted-foreground mt-2 mb-6">
          Please run the seed.sql file in your Supabase dashboard to load the assessment questions.
        </p>
        <Button onClick={() => router.push("/dashboard")} className="bg-[#2E2E2E] hover:bg-[#404040] text-white">
          Return to Dashboard
        </Button>
      </Card>
    </div>
  );
}

// Suspense wrapper for useSearchParams
function AssessmentLoading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 text-[#2E2E2E] dark:text-white animate-spin" />
        <p className="text-muted-foreground">Loading assessment...</p>
      </div>
    </div>
  );
}

export default function AssessmentPage() {
  return (
    <Suspense fallback={<AssessmentLoading />}>
      <AssessmentPageContent />
    </Suspense>
  );
}
