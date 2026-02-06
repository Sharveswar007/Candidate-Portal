// Enhanced User Profile Page with Stunning UI and Animations

"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    User,
    Mail,
    Phone,
    MapPin,
    GraduationCap,
    Briefcase,
    Target,
    TrendingUp,
    Code2,
    FileText,
    LogOut,
    Edit3,
    Check,
    X,
    Loader2,
    Award,
    Zap,
    Star,
    ChevronRight,
    Calendar,
    Trophy,
    Flame,
    Sparkles,
    Brain,
    Rocket,
    Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { createClient } from "@/lib/supabase/client";
import { recordActivity, getActivityStats } from "@/lib/activity";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ProfileData {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    location: string | null;
    current_education: string | null;
    avatar_url: string | null;
    onboarding_complete: boolean;
    role: string | null;
    updated_at: string | null;
    created_at: string | null;
}

interface AssessmentData {
    selected_career: string;
    career_score: number;
    logic_score: number;
    total_score: number;
    completed_at: string;
}

interface GapAnalysisData {
    readiness_score: number;
    target_career: string;
    strengths: string[];
    weaknesses: string[];
}

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

const quickActions = [
    {
        href: "/assessment",
        label: "Take Assessment",
        icon: Sparkles,
        color: "from-pink-500 to-rose-600",
        description: "Multi-modal evaluation",
    },
    {
        href: "/results",
        label: "View Results",
        icon: Target,
        color: "from-[#2E2E2E] to-[#404040]",
        description: "AI decision report",
    },
    {
        href: "/challenges",
        label: "Coding Sandbox",
        icon: Code2,
        color: "from-[#2E2E2E] to-[#404040]",
        description: "Practice coding",
    },
    {
        href: "/resume",
        label: "Resume Analysis",
        icon: FileText,
        color: "from-[#2E2E2E] to-[#404040]",
        description: "Get ATS score",
    },
    {
        href: "/dashboard",
        label: "Dashboard",
        icon: Rocket,
        color: "from-[#2E2E2E] to-[#404040]",
        description: "Your overview",
    },
    {
        href: "/psychometric",
        label: "Psychometric",
        icon: Brain,
        color: "from-[#2E2E2E] to-[#404040]",
        description: "Personality test",
    },
];

export default function ProfilePage() {
    const router = useRouter();
    const supabase = createClient();

    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [assessment, setAssessment] = useState<AssessmentData | null>(null);
    const [gapAnalysis, setGapAnalysis] = useState<GapAnalysisData | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [challengesSolved, setChallengesSolved] = useState(0);
    const [resumesAnalyzed, setResumesAnalyzed] = useState(0);
    const [currentStreak, setCurrentStreak] = useState(0);
    const [chatSessions, setChatSessions] = useState(0);
    const [latestAtsScore, setLatestAtsScore] = useState<number | null>(null);
    const [totalAssessments, setTotalAssessments] = useState(0);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    const [editForm, setEditForm] = useState({
        full_name: "",
        phone: "",
        location: "",
        current_education: "",
    });

    useEffect(() => {
        const loadData = async () => {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push("/login");
                return;
            }

            // Record activity for streak tracking
            await recordActivity(supabase, user.id);

            // Get activity stats
            const activityStats = await getActivityStats(supabase, user.id);
            setCurrentStreak(activityStats.currentStreak);

            // Load all data in parallel (using TalentPulse schema)
            const [profileRes, assessmentRes, challengesRes, resumesRes, allAssessmentsRes] = await Promise.all([
                supabase.from("profiles").select("id, email, full_name, avatar_url, role, phone, location, current_education, onboarding_complete, updated_at, created_at").eq("id", user.id).maybeSingle(),
                supabase
                    .from("assessment_sessions")
                    .select("technical_score, psychometric_score, coding_score, total_score, completed_at")
                    .eq("candidate_id", user.id)
                    .eq("status", "completed")
                    .order("completed_at", { ascending: false })
                    .limit(1)
                    .maybeSingle(),
                supabase
                    .from("coding_submissions")
                    .select("id")
                    .eq("candidate_id", user.id)
                    .eq("status", "passed"),
                supabase
                    .from("resume_analyses")
                    .select("id, ats_score")
                    .eq("candidate_id", user.id)
                    .order("created_at", { ascending: false }),
                supabase
                    .from("assessment_sessions")
                    .select("id")
                    .eq("candidate_id", user.id),
            ]);
            
            // Set placeholder for gap analysis (not in current schema)
            const gapRes = { data: null };

            if (profileRes.data) {
                setProfile(profileRes.data);
                setEditForm({
                    full_name: profileRes.data.full_name || "",
                    phone: profileRes.data.phone || "",
                    location: profileRes.data.location || "",
                    current_education: profileRes.data.current_education || "",
                });
            }

            // Transform assessment data to match expected format
            if (assessmentRes.data) {
                setAssessment({
                    selected_career: "Assessment Complete",
                    career_score: assessmentRes.data.technical_score || 0,
                    logic_score: assessmentRes.data.coding_score || 0,
                    total_score: assessmentRes.data.total_score || 0,
                    completed_at: assessmentRes.data.completed_at || new Date().toISOString(),
                });
            }
            if (gapRes.data) setGapAnalysis(gapRes.data);
            if (challengesRes.data) setChallengesSolved(challengesRes.data.length);
            if (resumesRes.data) {
                setResumesAnalyzed(resumesRes.data.length);
                // Get latest ATS score
                if (resumesRes.data.length > 0 && resumesRes.data[0].ats_score) {
                    setLatestAtsScore(resumesRes.data[0].ats_score);
                }
            }
            // Chat sessions not in current schema
            setChatSessions(0);
            if (allAssessmentsRes.data) setTotalAssessments(allAssessmentsRes.data.length);

            setLoading(false);
        };

        loadData();
    }, [supabase, router]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from("profiles")
                .update({
                    full_name: editForm.full_name,
                    phone: editForm.phone,
                    location: editForm.location,
                    current_education: editForm.current_education,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", profile?.id);

            if (error) throw error;

            setProfile((prev) =>
                prev
                    ? {
                        ...prev,
                        ...editForm,
                    }
                    : null
            );
            setEditing(false);
            toast.success("Profile updated successfully!");
        } catch {
            toast.error("Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !profile?.id) return;

        // Validate file
        if (!file.type.startsWith("image/")) {
            toast.error("Please select an image file");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image must be less than 5MB");
            return;
        }

        setUploadingAvatar(true);
        try {
            // Create unique file name
            const fileExt = file.name.split(".").pop();
            const fileName = `${profile.id}-${Date.now()}.${fileExt}`;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from("avatars")
                .upload(fileName, file, { upsert: true });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from("avatars")
                .getPublicUrl(fileName);

            // Update profile with new avatar URL
            const { error: updateError } = await supabase
                .from("profiles")
                .update({ avatar_url: publicUrl })
                .eq("id", profile.id);

            if (updateError) throw updateError;

            // Update local state
            setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
            toast.success("Profile photo updated!");
        } catch (error: any) {
            console.error("Avatar upload error:", error);
            toast.error(error.message || "Failed to upload photo");
        } finally {
            setUploadingAvatar(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#2E2E2E]">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center gap-4"
                >
                    <div className="relative">
                        <div className="h-16 w-16 rounded-full bg-[#2E2E2E] dark:bg-white animate-pulse" />
                        <Loader2 className="h-8 w-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white dark:text-[#2E2E2E] animate-spin" />
                    </div>
                    <p className="text-muted-foreground">Loading your profile...</p>
                </motion.div>
            </div>
        );
    }

    const readinessScore = gapAnalysis?.readiness_score || 0;
    const getReadinessColor = (score: number) => {
        if (score >= 70) return "text-green-500";
        if (score >= 50) return "text-amber-500";
        return "text-red-500";
    };

    return (
        <div className="min-h-screen bg-white dark:bg-[#2E2E2E]">
            {/* Animated Background Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    className="absolute top-20 left-10 w-72 h-72 bg-[#2E2E2E]/10 dark:bg-white/10 rounded-full blur-3xl"
                    animate={{
                        x: [0, 50, 0],
                        y: [0, 30, 0],
                    }}
                    transition={{
                        duration: 10,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
                <motion.div
                    className="absolute bottom-20 right-10 w-96 h-96 bg-[#2E2E2E]/5 dark:bg-white/5 rounded-full blur-3xl"
                    animate={{
                        x: [0, -50, 0],
                        y: [0, -30, 0],
                    }}
                    transition={{
                        duration: 12,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
            </div>

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="container max-w-5xl mx-auto py-8 px-4 relative z-10"
            >
                {/* Header Section */}
                <motion.div variants={itemVariants} className="mb-8">
                    <Card className="p-6 overflow-hidden relative bg-[#2E2E2E] border-0 text-white">
                        {/* Decorative Pattern */}
                        <div className="absolute inset-0 opacity-10">
                            <div className="absolute top-0 right-0 w-96 h-96 border border-white/20 rounded-full -translate-y-1/2 translate-x-1/2" />
                            <div className="absolute bottom-0 left-0 w-64 h-64 border border-white/20 rounded-full translate-y-1/2 -translate-x-1/2" />
                        </div>

                        <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6">
                            {/* Avatar with Upload */}
                            <motion.div
                                className="relative group"
                                whileHover={{ scale: 1.05 }}
                                transition={{ type: "spring", stiffness: 300 }}
                            >
                                <div className="h-24 w-24 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30 shadow-xl overflow-hidden">
                                    {profile?.avatar_url ? (
                                        <img
                                            src={profile.avatar_url}
                                            alt="Avatar"
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <User className="h-10 w-10 text-white" />
                                    )}
                                </div>

                                {/* Upload Button Overlay */}
                                <label
                                    className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                >
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleAvatarUpload}
                                        className="hidden"
                                        disabled={uploadingAvatar}
                                    />
                                    {uploadingAvatar ? (
                                        <Loader2 className="h-6 w-6 text-white animate-spin" />
                                    ) : (
                                        <Camera className="h-6 w-6 text-white" />
                                    )}
                                </label>

                                {profile?.onboarding_complete && (
                                    <div className="absolute -bottom-2 -right-2 h-8 w-8 bg-green-500 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                                        <Check className="h-4 w-4 text-white" />
                                    </div>
                                )}
                            </motion.div>

                            {/* User Info */}
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h1 className="text-2xl font-bold">
                                        {profile?.full_name || "Welcome!"}
                                    </h1>
                                    <Badge className="bg-white/20 text-white border-white/30">
                                        <Sparkles className="h-3 w-3 mr-1" />
                                        Pro Member
                                    </Badge>
                                </div>
                                <p className="text-white/80 flex items-center gap-2 mb-3">
                                    <Mail className="h-4 w-4" />
                                    {profile?.email}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {assessment?.selected_career && (
                                        <Badge className="bg-white/20 text-white border-white/30">
                                            <Briefcase className="h-3 w-3 mr-1" />
                                            {assessment.selected_career}
                                        </Badge>
                                    )}
                                    {profile?.location && (
                                        <Badge className="bg-white/20 text-white border-white/30">
                                            <MapPin className="h-3 w-3 mr-1" />
                                            {profile.location}
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setEditing(true)}
                                    className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                                >
                                    <Edit3 className="h-4 w-4 mr-1" />
                                    Edit
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={handleLogout}
                                    className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                                >
                                    <LogOut className="h-4 w-4 mr-1" />
                                    Logout
                                </Button>
                            </div>
                        </div>
                    </Card>
                </motion.div>

                {/* Edit Profile Modal */}
                <AnimatePresence>
                    {editing && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                            onClick={() => setEditing(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Card className="p-6 w-full max-w-md max-h-[85vh] overflow-y-auto">
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-xl font-bold">Edit Profile</h2>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setEditing(false)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="space-y-4">
                                        {/* Personal Information */}
                                        <div>
                                            <label className="text-sm font-medium mb-1 block">Full Name</label>
                                            <Input
                                                value={editForm.full_name}
                                                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                                                placeholder="Your full name"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium mb-1 block">Phone</label>
                                            <Input
                                                value={editForm.phone}
                                                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                                placeholder="+91 XXXXX XXXXX"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium mb-1 block">Location</label>
                                            <Input
                                                value={editForm.location}
                                                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                                                placeholder="City, Country"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium mb-1 block">Current Education</label>
                                            <Input
                                                value={editForm.current_education}
                                                onChange={(e) => setEditForm({ ...editForm, current_education: e.target.value })}
                                                placeholder="B.Tech CSE, 3rd Year"
                                            />
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex gap-2 pt-4 border-t">
                                            <Button
                                                variant="outline"
                                                className="flex-1"
                                                onClick={() => setEditing(false)}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                className="flex-1 bg-[#2E2E2E] hover:bg-[#404040] text-white"
                                                onClick={handleSave}
                                                disabled={saving}
                                            >
                                                {saving ? (
                                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                ) : (
                                                    <Check className="h-4 w-4 mr-2" />
                                                )}
                                                Save Changes
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Stats Row */}
                <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                    <Card className="p-4 relative overflow-hidden group hover:shadow-lg transition-all">
                        <div className="absolute inset-0 bg-[#2E2E2E]/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="h-10 w-10 rounded-xl bg-[#2E2E2E]/20 flex items-center justify-center">
                                    <Brain className="h-5 w-5 text-[#2E2E2E] dark:text-white" />
                                </div>
                            </div>
                            <p className={cn("text-3xl font-bold", getReadinessColor(readinessScore))}>
                                {readinessScore}%
                            </p>
                            <p className="text-xs text-muted-foreground">Career Ready</p>
                        </div>
                    </Card>

                    <Card className="p-4 relative overflow-hidden group hover:shadow-lg transition-all">
                        <div className="absolute inset-0 bg-[#2E2E2E]/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="h-10 w-10 rounded-xl bg-[#2E2E2E]/20 flex items-center justify-center">
                                    <Trophy className="h-5 w-5 text-[#2E2E2E] dark:text-white" />
                                </div>
                            </div>
                            <p className="text-3xl font-bold">{challengesSolved}</p>
                            <p className="text-xs text-muted-foreground">Challenges Solved</p>
                        </div>
                    </Card>

                    <Card className="p-4 relative overflow-hidden group hover:shadow-lg transition-all">
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="h-10 w-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                                    <Flame className="h-5 w-5 text-orange-600" />
                                </div>
                            </div>
                            <p className="text-3xl font-bold">{currentStreak}</p>
                            <p className="text-xs text-muted-foreground">Day Streak</p>
                        </div>
                    </Card>

                    <Card className="p-4 relative overflow-hidden group hover:shadow-lg transition-all">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                    <FileText className="h-5 w-5 text-blue-600" />
                                </div>
                            </div>
                            <p className="text-3xl font-bold">{resumesAnalyzed}</p>
                            <p className="text-xs text-muted-foreground">Resumes Analyzed</p>
                        </div>
                    </Card>

                    <Card className="p-4 relative overflow-hidden group hover:shadow-lg transition-all">
                        <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="h-10 w-10 rounded-xl bg-pink-500/20 flex items-center justify-center">
                                    <Sparkles className="h-5 w-5 text-pink-600" />
                                </div>
                            </div>
                            <p className="text-3xl font-bold">{chatSessions}</p>
                            <p className="text-xs text-muted-foreground">Chat Sessions</p>
                        </div>
                    </Card>

                    <Card className="p-4 relative overflow-hidden group hover:shadow-lg transition-all">
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="h-10 w-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                                    <Award className="h-5 w-5 text-cyan-600" />
                                </div>
                            </div>
                            <p className={cn("text-3xl font-bold", latestAtsScore ? (latestAtsScore >= 70 ? "text-green-500" : latestAtsScore >= 50 ? "text-amber-500" : "text-red-500") : "")}>
                                {latestAtsScore ? `${latestAtsScore}%` : "N/A"}
                            </p>
                            <p className="text-xs text-muted-foreground">ATS Score</p>
                        </div>
                    </Card>
                </motion.div>

                {/* Assessment & Career Readiness */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                    {/* Assessment Results */}
                    <motion.div variants={itemVariants}>
                        <Card className="p-6 h-full">
                            <div className="flex items-center gap-2 mb-4">
                                <Award className="h-5 w-5 text-[#2E2E2E] dark:text-white" />
                                <h2 className="font-semibold">Assessment Results</h2>
                            </div>

                            {assessment ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                        <span className="text-sm">Career Path</span>
                                        <Badge className="bg-[#2E2E2E] text-white">
                                            {assessment.selected_career}
                                        </Badge>
                                    </div>

                                    <div className="space-y-3">
                                        <div>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span>Career Knowledge</span>
                                                <span className="font-medium">{assessment.career_score}/10</span>
                                            </div>
                                            <Progress
                                                value={assessment.career_score * 10}
                                                className="h-2"
                                            />
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span>Logic & Aptitude</span>
                                                <span className="font-medium">{assessment.logic_score}/10</span>
                                            </div>
                                            <Progress
                                                value={assessment.logic_score * 10}
                                                className="h-2"
                                            />
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span>Total Score</span>
                                                <span className="font-bold text-[#2E2E2E] dark:text-white">{assessment.total_score}/20</span>
                                            </div>
                                            <div className="h-3 rounded-full bg-[#2E2E2E]" style={{
                                                width: `${(assessment.total_score / 20) * 100}%`,
                                            }} />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
                                        <Calendar className="h-3 w-3" />
                                        Completed {new Date(assessment.completed_at).toLocaleDateString()}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <Rocket className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                                    <p className="text-muted-foreground mb-4">
                                        Complete your assessment to unlock insights
                                    </p>
                                    <Link href="/onboarding/career?retake=true">
                                        <Button className="bg-[#2E2E2E] hover:bg-[#404040] text-white">
                                            Start Assessment
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </Card>
                    </motion.div>

                    {/* Career Readiness Gauge */}
                    <motion.div variants={itemVariants}>
                        <Card className="p-6 h-full">
                            <div className="flex items-center gap-2 mb-4">
                                <Target className="h-5 w-5 text-[#2E2E2E] dark:text-white" />
                                <h2 className="font-semibold">Career Readiness</h2>
                            </div>

                            {gapAnalysis ? (
                                <div className="space-y-4">
                                    {/* Circular Progress */}
                                    <div className="flex justify-center py-4">
                                        <div className="relative h-32 w-32">
                                            <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                                                <circle
                                                    cx="50"
                                                    cy="50"
                                                    r="40"
                                                    strokeWidth="8"
                                                    fill="none"
                                                    className="stroke-muted"
                                                />
                                                <motion.circle
                                                    cx="50"
                                                    cy="50"
                                                    r="40"
                                                    strokeWidth="8"
                                                    fill="none"
                                                    strokeLinecap="round"
                                                    className={cn(
                                                        readinessScore >= 70 ? "stroke-green-500" :
                                                            readinessScore >= 50 ? "stroke-amber-500" :
                                                                "stroke-red-500"
                                                    )}
                                                    initial={{ strokeDasharray: "0 251.2" }}
                                                    animate={{
                                                        strokeDasharray: `${(readinessScore / 100) * 251.2} 251.2`,
                                                    }}
                                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                                />
                                            </svg>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                <motion.span
                                                    className={cn("text-3xl font-bold", getReadinessColor(readinessScore))}
                                                    initial={{ opacity: 0, scale: 0.5 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ delay: 0.5 }}
                                                >
                                                    {readinessScore}%
                                                </motion.span>
                                                <span className="text-xs text-muted-foreground">Ready</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Strengths Preview */}
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium flex items-center gap-2">
                                            <Star className="h-4 w-4 text-yellow-500" />
                                            Top Strengths
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {gapAnalysis.strengths?.slice(0, 3).map((s, i) => (
                                                <Badge key={i} variant="secondary" className="text-xs">
                                                    {s}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>

                                    <Link href="/skills">
                                        <Button variant="outline" className="w-full group">
                                            View Full Analysis
                                            <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                                        </Button>
                                    </Link>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <Zap className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                                    <p className="text-muted-foreground">
                                        Complete assessment for analysis
                                    </p>
                                </div>
                            )}
                        </Card>
                    </motion.div>
                </div>

                {/* Quick Actions */}
                <motion.div variants={itemVariants}>
                    <h2 className="font-semibold mb-4 flex items-center gap-2">
                        <Zap className="h-5 w-5 text-amber-500" />
                        Quick Actions
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {quickActions.map((action, index) => {
                            const Icon = action.icon;
                            return (
                                <motion.div
                                    key={action.href}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 * index }}
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <Link href={action.href}>
                                        <Card className="p-4 h-full cursor-pointer group hover:shadow-lg transition-all relative overflow-hidden">
                                            <div className={cn(
                                                "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity",
                                                action.color
                                            )} />
                                            <div className="relative">
                                                <div className={cn(
                                                    "h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3",
                                                    action.color
                                                )}>
                                                    <Icon className="h-5 w-5 text-white" />
                                                </div>
                                                <h3 className="font-medium text-sm mb-1 group-hover:text-[#2E2E2E] dark:group-hover:text-white transition-colors">
                                                    {action.label}
                                                </h3>
                                                <p className="text-xs text-muted-foreground">
                                                    {action.description}
                                                </p>
                                            </div>
                                            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                        </Card>
                                    </Link>
                                </motion.div>
                            );
                        })}
                    </div>
                </motion.div>

                {/* Retake Assessment Link */}
                <motion.div
                    variants={itemVariants}
                    className="mt-8 text-center"
                >
                    <Link href="/onboarding/career?retake=true">
                        <Button variant="ghost" className="text-muted-foreground hover:text-[#2E2E2E] dark:hover:text-white">
                            <Rocket className="h-4 w-4 mr-2" />
                            Retake Assessment
                        </Button>
                    </Link>
                </motion.div>
            </motion.div>
        </div>
    );
}
