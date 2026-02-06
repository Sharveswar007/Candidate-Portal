// Type declarations for RecordRTC
declare module "recordrtc" {
    interface RecordRTCOptions {
        type?: "video" | "audio" | "canvas" | "gif";
        mimeType?: string;
        bitsPerSecond?: number;
        disableLogs?: boolean;
        recorderType?: unknown;
        numberOfAudioChannels?: number;
        desiredSampRate?: number;
        checkForInactiveTracks?: boolean;
        bufferSize?: number;
        frameInterval?: number;
        video?: HTMLVideoElement;
        canvas?: {
            width: number;
            height: number;
        };
        timeSlice?: number;
        ondataavailable?: (blob: Blob) => void;
        onTimeStamp?: (timestamp: number) => void;
    }

    export default class RecordRTC {
        constructor(stream: MediaStream, options?: RecordRTCOptions);

        startRecording(): void;
        stopRecording(callback?: () => void): void;
        pauseRecording(): void;
        resumeRecording(): void;
        reset(): void;
        destroy(): void;

        getBlob(): Blob;
        getDataURL(callback: (dataURL: string) => void): void;
        getState(): "inactive" | "recording" | "paused" | "stopped";

        blob: Blob;
        toURL(): string;

        static version: string;
        static getFromDisk(type: string, callback: (dataURL: string) => void): void;
        static writeToDisk(options: { audio?: Blob; video?: Blob; gif?: Blob }): void;
    }
}
