// Recording Service using RecordRTC
// Records webcam and screen as SEPARATE streams for better performance
// No canvas compositing - uses native hardware encoding

// Dynamic import to avoid SSR issues in Next.js
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let RecordRTC: any = null;

export type RecordingStatus = "idle" | "initializing" | "recording" | "paused" | "stopped" | "uploading" | "error";

export interface RecordingConfig {
    attemptId: string;
    sessionId?: string;
    candidateId: string;
    chunkDurationMs?: number; // Default 30 seconds
    includeScreen?: boolean; // Record screen along with webcam
    existingStream?: MediaStream; // Optional: use existing webcam stream instead of requesting new one
    existingScreenStream?: MediaStream; // Optional: use existing screen stream instead of requesting new one
}

export interface RecordingCallbacks {
    onStatusChange: (status: RecordingStatus) => void;
    onChunkUploaded: (url: string, index: number, type: 'webcam' | 'screen') => void;
    onError: (error: string) => void;
    onDurationChange: (seconds: number) => void;
}

// Interface for RecordRTC instance methods we use
interface RecordRTCInstance {
    startRecording(): void;
    stopRecording(callback?: () => void): void;
    pauseRecording(): void;
    resumeRecording(): void;
    getBlob(): Blob;
    destroy(): void;
}

class RecordingService {
    private webcamRecorder: RecordRTCInstance | null = null;
    private screenRecorder: RecordRTCInstance | null = null;
    private webcamStream: MediaStream | null = null;
    private screenStream: MediaStream | null = null;
    private status: RecordingStatus = "idle";
    private callbacks: RecordingCallbacks | null = null;
    private config: RecordingConfig | null = null;
    private chunkIndex = 0;
    private chunkInterval: NodeJS.Timeout | null = null;
    private durationInterval: NodeJS.Timeout | null = null;
    private startTime = 0;
    private duration = 0;
    private isScreenRecordingEnabled = false;

    setCallbacks(callbacks: RecordingCallbacks): void {
        this.callbacks = callbacks;
    }

    async initialize(config: RecordingConfig): Promise<boolean> {
        // Check if running in browser
        if (typeof window === "undefined") {
            console.warn("[Recording] Cannot initialize: running in SSR context");
            return false;
        }

        // Dynamically import RecordRTC only in browser
        if (!RecordRTC) {
            try {
                const module = await import("recordrtc");
                RecordRTC = module.default;
                console.log("[Recording] RecordRTC loaded dynamically");
            } catch (err) {
                console.error("[Recording] Failed to load RecordRTC:", err);
                this.setStatus("error");
                this.callbacks?.onError("Failed to load recording library");
                return false;
            }
        }

        this.config = config;
        this.setStatus("initializing");

        try {
            // === WEBCAM STREAM ===
            if (config.existingStream) {
                this.webcamStream = config.existingStream;
                console.log("[Recording] Using existing webcam stream");
            } else {
                this.webcamStream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 640 },
                        height: { ideal: 480 },
                        facingMode: "user",
                    },
                    audio: true,
                });
                console.log("[Recording] Created new webcam stream");
            }

            // Configure webcam recorder with optimal settings
            if (!RecordRTC) {
                throw new Error("RecordRTC not loaded");
            }
            this.webcamRecorder = new RecordRTC(this.webcamStream, {
                type: "video",
                mimeType: "video/webm;codecs=vp8,opus", // VP8 is faster than VP9
                bitsPerSecond: 500000, // 500kbps for webcam
                disableLogs: true,
                // RecordRTC optimization options
                timeSlice: 1000, // Get data every second for smoother recording
                ondataavailable: () => {}, // Required for timeSlice
            });

            // === SCREEN STREAM (if requested) ===
            if (config.includeScreen) {
                try {
                    // Use existing screen stream if provided - don't request new one during exam
                    if (config.existingScreenStream) {
                        const tracks = config.existingScreenStream.getVideoTracks();
                        if (tracks.length > 0 && tracks[0].readyState === 'live') {
                            this.screenStream = config.existingScreenStream;
                            console.log("[Recording] Using existing screen stream");
                            
                            // Only create screen recorder if we have a valid stream
                            if (!RecordRTC) {
                                throw new Error("RecordRTC not loaded for screen recording");
                            }
                            this.screenRecorder = new RecordRTC(this.screenStream, {
                                type: "video",
                                mimeType: "video/webm;codecs=vp8",
                                bitsPerSecond: 1000000,
                                disableLogs: true,
                                timeSlice: 1000,
                                ondataavailable: () => {},
                            });

                            this.isScreenRecordingEnabled = true;

                            // Listen for screen share being stopped by user
                            this.screenStream.getVideoTracks()[0].addEventListener("ended", () => {
                                console.warn("[Recording] Screen sharing stopped by user");
                                this.stopScreenRecording();
                            });
                        } else {
                            // Stream is not active but we DON'T request new one - would interrupt exam
                            console.warn("[Recording] Existing screen stream ended, continuing without screen recording");
                            this.isScreenRecordingEnabled = false;
                        }
                    } else {
                        // No existing stream provided - this shouldn't happen after setup phase
                        console.warn("[Recording] No screen stream provided, skipping screen recording");
                        this.isScreenRecordingEnabled = false;
                    }

                } catch (screenError) {
                    console.warn("[Recording] Screen recording setup failed, continuing without:", screenError);
                    this.isScreenRecordingEnabled = false;
                }
            }

            this.setStatus("idle");
            console.log("[Recording] Initialized successfully", {
                webcam: !!this.webcamRecorder,
                screen: !!this.screenRecorder
            });
            return true;

        } catch (error) {
            console.error("[Recording] Initialization failed:", error);
            this.setStatus("error");
            this.callbacks?.onError("Failed to initialize recording: " + (error as Error).message);
            return false;
        }
    }

    start(): void {
        if (!this.webcamRecorder || this.status === "recording") {
            console.warn("[Recording] Cannot start: not initialized or already recording");
            return;
        }

        // Start webcam recording
        this.webcamRecorder.startRecording();
        
        // Start screen recording if enabled
        if (this.screenRecorder && this.isScreenRecordingEnabled) {
            this.screenRecorder.startRecording();
        }

        this.setStatus("recording");
        this.startTime = Date.now();
        this.chunkIndex = 0;

        // Start duration timer
        this.durationInterval = setInterval(() => {
            this.duration = Math.floor((Date.now() - this.startTime) / 1000);
            this.callbacks?.onDurationChange(this.duration);
        }, 1000);

        // Start chunking interval (every 30 seconds by default)
        const chunkDuration = this.config?.chunkDurationMs || 30000;
        this.chunkInterval = setInterval(() => {
            this.uploadChunks();
        }, chunkDuration);

        console.log("[Recording] Started", {
            webcam: true,
            screen: this.isScreenRecordingEnabled
        });
    }

    pause(): void {
        if (this.status !== "recording") return;

        this.webcamRecorder?.pauseRecording();
        this.screenRecorder?.pauseRecording();
        this.setStatus("paused");
        console.log("[Recording] Paused");
    }

    resume(): void {
        if (this.status !== "paused") return;

        this.webcamRecorder?.resumeRecording();
        this.screenRecorder?.resumeRecording();
        this.setStatus("recording");
        console.log("[Recording] Resumed");
    }

    private stopScreenRecording(): void {
        if (this.screenRecorder && this.isScreenRecordingEnabled) {
            this.screenRecorder.stopRecording(async () => {
                const blob = this.screenRecorder?.getBlob();
                if (blob && blob.size > 0) {
                    await this.uploadBlob(blob, "video", undefined, "screen");
                }
            });
            this.isScreenRecordingEnabled = false;
        }
    }

    async stop(): Promise<{ webcamUrl: string | null; screenUrl: string | null }> {
        // Clear intervals first
        if (this.chunkInterval) {
            clearInterval(this.chunkInterval);
            this.chunkInterval = null;
        }
        if (this.durationInterval) {
            clearInterval(this.durationInterval);
            this.durationInterval = null;
        }

        this.setStatus("stopped");

        const results: { webcamUrl: string | null; screenUrl: string | null } = {
            webcamUrl: null,
            screenUrl: null
        };

        // Stop webcam recording
        if (this.webcamRecorder) {
            await new Promise<void>((resolve) => {
                this.webcamRecorder!.stopRecording(async () => {
                    const blob = this.webcamRecorder!.getBlob();
                    if (blob && blob.size > 0) {
                        this.setStatus("uploading");
                        results.webcamUrl = await this.uploadBlob(blob, "video", undefined, "webcam");
                    }
                    resolve();
                });
            });
        }

        // Stop screen recording
        if (this.screenRecorder && this.isScreenRecordingEnabled) {
            await new Promise<void>((resolve) => {
                this.screenRecorder!.stopRecording(async () => {
                    const blob = this.screenRecorder!.getBlob();
                    if (blob && blob.size > 0) {
                        results.screenUrl = await this.uploadBlob(blob, "video", undefined, "screen");
                    }
                    resolve();
                });
            });
        }

        this.setStatus("idle");
        console.log("[Recording] Stopped, uploaded:", results);
        return results;
    }

    private async uploadChunks(): Promise<void> {
        if (this.status !== "recording") return;

        // Upload webcam chunk
        if (this.webcamRecorder) {
            const blob = this.webcamRecorder.getBlob();
            if (blob && blob.size > 0) {
                const url = await this.uploadBlob(blob, "chunk", this.chunkIndex, "webcam");
                if (url) {
                    this.callbacks?.onChunkUploaded(url, this.chunkIndex, "webcam");
                }
            }
        }

        // Upload screen chunk
        if (this.screenRecorder && this.isScreenRecordingEnabled) {
            const blob = this.screenRecorder.getBlob();
            if (blob && blob.size > 0) {
                const url = await this.uploadBlob(blob, "chunk", this.chunkIndex, "screen");
                if (url) {
                    this.callbacks?.onChunkUploaded(url, this.chunkIndex, "screen");
                }
            }
        }

        this.chunkIndex++;
    }

    private async uploadBlob(
        blob: Blob,
        type: "video" | "chunk" | "screenshot",
        chunkIndex?: number,
        streamType: "webcam" | "screen" = "webcam"
    ): Promise<string | null> {
        if (!this.config) return null;

        try {
            const formData = new FormData();
            
            // Generate filename with stream type
            const timestamp = Date.now();
            const filename = `${streamType}_${type}_${timestamp}.webm`;
            formData.append("file", blob, filename);
            formData.append("type", type);
            formData.append("streamType", streamType);
            formData.append("attemptId", this.config.attemptId);
            
            if (this.config.sessionId) {
                formData.append("sessionId", this.config.sessionId);
            }
            if (chunkIndex !== undefined) {
                formData.append("chunkIndex", chunkIndex.toString());
            }

            const response = await fetch("/api/proctoring/upload", {
                method: "POST",
                body: formData,
            });

            const result = await response.json();

            if (result.success) {
                console.log(`[Recording] Uploaded ${streamType} ${type}:`, result.url);
                return result.url || null;
            } else {
                console.error("[Recording] Upload failed:", result.error);
                return null;
            }
        } catch (error) {
            console.error("[Recording] Upload error:", error);
            this.callbacks?.onError("Upload failed: " + (error as Error).message);
            return null;
        }
    }

    async captureScreenshot(): Promise<string | null> {
        if (!this.webcamStream) return null;

        try {
            const videoTrack = this.webcamStream.getVideoTracks()[0];
            if (!videoTrack) return null;

            // Use ImageCapture API if available
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const ImageCapture = (window as any).ImageCapture;
            if (ImageCapture) {
                const imageCapture = new ImageCapture(videoTrack);
                const bitmap = await imageCapture.grabFrame();

                const canvas = document.createElement("canvas");
                canvas.width = bitmap.width;
                canvas.height = bitmap.height;
                const ctx = canvas.getContext("2d");
                ctx?.drawImage(bitmap, 0, 0);

                const blob = await new Promise<Blob | null>((resolve) => {
                    canvas.toBlob((b) => resolve(b), "image/jpeg", 0.8);
                });

                if (blob) {
                    return await this.uploadBlob(blob, "screenshot", undefined, "webcam");
                }
            }

            return null;
        } catch (error) {
            console.error("[Recording] Screenshot capture failed:", error);
            return null;
        }
    }

    // Capture screen screenshot (useful for violation documentation)
    async captureScreenScreenshot(): Promise<string | null> {
        if (!this.screenStream) return null;

        try {
            const videoTrack = this.screenStream.getVideoTracks()[0];
            if (!videoTrack) return null;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const ImageCapture = (window as any).ImageCapture;
            if (ImageCapture) {
                const imageCapture = new ImageCapture(videoTrack);
                const bitmap = await imageCapture.grabFrame();

                const canvas = document.createElement("canvas");
                canvas.width = bitmap.width;
                canvas.height = bitmap.height;
                const ctx = canvas.getContext("2d");
                ctx?.drawImage(bitmap, 0, 0);

                const blob = await new Promise<Blob | null>((resolve) => {
                    canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85);
                });

                if (blob) {
                    return await this.uploadBlob(blob, "screenshot", undefined, "screen");
                }
            }

            return null;
        } catch (error) {
            console.error("[Recording] Screen screenshot capture failed:", error);
            return null;
        }
    }

    private setStatus(status: RecordingStatus): void {
        this.status = status;
        this.callbacks?.onStatusChange(status);
    }

    getStatus(): RecordingStatus {
        return this.status;
    }

    getDuration(): number {
        return this.duration;
    }

    getStream(): MediaStream | null {
        return this.webcamStream;
    }

    getScreenStream(): MediaStream | null {
        return this.screenStream;
    }

    isScreenRecording(): boolean {
        return this.isScreenRecordingEnabled;
    }

    destroy(): void {
        // Stop recordings
        if (this.webcamRecorder) {
            try {
                this.webcamRecorder.stopRecording(() => {});
            } catch (e) {
                // Ignore errors during cleanup
            }
        }
        if (this.screenRecorder) {
            try {
                this.screenRecorder.stopRecording(() => {});
            } catch (e) {
                // Ignore errors during cleanup
            }
        }

        // Clear intervals
        if (this.chunkInterval) {
            clearInterval(this.chunkInterval);
            this.chunkInterval = null;
        }
        if (this.durationInterval) {
            clearInterval(this.durationInterval);
            this.durationInterval = null;
        }

        // Don't stop streams if they were passed in (they're managed elsewhere)
        if (this.webcamStream && !this.config?.existingStream) {
            this.webcamStream.getTracks().forEach((track) => track.stop());
        }
        if (this.screenStream && !this.config?.existingScreenStream) {
            this.screenStream.getTracks().forEach((track) => track.stop());
        }

        this.webcamStream = null;
        this.screenStream = null;
        this.webcamRecorder = null;
        this.screenRecorder = null;
        this.config = null;
        this.callbacks = null;
        this.chunkIndex = 0;
        this.duration = 0;
        this.isScreenRecordingEnabled = false;
        this.setStatus("idle");

        console.log("[Recording] Destroyed");
    }
}

// Singleton instance
export const recordingService = new RecordingService();
