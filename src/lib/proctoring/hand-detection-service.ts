// Hand Detection Service using TensorFlow.js and MediaPipe Hands
// Detects hands in video stream for proctoring violation detection
// Uses dynamic import to avoid SSR issues

export type HandDetectionResult = {
    handCount: number;
    hands: Array<{
        handedness: "Left" | "Right";
        score: number;
        wrist: { x: number; y: number };
        fingerTips: Array<{ x: number; y: number; name: string }>;
    }>;
    timestamp: number;
};

export type HandViolation = "HAND_DETECTED" | "HAND_COVERING_FACE" | "PHONE_GESTURE";

export interface HandDetectionCallback {
    onHandDetected: (result: HandDetectionResult) => void;
    onViolation: (type: HandViolation, details?: Record<string, unknown>) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let handPoseDetection: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let detector: any = null;

class HandDetectionService {
    private isInitialized = false;
    private isRunning = false;
    private videoElement: HTMLVideoElement | null = null;
    private callbacks: HandDetectionCallback | null = null;
    private detectionInterval: NodeJS.Timeout | null = null;
    private handDetectedStartTime: number | null = null;
    private lastVideoWidth = 0;
    private lastVideoHeight = 0;

    // Configuration
    private readonly DETECTION_INTERVAL_MS = 800; // Slightly slower than face detection to reduce CPU load
    private readonly HAND_DETECTED_THRESHOLD_MS = 1500; // Warn after hands visible for 1.5 seconds
    private readonly FACE_REGION_THRESHOLD = 0.3; // What portion of frame is considered "face region"

    async initialize(): Promise<boolean> {
        // Only initialize on client side
        if (typeof window === "undefined") {
            console.log("[HandDetection] Skipping initialization - not in browser");
            return false;
        }

        if (this.isInitialized) return true;

        try {
            // Use the full @tensorflow/tfjs bundle which includes all backends
            const tf = await import("@tensorflow/tfjs");
            
            // Wait for TF.js to be ready
            await tf.ready();
            
            console.log("[HandDetection] TF.js backend ready:", tf.getBackend());
            
            // Import hand pose detection
            handPoseDetection = await import("@tensorflow-models/hand-pose-detection");

            // Verify the module imported correctly
            if (!handPoseDetection || !handPoseDetection.createDetector) {
                console.error("[HandDetection] handPoseDetection module not loaded correctly:", handPoseDetection);
                return false;
            }

            // Create detector using MediaPipe Hands with TFJS runtime
            const model = handPoseDetection.SupportedModels.MediaPipeHands;
            const detectorConfig = {
                runtime: "tfjs" as const,
                modelType: "lite" as const, // Use lite model for faster inference
                maxHands: 2,
            };

            console.log("[HandDetection] Creating detector with config:", detectorConfig);
            detector = await handPoseDetection.createDetector(model, detectorConfig);

            // Verify detector was created properly
            if (!detector || typeof detector.estimateHands !== "function") {
                console.error("[HandDetection] Detector not created correctly. Type:", typeof detector, "Methods:", detector ? Object.keys(detector) : "null");
                return false;
            }

            console.log("[HandDetection] Model loaded successfully, detector type:", typeof detector);
            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error("[HandDetection] Failed to load model:", error);
            return false;
        }
    }

    setVideoElement(video: HTMLVideoElement): void {
        this.videoElement = video;
        this.lastVideoWidth = video.videoWidth || 640;
        this.lastVideoHeight = video.videoHeight || 480;
    }

    setCallbacks(callbacks: HandDetectionCallback): void {
        this.callbacks = callbacks;
    }

    start(): void {
        if (!this.isInitialized || !this.videoElement || this.isRunning) {
            console.warn("[HandDetection] Cannot start: not initialized or already running");
            return;
        }

        this.isRunning = true;
        this.handDetectedStartTime = null;

        this.detectionInterval = setInterval(() => {
            this.detectHands();
        }, this.DETECTION_INTERVAL_MS);

        console.log("[HandDetection] Detection started");
    }

    stop(): void {
        if (this.detectionInterval) {
            clearInterval(this.detectionInterval);
            this.detectionInterval = null;
        }
        this.isRunning = false;
        this.handDetectedStartTime = null;
        console.log("[HandDetection] Detection stopped");
    }

    private async detectHands(): Promise<void> {
        if (!this.videoElement || !this.isRunning || !detector) return;

        try {
            // Ensure video is ready
            if (this.videoElement.readyState < 2) return;

            // Verify detector has estimateHands method
            if (typeof detector.estimateHands !== "function") {
                console.error("[HandDetection] detector.estimateHands is not a function, detector:", detector);
                this.stop();
                return;
            }

            // Update video dimensions
            this.lastVideoWidth = this.videoElement.videoWidth || 640;
            this.lastVideoHeight = this.videoElement.videoHeight || 480;

            const hands = await detector.estimateHands(this.videoElement, {
                flipHorizontal: false,
            });

            const now = Date.now();

            const result: HandDetectionResult = {
                handCount: hands.length,
                hands: hands.map((hand: any) => {
                    const keypoints = hand.keypoints || [];
                    const wrist = keypoints.find((kp: any) => kp.name === "wrist") || { x: 0, y: 0 };
                    const fingerTips = keypoints.filter((kp: any) => 
                        kp.name?.includes("tip")
                    ).map((kp: any) => ({
                        x: kp.x,
                        y: kp.y,
                        name: kp.name,
                    }));

                    return {
                        handedness: hand.handedness as "Left" | "Right",
                        score: hand.score || 0,
                        wrist: { x: wrist.x, y: wrist.y },
                        fingerTips,
                    };
                }),
                timestamp: now,
            };

            // Notify callback of detection
            this.callbacks?.onHandDetected(result);

            // Check for violations
            this.checkViolations(result, now);

        } catch (error) {
            console.error("[HandDetection] Detection error:", error);
        }
    }

    private checkViolations(result: HandDetectionResult, now: number): void {
        const { handCount, hands } = result;

        // No hands detected - reset timer
        if (handCount === 0) {
            this.handDetectedStartTime = null;
            return;
        }

        // Hands detected - start or check timer
        if (!this.handDetectedStartTime) {
            this.handDetectedStartTime = now;
        }

        // Check if hand is in face region (upper portion of frame)
        const faceRegionY = this.lastVideoHeight * this.FACE_REGION_THRESHOLD;
        const handInFaceRegion = hands.some(hand => {
            // Check if wrist or finger tips are in upper portion of frame
            if (hand.wrist.y < faceRegionY) return true;
            return hand.fingerTips.some(tip => tip.y < faceRegionY);
        });

        if (handInFaceRegion) {
            // Hand covering face - immediate violation
            this.callbacks?.onViolation("HAND_COVERING_FACE", {
                handCount,
                position: "face_region",
            });
            return;
        }

        // Check for phone holding gesture (hand positioned as if holding phone)
        const phoneGesture = this.detectPhoneGesture(hands);
        if (phoneGesture) {
            this.callbacks?.onViolation("PHONE_GESTURE", {
                handedness: phoneGesture.handedness,
                confidence: phoneGesture.confidence,
            });
            return;
        }

        // General hand detection warning (after threshold)
        if (now - this.handDetectedStartTime >= this.HAND_DETECTED_THRESHOLD_MS) {
            this.callbacks?.onViolation("HAND_DETECTED", {
                handCount,
                duration_ms: now - this.handDetectedStartTime,
                hands: hands.map(h => ({ handedness: h.handedness, wrist: h.wrist })),
            });
            // Reset to avoid spamming
            this.handDetectedStartTime = now;
        }
    }

    private detectPhoneGesture(hands: HandDetectionResult["hands"]): { handedness: string; confidence: number } | null {
        for (const hand of hands) {
            // Phone gesture: fingers relatively close together, hand tilted
            // This is a simplified heuristic - in production you might use a more sophisticated model
            
            if (hand.fingerTips.length < 4) continue;

            // Calculate spread of fingers
            const tipXs = hand.fingerTips.map(t => t.x);
            const tipYs = hand.fingerTips.map(t => t.y);
            const xSpread = Math.max(...tipXs) - Math.min(...tipXs);
            const ySpread = Math.max(...tipYs) - Math.min(...tipYs);

            // Phone holding: fingers close together horizontally, some vertical spread
            // And hand is in a specific region (side of frame)
            const isCloseHorizontally = xSpread < 50;
            const hasVerticalSpread = ySpread > 30;
            const isAtSide = hand.wrist.x < this.lastVideoWidth * 0.2 || 
                            hand.wrist.x > this.lastVideoWidth * 0.8;

            if (isCloseHorizontally && hasVerticalSpread && isAtSide) {
                return {
                    handedness: hand.handedness,
                    confidence: hand.score,
                };
            }
        }

        return null;
    }

    isReady(): boolean {
        return this.isInitialized;
    }

    isActive(): boolean {
        return this.isRunning;
    }

    destroy(): void {
        this.stop();
        this.videoElement = null;
        this.callbacks = null;
    }
}

// Create a lazy-initialized singleton
let serviceInstance: HandDetectionService | null = null;

export function getHandDetectionService(): HandDetectionService {
    if (!serviceInstance) {
        serviceInstance = new HandDetectionService();
    }
    return serviceInstance;
}

// For convenience export
export const handDetectionService = {
    initialize: () => getHandDetectionService().initialize(),
    setVideoElement: (video: HTMLVideoElement) => getHandDetectionService().setVideoElement(video),
    setCallbacks: (callbacks: HandDetectionCallback) => getHandDetectionService().setCallbacks(callbacks),
    start: () => getHandDetectionService().start(),
    stop: () => getHandDetectionService().stop(),
    isReady: () => serviceInstance?.isReady() ?? false,
    isActive: () => serviceInstance?.isActive() ?? false,
    destroy: () => serviceInstance?.destroy(),
};
