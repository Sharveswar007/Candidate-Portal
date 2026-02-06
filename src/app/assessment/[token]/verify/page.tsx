"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, RefreshCw, CheckCircle, Shield, User } from "lucide-react";
import { motion } from "framer-motion";

export default function IdentityVerificationPage() {
    const router = useRouter();
    const params = useParams();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [verifying, setVerifying] = useState(false);
    const [verified, setVerified] = useState(false);

    useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, []);

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.error("Camera access denied:", err);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            if (context) {
                context.drawImage(videoRef.current, 0, 0, 640, 480);
                const imageData = canvasRef.current.toDataURL('image/jpeg');
                setCapturedImage(imageData);
                verifyIdentity();
            }
        }
    };

    const verifyIdentity = () => {
        setVerifying(true);
        // Simulate API verification delay
        setTimeout(() => {
            setVerifying(false);
            setVerified(true);
        }, 2000);
    };

    const retakePhoto = () => {
        setCapturedImage(null);
        setVerified(false);
        startCamera();
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl w-full"
            >
                <div className="grid md:grid-cols-2 gap-8 items-center">
                    <div className="space-y-6">
                        <div>
                            <h1 className="text-3xl font-bold text-foreground mb-2">Identity Verification</h1>
                            <p className="text-muted-foreground">Please verify your identity before starting the assessment.</p>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-start gap-4 p-4 rounded-lg bg-card border border-border">
                                <Shield className="h-6 w-6 text-[#2E2E2E] dark:text-white mt-1" />
                                <div>
                                    <h3 className="font-medium text-foreground">Secure Verification</h3>
                                    <p className="text-xs text-muted-foreground">Your photo will be matched against your profile and monitored during the test.</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 p-4 rounded-lg bg-card border border-border">
                                <User className="h-6 w-6 text-[#2E2E2E] dark:text-white mt-1" />
                                <div>
                                    <h3 className="font-medium text-foreground">Face Visibility</h3>
                                    <p className="text-xs text-muted-foreground">Ensure your face is clearly visible and within the frame at all times.</p>
                                </div>
                            </div>
                        </div>

                        {verified && (
                            <Button
                                className="w-full bg-[#2E2E2E] hover:bg-[#404040] text-white py-6 text-lg"
                                onClick={() => router.push(`/assessment/${params.token}/instructions`)}
                            >
                                Identity Verified - Continue
                            </Button>
                        )}
                    </div>

                    <Card className="p-1 bg-[#2E2E2E] rounded-xl overflow-hidden shadow-2xl">
                        <div className="relative bg-background rounded-lg overflow-hidden aspect-[4/3]">
                            {!capturedImage ? (
                                <>
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className="w-full h-full object-cover transform scale-x-[-1]"
                                    />
                                    <div className="absolute inset-0 flex items-end justify-center p-6 bg-gradient-to-t from-black/80 to-transparent">
                                        <Button
                                            size="lg"
                                            className="rounded-full h-14 w-14 bg-white hover:bg-gray-200 text-black p-0"
                                            onClick={capturePhoto}
                                        >
                                            <Camera className="h-6 w-6" />
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <img
                                        src={capturedImage}
                                        alt="Captured"
                                        className="w-full h-full object-cover transform scale-x-[-1]"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                                        {verifying ? (
                                            <div className="text-center">
                                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
                                                <p className="text-white font-medium">Verifying Identity...</p>
                                            </div>
                                        ) : (
                                            <div className="text-center">
                                                <div className="h-16 w-16 rounded-full bg-[#2E2E2E] flex items-center justify-center mx-auto mb-4 shadow-lg">
                                                    <CheckCircle className="h-8 w-8 text-white" />
                                                </div>
                                                <h3 className="text-xl font-bold text-white mb-2">Verified!</h3>
                                                <Button
                                                    variant="ghost"
                                                    className="text-gray-300 hover:text-white"
                                                    onClick={retakePhoto}
                                                >
                                                    <RefreshCw className="h-4 w-4 mr-2" />
                                                    Retake Photo
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                            <canvas ref={canvasRef} width={640} height={480} className="hidden" />
                        </div>
                    </Card>
                </div>
            </motion.div>
        </div>
    );
}
