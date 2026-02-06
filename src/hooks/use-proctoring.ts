// useProctoring Hook - Handles webcam face detection and browser monitoring
// Logs events to server in batches for efficiency

import { useEffect, useRef, useCallback, useState } from "react";

// Dynamic import to avoid SSR issues - loaded lazily
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let faceapi: any = null;

export type ProctorEventType =
  | "NO_FACE"
  | "MULTI_FACE"
  | "FACE_LOST"
  | "FACE_SIZE_CHANGE"
  | "RAPID_MOVEMENT"
  | "TAB_SWITCH"
  | "WINDOW_BLUR"
  | "WINDOW_FOCUS"
  | "FULLSCREEN_EXIT"
  | "COPY"
  | "PASTE"
  | "CUT"
  | "SHORTCUT_USED"
  | "DEVTOOLS_ATTEMPT"
  | "SESSION_START"
  | "SESSION_END"
  | "WEBCAM_DENIED"
  | "WEBCAM_ERROR";

interface ProctorEvent {
  event_type: ProctorEventType;
  client_timestamp: string;
  meta?: Record<string, any>;
  question_index?: number;
  elapsed_seconds?: number;
  description?: string;
}

interface UseProctoring {
  attemptId: string;
  sessionId?: string;
  enabled?: boolean;
  onIntegrityChange?: (score: number) => void;
  questionIndex?: number;
  startTime?: number;
}

interface ProctorState {
  isActive: boolean;
  webcamEnabled: boolean;
  faceDetected: boolean;
  faceCount: number;
  integrityScore: number;
  eventCount: number;
  lastEvent: string | null;
}

export function useProctoring({
  attemptId,
  sessionId,
  enabled = true,
  onIntegrityChange,
  questionIndex = 0,
  startTime = Date.now(),
}: UseProctoring) {
  const [state, setState] = useState<ProctorState>({
    isActive: false,
    webcamEnabled: false,
    faceDetected: true,
    faceCount: 1,
    integrityScore: 100,
    eventCount: 0,
    lastEvent: null,
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const eventQueueRef = useRef<ProctorEvent[]>([]);
  const flushTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFaceTimeRef = useRef<number>(Date.now());
  const lastFaceSizeRef = useRef<number>(0);
  const modelsLoadedRef = useRef<boolean>(false);
  const streamRef = useRef<MediaStream | null>(null);

  // Queue an event for batch sending
  const queueEvent = useCallback((
    eventType: ProctorEventType,
    meta?: Record<string, any>,
    description?: string
  ) => {
    const event: ProctorEvent = {
      event_type: eventType,
      client_timestamp: new Date().toISOString(),
      meta,
      description,
      question_index: questionIndex,
      elapsed_seconds: Math.floor((Date.now() - startTime) / 1000),
    };

    eventQueueRef.current.push(event);
    setState(prev => ({
      ...prev,
      eventCount: prev.eventCount + 1,
      lastEvent: eventType,
    }));

    // Auto-flush if queue is getting large
    if (eventQueueRef.current.length >= 10) {
      flushEvents();
    }
  }, [questionIndex, startTime]);

  // Send queued events to server
  const flushEvents = useCallback(async () => {
    if (eventQueueRef.current.length === 0) return;

    const eventsToSend = [...eventQueueRef.current];
    eventQueueRef.current = [];

    try {
      const response = await fetch("/api/proctoring/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          sessionId,
          events: eventsToSend,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Could update local integrity score estimate here
      }
    } catch (error) {
      // Re-queue events on failure
      eventQueueRef.current = [...eventsToSend, ...eventQueueRef.current];
      console.error("Failed to send proctor events:", error);
    }
  }, [attemptId, sessionId]);

  // Load face-api models
  const loadModels = useCallback(async () => {
    if (modelsLoadedRef.current) return true;

    // Skip on server side
    if (typeof window === "undefined") return false;

    try {
      // Load face-api.js dynamically
      if (!faceapi) {
        faceapi = await import("face-api.js");
      }

      const MODEL_URL = "/models";
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
      ]);
      modelsLoadedRef.current = true;
      return true;
    } catch (error) {
      console.error("Failed to load face detection models:", error);
      return false;
    }
  }, []);

  // Start webcam
  const startWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: "user" },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setState(prev => ({ ...prev, webcamEnabled: true }));
        return true;
      }
      return false;
    } catch (error: any) {
      console.error("Webcam access denied:", error);
      queueEvent("WEBCAM_DENIED", { error: error.message });
      setState(prev => ({ ...prev, webcamEnabled: false }));
      return false;
    }
  }, [queueEvent]);

  // Face detection loop
  const detectFaces = useCallback(async () => {
    if (!videoRef.current || !modelsLoadedRef.current) return;

    try {
      const detections = await faceapi.detectAllFaces(
        videoRef.current,
        new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
      );

      const faceCount = detections.length;
      const now = Date.now();

      // No face detected
      if (faceCount === 0) {
        const timeSinceLastFace = now - lastFaceTimeRef.current;

        // Only log if face has been gone for > 2 seconds
        if (timeSinceLastFace > 2000) {
          queueEvent("NO_FACE", { duration_ms: timeSinceLastFace });
          setState(prev => ({ ...prev, faceDetected: false, faceCount: 0 }));
        }
      }
      // Multiple faces
      else if (faceCount > 1) {
        queueEvent("MULTI_FACE", { face_count: faceCount });
        setState(prev => ({ ...prev, faceCount }));
      }
      // Single face (good)
      else {
        const faceBox = detections[0].box;
        const faceSize = faceBox.width * faceBox.height;

        // Check for sudden size change (person moving away)
        if (lastFaceSizeRef.current > 0) {
          const sizeChange = Math.abs(faceSize - lastFaceSizeRef.current) / lastFaceSizeRef.current;
          if (sizeChange > 0.5) {
            queueEvent("FACE_SIZE_CHANGE", {
              previous_size: lastFaceSizeRef.current,
              current_size: faceSize,
              change_percent: Math.round(sizeChange * 100)
            });
          }
        }

        lastFaceSizeRef.current = faceSize;
        lastFaceTimeRef.current = now;
        setState(prev => ({ ...prev, faceDetected: true, faceCount: 1 }));
      }
    } catch (error) {
      console.error("Face detection error:", error);
    }
  }, [queueEvent]);

  // Browser visibility handler
  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      queueEvent("TAB_SWITCH", { hidden: true });
    }
  }, [queueEvent]);

  // Window blur/focus handlers
  const handleWindowBlur = useCallback(() => {
    queueEvent("WINDOW_BLUR");
  }, [queueEvent]);

  const handleWindowFocus = useCallback(() => {
    queueEvent("WINDOW_FOCUS");
  }, [queueEvent]);

  // Clipboard handlers
  const handleCopy = useCallback((e: ClipboardEvent) => {
    queueEvent("COPY", {
      target: (e.target as HTMLElement)?.tagName
    });
  }, [queueEvent]);

  const handlePaste = useCallback((e: ClipboardEvent) => {
    queueEvent("PASTE", {
      target: (e.target as HTMLElement)?.tagName
    });
  }, [queueEvent]);

  const handleCut = useCallback((e: ClipboardEvent) => {
    queueEvent("CUT", {
      target: (e.target as HTMLElement)?.tagName
    });
  }, [queueEvent]);

  // Keyboard shortcut handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const shortcuts = [
      { ctrl: true, key: "c", name: "Ctrl+C" },
      { ctrl: true, key: "v", name: "Ctrl+V" },
      { ctrl: true, key: "x", name: "Ctrl+X" },
      { ctrl: true, shift: true, key: "i", name: "Ctrl+Shift+I" },
      { ctrl: true, shift: true, key: "j", name: "Ctrl+Shift+J" },
      { key: "F12", name: "F12" },
    ];

    for (const shortcut of shortcuts) {
      const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : true;
      const shiftMatch = shortcut.shift ? e.shiftKey : true;
      const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

      if (ctrlMatch && shiftMatch && keyMatch) {
        // DevTools attempts
        if (["Ctrl+Shift+I", "Ctrl+Shift+J", "F12"].includes(shortcut.name)) {
          queueEvent("DEVTOOLS_ATTEMPT", { shortcut: shortcut.name });
        } else {
          queueEvent("SHORTCUT_USED", { shortcut: shortcut.name });
        }
        break;
      }
    }

    // Detect Alt+Tab (best effort - only works when window still has focus briefly)
    if (e.altKey && e.key === "Tab") {
      queueEvent("SHORTCUT_USED", { shortcut: "Alt+Tab" });
    }
  }, [queueEvent]);

  // Fullscreen exit handler
  const handleFullscreenChange = useCallback(() => {
    if (!document.fullscreenElement) {
      queueEvent("FULLSCREEN_EXIT");
    }
  }, [queueEvent]);

  // Initialize proctoring
  useEffect(() => {
    if (!enabled) return;

    const init = async () => {
      setState(prev => ({ ...prev, isActive: true }));
      queueEvent("SESSION_START");

      // Load face detection models
      await loadModels();

      // Start webcam
      await startWebcam();

      // Start face detection interval (every 2.5 seconds)
      detectionIntervalRef.current = setInterval(detectFaces, 2500);

      // Set up event flush interval (every 5 seconds)
      flushTimeoutRef.current = setInterval(flushEvents, 5000);
    };

    init();

    // Add event listeners
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("cut", handleCut);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    // Cleanup
    return () => {
      setState(prev => ({ ...prev, isActive: false }));
      queueEvent("SESSION_END");
      flushEvents();

      // Clear intervals
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
      if (flushTimeoutRef.current) {
        clearInterval(flushTimeoutRef.current);
      }

      // Stop webcam
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      // Remove event listeners
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("cut", handleCut);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [enabled, attemptId]);

  // Expose refs for video element
  const setVideoRef = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
  }, []);

  const setCanvasRef = useCallback((el: HTMLCanvasElement | null) => {
    canvasRef.current = el;
  }, []);

  return {
    state,
    setVideoRef,
    setCanvasRef,
    queueEvent,
    flushEvents,
  };
}
