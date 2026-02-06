// Enhanced Proctoring Monitor with RecordRTC and Face-API.js
// Complete proctoring solution for TalentPulse assessments

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CameraOff,
  AlertTriangle,
  User,
  Users,
  UserX,
  Minimize2,
  Maximize2,
  Circle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { faceDetectionService, type FaceDetectionResult, type FaceViolation } from "@/lib/proctoring/face-detection-service";
import { handDetectionService, type HandDetectionResult, type HandViolation } from "@/lib/proctoring/hand-detection-service";
import { recordingService, type RecordingStatus } from "@/lib/proctoring/recording-service";

// Event types matching schema
type EventType =
  | "NO_FACE" | "MULTI_FACE" | "FACE_LOST" | "FACE_SIZE_CHANGE" | "RAPID_MOVEMENT" | "LOOKING_AWAY"
  | "HAND_DETECTED" | "HAND_COVERING_FACE" | "PHONE_GESTURE"
  | "TAB_SWITCH" | "WINDOW_BLUR" | "WINDOW_FOCUS" | "FULLSCREEN_EXIT"
  | "COPY" | "PASTE" | "CUT"
  | "SHORTCUT_USED" | "DEVTOOLS_ATTEMPT"
  | "SESSION_START" | "SESSION_END" | "WEBCAM_DENIED" | "WEBCAM_ERROR";

type EventCategory = "webcam" | "browser" | "clipboard" | "keyboard" | "system" | "hand";
type Severity = "low" | "medium" | "high" | "critical";

interface ProctoringEvent {
  event_type: EventType;
  event_category: EventCategory;
  severity: Severity;
  details?: Record<string, unknown>;
  timestamp: Date;
}

// Event configuration
const EVENT_CONFIG: Record<EventType, { category: EventCategory; severity: Severity; deduction: number }> = {
  NO_FACE: { category: "webcam", severity: "medium", deduction: 2 },
  MULTI_FACE: { category: "webcam", severity: "critical", deduction: 15 },
  FACE_LOST: { category: "webcam", severity: "medium", deduction: 3 },
  FACE_SIZE_CHANGE: { category: "webcam", severity: "low", deduction: 1 },
  RAPID_MOVEMENT: { category: "webcam", severity: "low", deduction: 1 },
  LOOKING_AWAY: { category: "webcam", severity: "medium", deduction: 3 },
  HAND_DETECTED: { category: "hand", severity: "low", deduction: 1 },
  HAND_COVERING_FACE: { category: "hand", severity: "high", deduction: 8 },
  PHONE_GESTURE: { category: "hand", severity: "critical", deduction: 15 },
  TAB_SWITCH: { category: "browser", severity: "high", deduction: 5 },
  WINDOW_BLUR: { category: "browser", severity: "medium", deduction: 3 },
  WINDOW_FOCUS: { category: "browser", severity: "low", deduction: 0 },
  FULLSCREEN_EXIT: { category: "browser", severity: "medium", deduction: 5 },
  COPY: { category: "clipboard", severity: "medium", deduction: 3 },
  PASTE: { category: "clipboard", severity: "high", deduction: 5 },
  CUT: { category: "clipboard", severity: "medium", deduction: 3 },
  SHORTCUT_USED: { category: "keyboard", severity: "medium", deduction: 2 },
  DEVTOOLS_ATTEMPT: { category: "keyboard", severity: "critical", deduction: 20 },
  SESSION_START: { category: "system", severity: "low", deduction: 0 },
  SESSION_END: { category: "system", severity: "low", deduction: 0 },
  WEBCAM_DENIED: { category: "system", severity: "high", deduction: 10 },
  WEBCAM_ERROR: { category: "system", severity: "medium", deduction: 5 },
};

interface ProctoringMonitorProps {
  attemptId: string;
  sessionId?: string;
  candidateId: string;
  onViolation?: (event: ProctoringEvent) => void;
  onIntegrityChange?: (score: number) => void;
  onDisqualified?: (reason: string) => void; // Called when candidate is disqualified (e.g., multiple faces)
  enabled?: boolean;
  minimized?: boolean;
  onMinimizeToggle?: () => void;
  existingStream?: MediaStream; // Optional: use existing webcam stream from setup phase
  existingScreenStream?: MediaStream; // Optional: use existing screen stream from setup phase
}

export function ProctoringMonitor({
  attemptId,
  sessionId,
  candidateId,
  onViolation,
  onIntegrityChange,
  onDisqualified,
  enabled = true,
  minimized = false,
  onMinimizeToggle,
  existingStream,
  existingScreenStream,
}: ProctoringMonitorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const eventQueueRef = useRef<Record<string, unknown>[]>([]);
  const flushIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const [cameraActive, setCameraActive] = useState(false);
  const [faceDetected, setFaceDetected] = useState(true);
  const [faceCount, setFaceCount] = useState(1);
  const [violations, setViolations] = useState<ProctoringEvent[]>([]);
  const [integrityScore, setIntegrityScore] = useState(100);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>("idle");
  const [recordingDuration, setRecordingDuration] = useState(0);

  // Face detection state
  const [faceApiReady, setFaceApiReady] = useState(false);
  const [faceBoxes, setFaceBoxes] = useState<Array<{ x: number; y: number; width: number; height: number }>>([]);
  const [isDetectionLoading, setIsDetectionLoading] = useState(true); // New: loading state for detection

  // Hand detection state
  const [handApiReady, setHandApiReady] = useState(false);
  const [handCount, setHandCount] = useState(0);

  // Eye gaze state
  const [isLookingAtScreen, setIsLookingAtScreen] = useState(true);
  const [gazeDirection, setGazeDirection] = useState<string>("center");

  // Warning overlay state
  const [activeWarning, setActiveWarning] = useState<{ type: string; severity: string; message: string } | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const supabase = createClient();

  // Warning messages for each event type
  const WARNING_MESSAGES: Record<string, string> = {
    NO_FACE: "No face detected in camera. Please position yourself in front of the camera.",
    MULTI_FACE: "Multiple faces detected. Only the candidate should be visible.",
    FACE_LOST: "Face detection lost. Please stay in view of the camera.",
    LOOKING_AWAY: "Please look at your screen. Looking away has been detected.",
    HAND_DETECTED: "Hands detected in camera view. Please keep your hands away from the camera.",
    HAND_COVERING_FACE: "Hand covering face detected. Please keep your face visible.",
    PHONE_GESTURE: "Phone usage suspected. Mobile devices are not allowed during the assessment.",
    TAB_SWITCH: "Tab switch detected. Please remain on the assessment page.",
    WINDOW_BLUR: "Window focus lost. Please stay on the assessment window.",
    FULLSCREEN_EXIT: "Fullscreen mode exited. Please remain in fullscreen.",
    COPY: "Copy action detected and logged.",
    PASTE: "Paste action detected and logged.",
    CUT: "Cut action detected and logged.",
    SHORTCUT_USED: "Keyboard shortcut detected and logged.",
    DEVTOOLS_ATTEMPT: "Developer tools access attempt detected. This is a critical violation.",
  };

  // Show warning overlay for significant violations
  const showWarningOverlay = useCallback((eventType: EventType, severity: string) => {
    // Clear any existing timeout
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }

    const message = WARNING_MESSAGES[eventType] || `${eventType.replace(/_/g, " ")} detected.`;
    
    setActiveWarning({
      type: eventType,
      severity,
      message,
    });

    // Auto-hide warning after 5 seconds (longer for critical)
    const duration = severity === "critical" ? 8000 : severity === "high" ? 5000 : 3000;
    warningTimeoutRef.current = setTimeout(() => {
      setActiveWarning(null);
    }, duration);
  }, []);

  // Queue event for batch sending
  const queueEvent = useCallback((
    eventType: EventType,
    details?: Record<string, unknown>
  ) => {
    const config = EVENT_CONFIG[eventType];
    const event: ProctoringEvent = {
      event_type: eventType,
      event_category: config.category,
      severity: config.severity,
      details,
      timestamp: new Date(),
    };

    setViolations((prev) => [...prev.slice(-19), event]);
    onViolation?.(event);

    // CRITICAL: Multiple faces detected - immediate disqualification
    if (eventType === "MULTI_FACE") {
      // Stop all detection and recording
      faceDetectionService.stop();
      handDetectionService.stop();
      recordingService.stop();
      
      // Call disqualification callback
      onDisqualified?.("Multiple faces detected during assessment. This is a critical violation that results in immediate disqualification. The assessment cannot be re-attempted.");
      return; // Don't continue processing
    }

    // Show warning overlay for non-trivial violations
    if (config.severity !== "low" && eventType !== "WINDOW_FOCUS") {
      showWarningOverlay(eventType, config.severity);
    }

    // Update local integrity score
    setIntegrityScore(prev => {
      const newScore = Math.max(0, prev - config.deduction);
      onIntegrityChange?.(newScore);
      return newScore;
    });

    // Add to queue for batch sending
    eventQueueRef.current.push({
      attempt_id: attemptId,
      candidate_id: candidateId,
      session_id: sessionId || null,
      event_type: eventType,
      event_category: config.category,
      severity: config.severity,
      description: details?.description || null,
      meta: details || {},
      client_timestamp: new Date().toISOString(),
      elapsed_seconds: Math.floor((Date.now() - startTimeRef.current) / 1000),
    });

    // Flush immediately for critical events and capture screenshot
    if (config.severity === "critical" || config.severity === "high") {
      flushEvents();
      captureViolationScreenshot(eventType);
    }
  }, [attemptId, candidateId, sessionId, onViolation, onIntegrityChange, onDisqualified, showWarningOverlay]);

  // Send queued events to server
  const flushEvents = useCallback(async () => {
    if (eventQueueRef.current.length === 0) return;

    const eventsToSend = [...eventQueueRef.current];
    eventQueueRef.current = [];

    try {
      await fetch("/api/proctoring/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          sessionId,
          events: eventsToSend,
        }),
      });
    } catch (error) {
      // Re-queue on failure
      eventQueueRef.current = [...eventsToSend, ...eventQueueRef.current];
      console.error("Failed to send proctor events:", error);
    }
  }, [attemptId, sessionId]);

  // Capture screenshot on violation
  const captureViolationScreenshot = useCallback(async (eventType: string) => {
    if (!videoRef.current || !canvasRef.current) return;

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 240;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(video, 0, 0);

      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const formData = new FormData();
        formData.append("file", blob);
        formData.append("type", "screenshot");
        formData.append("attemptId", attemptId);
        formData.append("eventType", eventType);
        if (sessionId) formData.append("sessionId", sessionId);

        await fetch("/api/proctoring/upload", {
          method: "POST",
          body: formData,
        });
      }, "image/jpeg", 0.8);
    } catch (error) {
      console.error("Failed to capture violation screenshot:", error);
    }
  }, [attemptId, sessionId]);

  // STEP 1: Immediately show camera preview from existing stream (no delay)
  useEffect(() => {
    if (!enabled || !existingStream || !videoRef.current) return;
    
    // Show video immediately - don't wait for any service initialization
    videoRef.current.srcObject = existingStream;
    videoRef.current.play().catch(err => console.warn("Video play error:", err));
    setCameraActive(true);
    console.log("[Proctoring] Camera preview shown immediately from existing stream");
  }, [enabled, existingStream]);

  // STEP 2: Initialize detection services and recording in parallel (non-blocking)
  useEffect(() => {
    if (!enabled) return;

    startTimeRef.current = Date.now();
    let mounted = true;
    setIsDetectionLoading(true);

    const initializeProctoring = async () => {
      // Start all initializations in parallel for speed
      const [faceReady, handReady] = await Promise.all([
        faceDetectionService.initialize(),
        handDetectionService.initialize(),
        recordingService.initialize({
          attemptId,
          sessionId,
          candidateId,
          existingStream,
          existingScreenStream,
          includeScreen: true,
        }),
      ]);

      if (!mounted) return;
      
      setFaceApiReady(faceReady);
      setHandApiReady(handReady);
      setIsDetectionLoading(false);
      console.log("[Proctoring] Detection services ready:", { faceReady, handReady });

      // Get stream from recording service (may be same as existingStream)
      const stream = recordingService.getStream() || existingStream;

      // Set up face detection with eye gaze using the video element
      if (faceReady && videoRef.current) {
        faceDetectionService.setVideoElement(videoRef.current);
        faceDetectionService.setCallbacks({
          onFaceDetected: (result: FaceDetectionResult) => {
            if (!mounted) return;
            setFaceCount(result.faceCount);
            setFaceDetected(result.faceCount > 0);
            setFaceBoxes(result.faces);
            
            // Update eye gaze state
            if (result.eyeGaze) {
              setIsLookingAtScreen(result.eyeGaze.isLookingAtScreen);
              setGazeDirection(result.eyeGaze.gazeDirection);
            }
          },
          onViolation: (type: FaceViolation, details) => {
            if (!mounted) return;
            queueEvent(type as EventType, details);
          },
        });
        faceDetectionService.start();
        console.log("[Proctoring] Face detection started");
      }

      // Set up hand detection
      if (handReady && videoRef.current) {
        handDetectionService.setVideoElement(videoRef.current);
        handDetectionService.setCallbacks({
          onHandDetected: (result: HandDetectionResult) => {
            if (!mounted) return;
            setHandCount(result.handCount);
          },
          onViolation: (type: HandViolation, details) => {
            if (!mounted) return;
            queueEvent(type as EventType, details);
          },
        });
        handDetectionService.start();
        console.log("[Proctoring] Hand detection started");
      }

      // Start recording
      recordingService.setCallbacks({
        onStatusChange: (status) => {
          if (!mounted) return;
          setRecordingStatus(status);
          setIsRecording(status === "recording");
        },
        onChunkUploaded: (url, index) => {
          console.log(`[Proctoring] Chunk ${index} uploaded:`, url);
        },
        onError: (error) => {
          console.error("[Proctoring] Recording error:", error);
          queueEvent("WEBCAM_ERROR", { error });
        },
        onDurationChange: (seconds) => {
          if (!mounted) return;
          setRecordingDuration(seconds);
        },
      });
      recordingService.start();

      queueEvent("SESSION_START", { camera_requested: true, recording: true });
    };

    initializeProctoring();

    // Set up event flush interval (every 5 seconds)
    flushIntervalRef.current = setInterval(flushEvents, 5000);

    return () => {
      mounted = false;
      queueEvent("SESSION_END");
      flushEvents();

      if (flushIntervalRef.current) clearInterval(flushIntervalRef.current);

      faceDetectionService.stop();
      handDetectionService.stop();
      recordingService.stop();
    };
  }, [enabled, attemptId, sessionId, candidateId, existingStream, existingScreenStream, queueEvent, flushEvents]);

  // Tab visibility detection
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        queueEvent("TAB_SWITCH", { hidden: true });
      } else {
        queueEvent("WINDOW_FOCUS", { returned: true });
      }
    };

    const handleBlur = () => queueEvent("WINDOW_BLUR");
    const handleFocus = () => queueEvent("WINDOW_FOCUS");

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, [enabled, queueEvent]);

  // Copy/Paste detection
  useEffect(() => {
    if (!enabled) return;

    const handleCopy = (e: ClipboardEvent) => {
      queueEvent("COPY", { target: (e.target as HTMLElement)?.tagName });
    };

    const handlePaste = (e: ClipboardEvent) => {
      queueEvent("PASTE", { target: (e.target as HTMLElement)?.tagName });
    };

    const handleCut = (e: ClipboardEvent) => {
      queueEvent("CUT", { target: (e.target as HTMLElement)?.tagName });
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      queueEvent("SHORTCUT_USED", { action: "right_click" });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Detect DevTools shortcuts
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && ["i", "j", "c"].includes(e.key.toLowerCase())) {
        e.preventDefault();
        queueEvent("DEVTOOLS_ATTEMPT", { shortcut: `Ctrl+Shift+${e.key.toUpperCase()}` });
        return;
      }

      if (e.key === "F12") {
        e.preventDefault();
        queueEvent("DEVTOOLS_ATTEMPT", { shortcut: "F12" });
        return;
      }

      // Detect common shortcuts
      if (e.ctrlKey || e.metaKey) {
        if (["c", "v", "x", "a"].includes(e.key.toLowerCase())) {
          queueEvent("SHORTCUT_USED", { shortcut: `Ctrl+${e.key.toUpperCase()}` });
        }
      }

      // Detect Alt+Tab (best effort)
      if (e.altKey && e.key === "Tab") {
        queueEvent("TAB_SWITCH", { method: "Alt+Tab" });
      }
    };

    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("cut", handleCut);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("cut", handleCut);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled, queueEvent]);

  // Fullscreen exit detection
  useEffect(() => {
    if (!enabled) return;

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        queueEvent("FULLSCREEN_EXIT");
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [enabled, queueEvent]);

  const getIntegrityColor = () => {
    if (integrityScore >= 80) return "text-[#2E2E2E] dark:text-white";
    if (integrityScore >= 60) return "text-amber-500";
    if (integrityScore >= 40) return "text-orange-500";
    return "text-red-500";
  };

  const getFaceIcon = () => {
    if (!cameraActive) return <CameraOff className="h-4 w-4 text-red-400" />;
    if (faceCount === 0) return <UserX className="h-4 w-4 text-red-400" />;
    if (faceCount > 1) return <Users className="h-4 w-4 text-amber-400" />;
    return <User className="h-4 w-4 text-[#2E2E2E] dark:text-white" />;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (!enabled) return null;

  // Hidden canvas for screenshot capture
  const hiddenCanvas = (
    <canvas ref={canvasRef} style={{ display: "none" }} />
  );

  // Warning overlay component
  const warningOverlay = activeWarning && (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className="fixed top-0 left-0 right-0 z-[100] p-4"
      >
        <div
          className={`max-w-2xl mx-auto rounded-lg shadow-lg border-2 p-4 ${
            activeWarning.severity === "critical"
              ? "bg-red-950 border-red-500 text-red-100"
              : activeWarning.severity === "high"
              ? "bg-amber-950 border-amber-500 text-amber-100"
              : "bg-slate-900 border-slate-600 text-slate-100"
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-full ${
              activeWarning.severity === "critical" ? "bg-red-500/20" :
              activeWarning.severity === "high" ? "bg-amber-500/20" : "bg-slate-500/20"
            }`}>
              <AlertTriangle className={`h-5 w-5 ${
                activeWarning.severity === "critical" ? "text-red-400" :
                activeWarning.severity === "high" ? "text-amber-400" : "text-slate-400"
              }`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold uppercase tracking-wide text-sm">
                  {activeWarning.severity === "critical" ? "CRITICAL VIOLATION" :
                   activeWarning.severity === "high" ? "WARNING" : "NOTICE"}
                </span>
                <Badge variant="outline" className={`text-xs ${
                  activeWarning.severity === "critical" ? "border-red-500/50 text-red-300" :
                  activeWarning.severity === "high" ? "border-amber-500/50 text-amber-300" :
                  "border-slate-500/50 text-slate-300"
                }`}>
                  {activeWarning.type.replace(/_/g, " ")}
                </Badge>
              </div>
              <p className="text-sm opacity-90">{activeWarning.message}</p>
              <p className="text-xs mt-2 opacity-70">
                This event has been recorded and will be shared with the HR team for review.
                A screenshot has been captured.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveWarning(null)}
              className="text-current hover:bg-white/10"
            >
              Dismiss
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );

  // Minimized view - just icon bar
  if (minimized) {
    return (
      <>
        {hiddenCanvas}
        {warningOverlay}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed bottom-4 right-4 z-50"
        >
          <Card
            className="p-2 bg-background/95 backdrop-blur-sm border-[#2E2E2E]/20 cursor-pointer hover:bg-accent shadow-lg"
            onClick={onMinimizeToggle}
          >
            <div className="flex items-center gap-2">
              {isRecording && (
                <Circle className="h-2 w-2 fill-red-500 text-red-500 animate-pulse" />
              )}
              {getFaceIcon()}
              <span className={`text-xs font-bold ${getIntegrityColor()}`}>
                {integrityScore}%
              </span>
              <Maximize2 className="h-3 w-3 text-muted-foreground" />
            </div>
          </Card>
        </motion.div>
      </>
    );
  }

  // Small floating window - fixed position in corner
  return (
    <>
      {hiddenCanvas}
      {warningOverlay}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed bottom-4 right-4 z-50"
        style={{ width: 160 }}
      >
        <Card className="overflow-hidden bg-background/95 backdrop-blur-sm border-[#2E2E2E]/30 shadow-xl rounded-lg">
          {/* Video preview - compact size */}
          <div className="relative" style={{ height: 120 }}>
            {/* Always render video element so ref is available for stream assignment */}
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            {/* Face detection box overlay */}
            {cameraActive && faceApiReady && faceBoxes.length > 0 && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {faceBoxes.map((box, i) => (
                  <rect
                    key={i}
                    x={`${(box.x / 640) * 100}%`}
                    y={`${(box.y / 480) * 100}%`}
                    width={`${(box.width / 640) * 100}%`}
                    height={`${(box.height / 480) * 100}%`}
                    fill="none"
                    stroke={faceBoxes.length === 1 ? "#22c55e" : "#ef4444"}
                    strokeWidth="2"
                    rx="4"
                  />
                ))}
              </svg>
            )}
            {/* Detection loading overlay - shows while MediaPipe loads but camera is visible */}
            {cameraActive && isDetectionLoading && (
              <div className="absolute bottom-1 left-1">
                <Badge className="bg-amber-500/90 text-white text-[10px] px-1 py-0">
                  Loading...
                </Badge>
              </div>
            )}
            {/* Camera off overlay when not active */}
            {!cameraActive && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <CameraOff className="h-6 w-6 text-muted-foreground" />
              </div>
            )}

            {/* Recording indicator */}
            {isRecording && (
              <div className="absolute top-1 left-1">
                <Badge className="bg-red-600/90 text-white text-[10px] px-1 py-0 animate-pulse">
                  <Circle className="h-2 w-2 fill-current mr-0.5" />
                  REC
                </Badge>
              </div>
            )}

            {/* Face status */}
            <div className="absolute top-1 right-1">
              {faceCount > 1 ? (
                <Badge className="bg-red-500/90 text-white text-[10px] px-1 py-0">
                  {faceCount}
                </Badge>
              ) : !faceDetected ? (
                <Badge className="bg-amber-500/90 text-white text-[10px] px-1 py-0">
                  <UserX className="h-2 w-2" />
                </Badge>
              ) : null}
            </div>
          </div>

          {/* Compact status bar */}
          <div className="px-2 py-1.5 flex items-center justify-between bg-background/80">
            <div className="flex items-center gap-1.5">
              {getFaceIcon()}
              <span className={`text-xs font-bold ${getIntegrityColor()}`}>
                {integrityScore}%
              </span>
            </div>
            <div className="flex items-center gap-1">
              {isRecording && (
                <span className="text-[10px] text-red-400 font-mono">
                  {formatDuration(recordingDuration)}
                </span>
              )}
              {onMinimizeToggle && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0"
                  onClick={onMinimizeToggle}
                >
                  <Minimize2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </Card>
      </motion.div>
    </>
  );
}

// Hook for using proctoring in components
export function useProctoringState(attemptId: string, candidateId: string) {
  const [violations, setViolations] = useState<ProctoringEvent[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [integrityScore, setIntegrityScore] = useState(100);

  const handleViolation = useCallback((event: ProctoringEvent) => {
    setViolations((prev) => [...prev, event]);
    const deduction = EVENT_CONFIG[event.event_type]?.deduction || 0;
    setIntegrityScore(prev => Math.max(0, prev - deduction));
  }, []);

  const handleIntegrityChange = useCallback((score: number) => {
    setIntegrityScore(score);
  }, []);

  return {
    violations,
    isActive,
    setIsActive,
    integrityScore,
    handleViolation,
    handleIntegrityChange,
    warningCount: violations.filter((v) => v.severity === "medium" || v.severity === "high").length,
    criticalCount: violations.filter((v) => v.severity === "critical").length,
    riskLevel: integrityScore >= 80 ? "low" : integrityScore >= 60 ? "medium" : integrityScore >= 40 ? "high" : "critical",
  };
}
