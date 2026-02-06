// Face Detection Service using MediaPipe Tasks Vision
// Google's production-grade ML for real-time proctoring
// Used by professional proctoring services worldwide
// Models loaded from CDN - no local files needed

import {
    FaceDetector,
    FilesetResolver,
    Detection,
} from "@mediapipe/tasks-vision";

export type FaceDetectionResult = {
    faceCount: number;
    faces: Array<{
        x: number;
        y: number;
        width: number;
        height: number;
        score: number;
    }>;
    eyeGaze?: {
        isLookingAtScreen: boolean;
        leftEyeCenter: { x: number; y: number } | null;
        rightEyeCenter: { x: number; y: number } | null;
        gazeDirection: "center" | "left" | "right" | "up" | "down" | "away";
    };
    timestamp: number;
};

export type FaceViolation = "NO_FACE" | "MULTI_FACE" | "FACE_LOST" | "FACE_SIZE_CHANGE" | "RAPID_MOVEMENT" | "LOOKING_AWAY";

export interface FaceDetectionCallback {
    onFaceDetected: (result: FaceDetectionResult) => void;
    onViolation: (type: FaceViolation, details?: Record<string, unknown>) => void;
}

// MediaPipe CDN paths - no local model files needed
const MEDIAPIPE_WASM_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
const FACE_DETECTOR_MODEL_CDN = "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";

class FaceDetectionService {
    private isInitialized = false;
    private isRunning = false;
    private videoElement: HTMLVideoElement | null = null;
    private callbacks: FaceDetectionCallback | null = null;
    private animationFrameId: number | null = null;
    private lastFaceTime = Date.now();
    private lastFaceBox: { x: number; y: number; width: number; height: number } | null = null;
    private noFaceStartTime: number | null = null;
    private lookingAwayStartTime: number | null = null;
    private faceDetector: FaceDetector | null = null;
    private lastDetectionTime = 0;

    // Configuration
    private readonly DETECTION_INTERVAL_MS = 100; // MediaPipe is fast, can run more frequently
    private readonly NO_FACE_THRESHOLD_MS = 3000;
    private readonly LOOKING_AWAY_THRESHOLD_MS = 2000;
    private readonly FACE_SIZE_CHANGE_THRESHOLD = 0.3;
    private readonly MOVEMENT_THRESHOLD = 100;
    private readonly MIN_DETECTION_CONFIDENCE = 0.5;

    async initialize(): Promise<boolean> {
        // Only initialize on client side
        if (typeof window === "undefined") {
            console.log("[FaceDetection] Skipping initialization - not in browser");
            return false;
        }

        if (this.isInitialized) return true;

        try {
            console.log("[FaceDetection] Loading MediaPipe Vision WASM...");

            // Load WASM files from CDN
            const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_CDN);

            console.log("[FaceDetection] Creating FaceDetector with BlazeFace model...");

            // Create face detector with VIDEO mode for real-time detection
            this.faceDetector = await FaceDetector.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: FACE_DETECTOR_MODEL_CDN,
                    delegate: "GPU", // Use GPU acceleration when available
                },
                runningMode: "VIDEO",
                minDetectionConfidence: this.MIN_DETECTION_CONFIDENCE,
            });

            console.log("[FaceDetection] MediaPipe FaceDetector initialized successfully");
            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error("[FaceDetection] Failed to initialize MediaPipe:", error);
            return false;
        }
    }

    setVideoElement(video: HTMLVideoElement): void {
        this.videoElement = video;
    }

    setCallbacks(callbacks: FaceDetectionCallback): void {
        this.callbacks = callbacks;
    }

    start(): void {
        if (!this.isInitialized || !this.videoElement || this.isRunning) {
            console.warn("[FaceDetection] Cannot start: not initialized or already running");
            return;
        }

        this.isRunning = true;
        this.lastFaceTime = Date.now();
        this.noFaceStartTime = null;
        this.lastDetectionTime = 0;

        // Use requestAnimationFrame for smooth detection
        this.runDetectionLoop();

        console.log("[FaceDetection] MediaPipe detection started");
    }

    private runDetectionLoop(): void {
        if (!this.isRunning) return;

        this.animationFrameId = requestAnimationFrame(async () => {
            await this.detectFaces();
            this.runDetectionLoop();
        });
    }

    stop(): void {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        this.isRunning = false;
        this.noFaceStartTime = null;
        console.log("[FaceDetection] Detection stopped");
    }

    private async detectFaces(): Promise<void> {
        if (!this.videoElement || !this.isRunning || !this.faceDetector) return;

        try {
            // Ensure video is ready
            if (this.videoElement.readyState < 2) return;

            const now = performance.now();

            // Throttle detection to avoid overwhelming the GPU
            if (now - this.lastDetectionTime < this.DETECTION_INTERVAL_MS) return;

            // Detect faces using MediaPipe
            const detectionResult = this.faceDetector.detectForVideo(this.videoElement, now);
            this.lastDetectionTime = now;

            const timestamp = Date.now();

            // Convert MediaPipe detections to our format
            const faces = detectionResult.detections.map((detection: Detection) => {
                const bbox = detection.boundingBox;
                if (!bbox) {
                    return { x: 0, y: 0, width: 0, height: 0, score: 0 };
                }
                return {
                    x: bbox.originX,
                    y: bbox.originY,
                    width: bbox.width,
                    height: bbox.height,
                    score: detection.categories?.[0]?.score ?? 0,
                };
            }).filter(f => f.width > 0 && f.height > 0);

            // Estimate gaze direction from face position (simple heuristic)
            let eyeGaze: FaceDetectionResult["eyeGaze"] | undefined;
            if (faces.length === 1) {
                eyeGaze = this.estimateGazeFromFacePosition(faces[0], detectionResult.detections[0]);
            }

            const result: FaceDetectionResult = {
                faceCount: faces.length,
                faces,
                eyeGaze,
                timestamp,
            };

            // Notify callback of detection
            this.callbacks?.onFaceDetected(result);

            // Check for violations
            this.checkViolations(result, timestamp);

        } catch (error) {
            console.error("[FaceDetection] Detection error:", error);
        }
    }

    private estimateGazeFromFacePosition(
        face: { x: number; y: number; width: number; height: number },
        detection: Detection
    ): FaceDetectionResult["eyeGaze"] {
        // MediaPipe provides keypoints for eyes, nose, mouth, ears
        // Use these to estimate gaze direction
        const keypoints = detection.keypoints;

        if (!keypoints || keypoints.length < 4) {
            // No keypoints, use face center heuristic
            return this.estimateGazeFromFaceCenter(face);
        }

        // MediaPipe BlazeFace keypoints:
        // 0: right eye, 1: left eye, 2: nose tip, 3: mouth center, 4: right ear, 5: left ear
        const rightEye = keypoints[0];
        const leftEye = keypoints[1];
        const noseTip = keypoints[2];

        if (!rightEye || !leftEye || !noseTip) {
            return this.estimateGazeFromFaceCenter(face);
        }

        // Get video dimensions for normalization
        const videoWidth = this.videoElement?.videoWidth || 640;
        const videoHeight = this.videoElement?.videoHeight || 480;

        // Convert normalized coordinates to pixels
        const leftEyeCenter = { x: leftEye.x * videoWidth, y: leftEye.y * videoHeight };
        const rightEyeCenter = { x: rightEye.x * videoWidth, y: rightEye.y * videoHeight };
        const noseCenter = { x: noseTip.x * videoWidth, y: noseTip.y * videoHeight };

        // Calculate eye midpoint
        const eyeMidpoint = {
            x: (leftEyeCenter.x + rightEyeCenter.x) / 2,
            y: (leftEyeCenter.y + rightEyeCenter.y) / 2,
        };

        // Calculate face center from bounding box
        const faceCenter = {
            x: face.x + face.width / 2,
            y: face.y + face.height / 2,
        };

        // Calculate horizontal deviation (nose position relative to eye midpoint)
        // If nose is significantly left/right of eye midpoint, head is turned
        const eyeDistance = Math.abs(leftEyeCenter.x - rightEyeCenter.x);
        const noseDeviation = (noseCenter.x - eyeMidpoint.x) / (eyeDistance || 1);

        // Vertical deviation from eye position relative to face center
        const verticalDeviation = (eyeMidpoint.y - faceCenter.y) / face.height;

        // Thresholds for gaze direction (more forgiving to reduce false positives)
        const HORIZONTAL_THRESHOLD = 0.35; // Was 0.15 - too sensitive
        const VERTICAL_THRESHOLD = 0.25;   // Was 0.1 - too sensitive  
        const SEVERE_THRESHOLD = 0.5;      // Was 0.3 - only flag extreme head turns

        let gazeDirection: "center" | "left" | "right" | "up" | "down" | "away" = "center";
        let isLookingAtScreen = true;

        if (Math.abs(noseDeviation) > HORIZONTAL_THRESHOLD || Math.abs(verticalDeviation) > VERTICAL_THRESHOLD) {
            isLookingAtScreen = false;

            if (Math.abs(noseDeviation) > Math.abs(verticalDeviation * 2)) {
                // Horizontal deviation is more significant
                gazeDirection = noseDeviation > 0 ? "left" : "right"; // Mirrored because video is usually mirrored
            } else if (Math.abs(verticalDeviation) > VERTICAL_THRESHOLD) {
                gazeDirection = verticalDeviation > 0 ? "up" : "down";
            }

            // Severe deviation = looking away
            if (Math.abs(noseDeviation) > SEVERE_THRESHOLD || Math.abs(verticalDeviation) > SEVERE_THRESHOLD) {
                gazeDirection = "away";
            }
        }

        return {
            isLookingAtScreen,
            leftEyeCenter,
            rightEyeCenter,
            gazeDirection,
        };
    }

    private estimateGazeFromFaceCenter(
        face: { x: number; y: number; width: number; height: number }
    ): FaceDetectionResult["eyeGaze"] {
        // Fallback: estimate gaze from face position in frame
        const videoWidth = this.videoElement?.videoWidth || 640;
        const videoHeight = this.videoElement?.videoHeight || 480;

        const faceCenter = {
            x: face.x + face.width / 2,
            y: face.y + face.height / 2,
        };

        const frameCenter = {
            x: videoWidth / 2,
            y: videoHeight / 2,
        };

        const horizontalDeviation = (faceCenter.x - frameCenter.x) / videoWidth;
        const verticalDeviation = (faceCenter.y - frameCenter.y) / videoHeight;

        const THRESHOLD = 0.35; // Was 0.25 - more forgiving to reduce false positives
        let gazeDirection: "center" | "left" | "right" | "up" | "down" | "away" = "center";
        const isLookingAtScreen = Math.abs(horizontalDeviation) < THRESHOLD && Math.abs(verticalDeviation) < THRESHOLD;

        if (!isLookingAtScreen) {
            if (Math.abs(horizontalDeviation) > Math.abs(verticalDeviation)) {
                gazeDirection = horizontalDeviation > 0 ? "right" : "left";
            } else {
                gazeDirection = verticalDeviation > 0 ? "down" : "up";
            }
        }

        return {
            isLookingAtScreen,
            leftEyeCenter: null,
            rightEyeCenter: null,
            gazeDirection,
        };
    }

    private checkViolations(result: FaceDetectionResult, now: number): void {
        const { faceCount, faces, eyeGaze } = result;

        // Multiple faces detected - critical
        if (faceCount > 1) {
            this.callbacks?.onViolation("MULTI_FACE", {
                count: faceCount,
                faces: faces.map(f => ({ x: f.x, y: f.y })),
            });
            this.noFaceStartTime = null;
            this.lookingAwayStartTime = null;
            return;
        }

        // No face detected
        if (faceCount === 0) {
            if (!this.noFaceStartTime) {
                this.noFaceStartTime = now;
            } else if (now - this.noFaceStartTime >= this.NO_FACE_THRESHOLD_MS) {
                this.callbacks?.onViolation("NO_FACE", {
                    duration_ms: now - this.noFaceStartTime,
                });
                // Reset to avoid spamming
                this.noFaceStartTime = now;
            }
            this.lookingAwayStartTime = null;
            return;
        }

        // Face detected - reset no face timer
        this.noFaceStartTime = null;
        this.lastFaceTime = now;

        // Check eye gaze - looking away detection
        if (eyeGaze && !eyeGaze.isLookingAtScreen) {
            if (!this.lookingAwayStartTime) {
                this.lookingAwayStartTime = now;
            } else if (now - this.lookingAwayStartTime >= this.LOOKING_AWAY_THRESHOLD_MS) {
                this.callbacks?.onViolation("LOOKING_AWAY", {
                    direction: eyeGaze.gazeDirection,
                    duration_ms: now - this.lookingAwayStartTime,
                });
                // Reset to avoid spamming
                this.lookingAwayStartTime = now;
            }
        } else {
            this.lookingAwayStartTime = null;
        }

        // Check for face size changes (person moving closer/further)
        if (faces.length === 1 && this.lastFaceBox) {
            const currentBox = faces[0];
            const sizeChange = Math.abs(
                (currentBox.width * currentBox.height) /
                (this.lastFaceBox.width * this.lastFaceBox.height) - 1
            );

            if (sizeChange > this.FACE_SIZE_CHANGE_THRESHOLD) {
                this.callbacks?.onViolation("FACE_SIZE_CHANGE", {
                    change_ratio: sizeChange,
                });
            }

            // Check for rapid movement
            const movementX = Math.abs(currentBox.x - this.lastFaceBox.x);
            const movementY = Math.abs(currentBox.y - this.lastFaceBox.y);

            if (movementX > this.MOVEMENT_THRESHOLD || movementY > this.MOVEMENT_THRESHOLD) {
                this.callbacks?.onViolation("RAPID_MOVEMENT", {
                    dx: movementX,
                    dy: movementY,
                });
            }

            this.lastFaceBox = {
                x: currentBox.x,
                y: currentBox.y,
                width: currentBox.width,
                height: currentBox.height,
            };
        } else if (faces.length === 1) {
            this.lastFaceBox = {
                x: faces[0].x,
                y: faces[0].y,
                width: faces[0].width,
                height: faces[0].height,
            };
        }
    }

    isReady(): boolean {
        return this.isInitialized;
    }

    isActive(): boolean {
        return this.isRunning;
    }

    async destroy(): Promise<void> {
        this.stop();
        if (this.faceDetector) {
            this.faceDetector.close();
            this.faceDetector = null;
        }
        this.videoElement = null;
        this.callbacks = null;
        this.lastFaceBox = null;
        this.isInitialized = false;
    }
}

// Create a lazy-initialized singleton
let serviceInstance: FaceDetectionService | null = null;

export function getFaceDetectionService(): FaceDetectionService {
    if (!serviceInstance) {
        serviceInstance = new FaceDetectionService();
    }
    return serviceInstance;
}

// For backward compatibility
export const faceDetectionService = {
    initialize: () => getFaceDetectionService().initialize(),
    setVideoElement: (video: HTMLVideoElement) => getFaceDetectionService().setVideoElement(video),
    setCallbacks: (callbacks: FaceDetectionCallback) => getFaceDetectionService().setCallbacks(callbacks),
    start: () => getFaceDetectionService().start(),
    stop: () => getFaceDetectionService().stop(),
    isReady: () => serviceInstance?.isReady() ?? false,
    isActive: () => serviceInstance?.isActive() ?? false,
    destroy: () => serviceInstance?.destroy(),
};
