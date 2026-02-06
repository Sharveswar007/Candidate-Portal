"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, User, Phone, MapPin, Briefcase, GraduationCap, Save, Wrench, FileText, Calendar, Upload, Sparkles, CheckCircle, AlertCircle, Link, Github, Linkedin, Globe, Code, Trophy, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface WorkExperience {
    company: string;
    role: string;
    start_date: string;
    end_date: string | null;
    description: string;
    location: string;
    is_current: boolean;
}

interface Project {
    title: string;
    description: string;
    technologies: string[];
    url: string | null;
    github_url: string | null;
}

interface Certification {
    name: string;
    issuer: string;
    issue_date?: string;
    credential_url?: string;
}

interface AutofillResult {
    full_name: string | null;
    phone_number: string | null;
    date_of_birth: string | null;
    gender: string | null;
    current_city: string | null;
    country: string | null;
    address: string | null;
    nationality: string | null;
    languages: string[];
    current_education: string | null;
    institute_name: string | null;
    education_major: string | null;
    graduation_year: string | null;
    cgpa: string | null;
    employment_status: string | null;
    years_experience: number;
    preferred_role: string | null;
    preferred_work_type: string | null;
    current_company: string | null;
    current_designation: string | null;
    notice_period: string | null;
    expected_salary: string | null;
    skills_primary: string[];
    skills_secondary: string[];
    linkedin_url: string | null;
    github_url: string | null;
    portfolio_url: string | null;
    twitter_url: string | null;
    leetcode_url: string | null;
    hackerrank_url: string | null;
    kaggle_url: string | null;
    stackoverflow_url: string | null;
    medium_url: string | null;
    personal_website: string | null;
    work_experience: WorkExperience[];
    projects: Project[];
    certifications: Certification[];
    achievements: string[];
    publications: string[];
    summary: string | null;
    headline: string | null;
}

export default function ProfilePage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [autofilling, setAutofilling] = useState(false);
    const [autofillSuccess, setAutofillSuccess] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [linkedinInput, setLinkedinInput] = useState("");

    // State matches DB Schema exactly
    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        phone_number: "",
        date_of_birth: "",
        gender: "",
        current_city: "",
        country: "",
        address: "",
        nationality: "",
        languages: "",

        // Education
        current_education: "",
        institute_name: "",
        education_major: "",
        graduation_year: "",
        cgpa: "",

        // Professional
        employment_status: "",
        years_experience: 0,
        preferred_role: "",
        preferred_work_type: "",
        current_company: "",
        current_designation: "",
        notice_period: "",
        expected_salary: "",

        // Skills
        skills_primary: "",
        skills_secondary: "",

        // Social Links
        linkedin_url: "",
        github_url: "",
        portfolio_url: "",
        twitter_url: "",
        leetcode_url: "",
        hackerrank_url: "",
        kaggle_url: "",
        personal_website: "",

        // Summary
        summary: "",
        headline: "",

        resume_url: ""
    });

    // Complex data types
    const [workExperience, setWorkExperience] = useState<WorkExperience[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [certifications, setCertifications] = useState<Certification[]>([]);
    const [achievements, setAchievements] = useState<string[]>([]);

    const supabase = createClient();

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setUserId(user.id);

        const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

        if (data) {
            setFormData({
                full_name: data.full_name || "",
                email: data.email || user.email || "",
                phone_number: data.phone_number || "",
                date_of_birth: data.date_of_birth || "",
                gender: data.gender || "",
                current_city: data.current_city || "",
                country: data.country || "",
                address: data.address || "",
                nationality: data.nationality || "",
                languages: Array.isArray(data.languages) ? data.languages.join(", ") : "",

                current_education: data.current_education || "",
                institute_name: data.institute_name || "",
                education_major: data.education_major || "",
                graduation_year: data.graduation_year || "",
                cgpa: data.cgpa || "",

                employment_status: data.employment_status || "",
                years_experience: data.years_experience || 0,
                preferred_role: data.preferred_role || "",
                preferred_work_type: data.preferred_work_type || "",
                current_company: data.current_company || "",
                current_designation: data.current_designation || "",
                notice_period: data.notice_period || "",
                expected_salary: data.expected_salary || "",

                skills_primary: Array.isArray(data.skills_primary) ? data.skills_primary.join(", ") : "",
                skills_secondary: Array.isArray(data.skills_secondary) ? data.skills_secondary.join(", ") : "",

                linkedin_url: data.linkedin_url || "",
                github_url: data.github_url || "",
                portfolio_url: data.portfolio_url || "",
                twitter_url: data.twitter_url || "",
                leetcode_url: data.leetcode_url || "",
                hackerrank_url: data.hackerrank_url || "",
                kaggle_url: data.kaggle_url || "",
                personal_website: data.personal_website || "",

                summary: data.summary || "",
                headline: data.headline || "",

                resume_url: data.resume_url || ""
            });

            // Load complex data types
            if (Array.isArray(data.work_experience)) {
                setWorkExperience(data.work_experience);
            }
            if (Array.isArray(data.projects)) {
                setProjects(data.projects);
            }
            if (Array.isArray(data.certifications)) {
                setCertifications(data.certifications);
            }
            if (Array.isArray(data.achievements)) {
                setAchievements(data.achievements);
            }
        }
        setLoading(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            // Convert strings to arrays
            const skillsPrimaryArr = formData.skills_primary.split(",").map(s => s.trim()).filter(Boolean);
            const skillsSecondaryArr = formData.skills_secondary.split(",").map(s => s.trim()).filter(Boolean);
            const languagesArr = formData.languages.split(",").map(s => s.trim()).filter(Boolean);

            const updateData = {
                full_name: formData.full_name,
                phone_number: formData.phone_number,
                date_of_birth: formData.date_of_birth,
                gender: formData.gender,
                current_city: formData.current_city,
                country: formData.country,
                address: formData.address,
                nationality: formData.nationality,
                languages: languagesArr,

                current_education: formData.current_education,
                institute_name: formData.institute_name,
                education_major: formData.education_major,
                graduation_year: formData.graduation_year,
                cgpa: formData.cgpa,

                employment_status: formData.employment_status,
                years_experience: formData.years_experience,
                preferred_role: formData.preferred_role,
                preferred_work_type: formData.preferred_work_type,
                current_company: formData.current_company,
                current_designation: formData.current_designation,
                notice_period: formData.notice_period,
                expected_salary: formData.expected_salary,

                skills_primary: skillsPrimaryArr,
                skills_secondary: skillsSecondaryArr,

                linkedin_url: formData.linkedin_url,
                github_url: formData.github_url,
                portfolio_url: formData.portfolio_url,
                twitter_url: formData.twitter_url,
                leetcode_url: formData.leetcode_url,
                hackerrank_url: formData.hackerrank_url,
                kaggle_url: formData.kaggle_url,
                personal_website: formData.personal_website,

                summary: formData.summary,
                headline: formData.headline,

                work_experience: workExperience,
                projects: projects,
                certifications: certifications,
                achievements: achievements,

                resume_url: formData.resume_url,
                updated_at: new Date().toISOString()
            };

            // Using any cast because new columns may not be in generated types yet
            const { error } = await supabase
                .from("profiles")
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .update(updateData as any)
                .eq("id", userId);

            if (error) {
                console.error("Supabase error:", error.message, error.code, error.details);
                
                // If error is about missing columns, try updating only basic fields that existed in original schema
                if (error.message?.includes("column") || error.code === "42703" || error.code === "PGRST204") {
                    console.log("Falling back to basic profile update...");
                    const basicUpdateData = {
                        full_name: formData.full_name,
                        phone_number: formData.phone_number,
                        date_of_birth: formData.date_of_birth,
                        gender: formData.gender,
                        current_city: formData.current_city,
                        country: formData.country,
                        institute_name: formData.institute_name,
                        education_major: formData.education_major,
                        graduation_year: formData.graduation_year,
                        current_education: formData.current_education,
                        employment_status: formData.employment_status,
                        preferred_role: formData.preferred_role,
                        preferred_work_type: formData.preferred_work_type,
                        years_experience: formData.years_experience,
                        linkedin_url: formData.linkedin_url,
                        resume_url: formData.resume_url,
                        updated_at: new Date().toISOString()
                    };
                    
                    const { error: basicError } = await supabase
                        .from("profiles")
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        .update(basicUpdateData as any)
                        .eq("id", userId);
                    
                    if (basicError) {
                        console.error("Basic update also failed:", JSON.stringify(basicError));
                        throw basicError;
                    }
                    
                    toast.success("Basic profile saved. Run migration for full features.");
                    return;
                }
                throw error;
            }
            toast.success("Profile updated successfully!");
        } catch (error: unknown) {
            // Type-safe error handling with full details
            const err = error as { message?: string; code?: string; details?: string; hint?: string };
            console.error("Full error object:", JSON.stringify(error, null, 2));
            console.error("Error updating profile:", err.message || err.code || "Unknown error");
            toast.error(err.message || err.hint || "Failed to update profile. Check console for details.");
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (field: string, value: string | number) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Handle file selection for resume upload
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file type
            const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
            if (!allowedTypes.includes(file.type)) {
                toast.error("Please upload a PDF or image file");
                return;
            }
            // Validate file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                toast.error("File size must be less than 10MB");
                return;
            }
            setSelectedFile(file);
            setAutofillSuccess(false);
        }
    };

    // Handle auto-fill from resume (and optional LinkedIn)
    const handleAutofill = async () => {
        if (!selectedFile && !linkedinInput) {
            toast.error("Please select a resume file or enter LinkedIn URL");
            return;
        }

        setAutofilling(true);
        setAutofillSuccess(false);

        try {
            // Step 1: Parse resume with AI (optionally with LinkedIn)
            const parseFormData = new FormData();
            if (selectedFile) {
                parseFormData.append("file", selectedFile);
            }
            if (linkedinInput) {
                parseFormData.append("linkedinUrl", linkedinInput);
            }

            const response = await fetch("/api/profile/autofill", {
                method: "POST",
                body: parseFormData,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to parse resume");
            }

            const result = await response.json();
            const profile: AutofillResult = result.profile;

            // Step 2: Upload resume to storage
            let resumeUrl = formData.resume_url;
            if (selectedFile) {
                try {
                    const uploadFormData = new FormData();
                    uploadFormData.append("file", selectedFile);
                    
                    const uploadResponse = await fetch("/api/resume/upload", {
                        method: "POST",
                        body: uploadFormData,
                    });

                    if (uploadResponse.ok) {
                        const uploadResult = await uploadResponse.json();
                        if (uploadResult.url) {
                            resumeUrl = uploadResult.url;
                        }
                    }
                } catch (uploadError) {
                    console.error("Resume upload failed:", uploadError);
                }
            }

            // Update form with extracted data (only non-empty values)
            setFormData(prev => ({
                ...prev,
                full_name: profile.full_name || prev.full_name,
                phone_number: profile.phone_number || prev.phone_number,
                date_of_birth: profile.date_of_birth || prev.date_of_birth,
                gender: profile.gender || prev.gender,
                current_city: profile.current_city || prev.current_city,
                country: profile.country || prev.country,
                address: profile.address || prev.address,
                nationality: profile.nationality || prev.nationality,
                languages: profile.languages?.length > 0 ? profile.languages.join(", ") : prev.languages,
                current_education: profile.current_education || prev.current_education,
                institute_name: profile.institute_name || prev.institute_name,
                education_major: profile.education_major || prev.education_major,
                graduation_year: profile.graduation_year || prev.graduation_year,
                cgpa: profile.cgpa || prev.cgpa,
                employment_status: profile.employment_status || prev.employment_status,
                years_experience: profile.years_experience || prev.years_experience,
                preferred_role: profile.preferred_role || prev.preferred_role,
                preferred_work_type: profile.preferred_work_type || prev.preferred_work_type,
                current_company: profile.current_company || prev.current_company,
                current_designation: profile.current_designation || prev.current_designation,
                notice_period: profile.notice_period || prev.notice_period,
                expected_salary: profile.expected_salary || prev.expected_salary,
                skills_primary: profile.skills_primary?.length > 0 
                    ? profile.skills_primary.join(", ") 
                    : prev.skills_primary,
                skills_secondary: profile.skills_secondary?.length > 0 
                    ? profile.skills_secondary.join(", ") 
                    : prev.skills_secondary,
                linkedin_url: profile.linkedin_url || prev.linkedin_url,
                github_url: profile.github_url || prev.github_url,
                portfolio_url: profile.portfolio_url || prev.portfolio_url,
                twitter_url: profile.twitter_url || prev.twitter_url,
                leetcode_url: profile.leetcode_url || prev.leetcode_url,
                hackerrank_url: profile.hackerrank_url || prev.hackerrank_url,
                kaggle_url: profile.kaggle_url || prev.kaggle_url,
                personal_website: profile.personal_website || prev.personal_website,
                summary: profile.summary || prev.summary,
                headline: profile.headline || prev.headline,
                resume_url: resumeUrl,
            }));

            // Update complex data types
            if (profile.work_experience?.length > 0) {
                setWorkExperience(profile.work_experience);
            }
            if (profile.projects?.length > 0) {
                setProjects(profile.projects);
            }
            if (profile.certifications?.length > 0) {
                setCertifications(profile.certifications);
            }
            if (profile.achievements?.length > 0) {
                setAchievements(profile.achievements);
            }

            setAutofillSuccess(true);
            toast.success(`Profile auto-filled from ${result.source || "resume"}`);

        } catch (error) {
            console.error("Autofill error:", error);
            toast.error(error instanceof Error ? error.message : "Failed to parse resume");
        } finally {
            setAutofilling(false);
        }
    };

    // Helper functions for managing work experience
    const addWorkExperience = () => {
        setWorkExperience([...workExperience, {
            company: "",
            role: "",
            start_date: "",
            end_date: null,
            description: "",
            location: "",
            is_current: false
        }]);
    };

    const updateWorkExperience = (index: number, field: keyof WorkExperience, value: string | boolean | null) => {
        const updated = [...workExperience];
        updated[index] = { ...updated[index], [field]: value };
        setWorkExperience(updated);
    };

    const removeWorkExperience = (index: number) => {
        setWorkExperience(workExperience.filter((_, i) => i !== index));
    };

    // Helper functions for managing projects
    const addProject = () => {
        setProjects([...projects, {
            title: "",
            description: "",
            technologies: [],
            url: null,
            github_url: null
        }]);
    };

    const updateProject = (index: number, field: keyof Project, value: string | string[] | null) => {
        const updated = [...projects];
        updated[index] = { ...updated[index], [field]: value };
        setProjects(updated);
    };

    const removeProject = (index: number) => {
        setProjects(projects.filter((_, i) => i !== index));
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#2E2E2E]" />
            </div>
        );
    }

    return (
        <div className="container max-w-4xl mx-auto py-8 px-4 font-sans">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
            >
                <div className="flex items-center justify-between pb-6 border-b">
                    <div>
                        <h1 className="text-3xl font-bold text-[#2E2E2E] dark:text-white">My Profile</h1>
                        <p className="text-muted-foreground mt-1">Keep your profile updated to get the best job matches.</p>
                    </div>
                </div>

                <form onSubmit={handleSave} className="space-y-8">

                    {/* RESUME AUTO-FILL SECTION */}
                    <Card className="p-6 space-y-6 border-[#e0e0e0] dark:border-[#4a4a4a] bg-gradient-to-r from-[#2E2E2E]/5 to-transparent dark:from-white/5">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold flex items-center gap-2 text-foreground">
                                <Sparkles className="h-5 w-5 text-[#2E2E2E] dark:text-white" /> Quick Auto-Fill from Resume
                            </h2>
                            <AnimatePresence>
                                {autofillSuccess && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        className="flex items-center gap-2 text-green-600 dark:text-green-400"
                                    >
                                        <CheckCircle className="h-5 w-5" />
                                        <span className="text-sm font-medium">Fields populated</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        
                        <p className="text-sm text-muted-foreground">
                            Upload your resume to automatically extract and fill your profile information using AI. 
                            Optionally, add your LinkedIn URL for enhanced data extraction.
                        </p>

                        {/* LinkedIn URL Input */}
                        <div className="flex gap-2 items-end">
                            <div className="flex-1 space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Linkedin className="h-4 w-4" /> LinkedIn Profile URL (Optional)
                                </Label>
                                <Input
                                    placeholder="https://linkedin.com/in/your-profile"
                                    value={linkedinInput}
                                    onChange={(e) => setLinkedinInput(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4">
                            {/* File Upload Area */}
                            <div 
                                className={`flex-1 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
                                    ${selectedFile 
                                        ? 'border-[#2E2E2E] bg-[#2E2E2E]/5 dark:border-white dark:bg-white/5' 
                                        : 'border-muted-foreground/30 hover:border-[#2E2E2E]/50 dark:hover:border-white/50'
                                    }`}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf,.png,.jpg,.jpeg"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />
                                {selectedFile ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <FileText className="h-8 w-8 text-[#2E2E2E] dark:text-white" />
                                        <span className="font-medium text-[#2E2E2E] dark:text-white">{selectedFile.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB - Click to change
                                        </span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2">
                                        <Upload className="h-8 w-8 text-muted-foreground" />
                                        <span className="text-muted-foreground">Click to upload resume</span>
                                        <span className="text-xs text-muted-foreground">PDF, PNG, or JPG (max 10MB)</span>
                                    </div>
                                )}
                            </div>

                            {/* Auto-fill Button */}
                            <div className="flex flex-col gap-2 sm:w-48">
                                <Button
                                    type="button"
                                    onClick={handleAutofill}
                                    disabled={(!selectedFile && !linkedinInput) || autofilling}
                                    className="h-full min-h-[100px] bg-[#2E2E2E] hover:bg-[#404040] text-white flex flex-col gap-2"
                                >
                                    {autofilling ? (
                                        <>
                                            <Loader2 className="h-6 w-6 animate-spin" />
                                            <span>Parsing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="h-6 w-6" />
                                            <span>Auto-Fill Profile</span>
                                        </>
                                    )}
                                </Button>
                                {autofilling && (
                                    <p className="text-xs text-center text-muted-foreground">
                                        Using OCR + AI to extract data...
                                    </p>
                                )}
                            </div>
                        </div>

                        {autofillSuccess && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-start gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800"
                            >
                                <AlertCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                                <div className="text-sm">
                                    <p className="font-medium text-green-800 dark:text-green-300">Profile fields populated successfully</p>
                                    <p className="text-green-700 dark:text-green-400 mt-1">
                                        Please review the extracted information below and make any corrections before saving.
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </Card>

                    {/* PERSONAL INFO */}
                    <Card className="p-6 space-y-6 border-[#e0e0e0] dark:border-[#4a4a4a]">
                        <h2 className="text-xl font-semibold flex items-center gap-2 text-foreground">
                            <User className="h-5 w-5 text-[#2E2E2E] dark:text-white" /> Personal Information
                        </h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Full Name</Label>
                                <Input value={formData.full_name} onChange={e => handleChange("full_name", e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input value={formData.email} disabled className="bg-muted text-muted-foreground" />
                            </div>
                            <div className="space-y-2">
                                <Label>Phone Number</Label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input className="pl-9" value={formData.phone_number} onChange={e => handleChange("phone_number", e.target.value)} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Date of Birth</Label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input className="pl-9" type="date" value={formData.date_of_birth} onChange={e => handleChange("date_of_birth", e.target.value)} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Current City</Label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input className="pl-9" value={formData.current_city} onChange={e => handleChange("current_city", e.target.value)} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Country</Label>
                                <Input value={formData.country} onChange={e => handleChange("country", e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Gender</Label>
                                <Select value={formData.gender} onValueChange={v => handleChange("gender", v)}>
                                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Male">Male</SelectItem>
                                        <SelectItem value="Female">Female</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
                                        <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </Card>

                    {/* EDUCATION */}
                    <Card className="p-6 space-y-6 border-[#e0e0e0] dark:border-[#4a4a4a]">
                        <h2 className="text-xl font-semibold flex items-center gap-2 text-foreground">
                            <GraduationCap className="h-5 w-5 text-[#2E2E2E] dark:text-white" /> Education
                        </h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Highest Degree</Label>
                                <Select value={formData.current_education} onValueChange={v => handleChange("current_education", v)}>
                                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="High School">High School</SelectItem>
                                        <SelectItem value="Bachelor's">Bachelor's Degree</SelectItem>
                                        <SelectItem value="Master's">Master's Degree</SelectItem>
                                        <SelectItem value="PhD">PhD</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Graduation Year</Label>
                                <Input type="number" value={formData.graduation_year} onChange={e => handleChange("graduation_year", e.target.value)} />
                            </div>
                            <div className="col-span-2 space-y-2">
                                <Label>Institute / University</Label>
                                <Input value={formData.institute_name} onChange={e => handleChange("institute_name", e.target.value)} />
                            </div>
                            <div className="col-span-2 space-y-2">
                                <Label>Major / Specialization</Label>
                                <Input value={formData.education_major} onChange={e => handleChange("education_major", e.target.value)} />
                            </div>
                        </div>
                    </Card>

                    {/* PROFESSIONAL */}
                    <Card className="p-6 space-y-6 border-[#e0e0e0] dark:border-[#4a4a4a]">
                        <h2 className="text-xl font-semibold flex items-center gap-2 text-foreground">
                            <Briefcase className="h-5 w-5 text-[#2E2E2E] dark:text-white" /> Professional
                        </h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Employment Status</Label>
                                <Select value={formData.employment_status} onValueChange={v => handleChange("employment_status", v)}>
                                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Student">Student</SelectItem>
                                        <SelectItem value="Employed">Employed</SelectItem>
                                        <SelectItem value="Unemployed">Unemployed</SelectItem>
                                        <SelectItem value="Freelancer">Freelancer</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Years of Experience</Label>
                                <Input type="number" step="0.1" value={formData.years_experience} onChange={e => handleChange("years_experience", parseFloat(e.target.value))} />
                            </div>
                            <div className="space-y-2">
                                <Label>Preferred Role</Label>
                                <Input value={formData.preferred_role} onChange={e => handleChange("preferred_role", e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Preferred Work Type</Label>
                                <Select value={formData.preferred_work_type} onValueChange={v => handleChange("preferred_work_type", v)}>
                                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Full-time">Full-time</SelectItem>
                                        <SelectItem value="Internship">Internship</SelectItem>
                                        <SelectItem value="Contract">Contract</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </Card>

                    {/* SKILLS */}
                    <Card className="p-6 space-y-6 border-[#e0e0e0] dark:border-[#4a4a4a]">
                        <h2 className="text-xl font-semibold flex items-center gap-2 text-foreground">
                            <Wrench className="h-5 w-5 text-[#2E2E2E] dark:text-white" /> Skills & Resume
                        </h2>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Primary Skills (Comma separated)</Label>
                                <Input value={formData.skills_primary} onChange={e => handleChange("skills_primary", e.target.value)} placeholder="React, Node.js, Python" />
                            </div>
                            <div className="space-y-2">
                                <Label>Secondary Skills (Comma separated)</Label>
                                <Input value={formData.skills_secondary} onChange={e => handleChange("skills_secondary", e.target.value)} placeholder="Git, Docker, AWS" />
                            </div>
                            <div className="space-y-2 pt-2">
                                <Label>Resume</Label>
                                <div className="flex gap-2 items-center">
                                    {formData.resume_url ? (
                                        <>
                                            <div className="flex-1 flex items-center gap-2 p-3 bg-muted rounded-lg">
                                                <FileText className="h-5 w-5 text-muted-foreground" />
                                                <a 
                                                    href={formData.resume_url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="text-sm text-[#2E2E2E] dark:text-white hover:underline truncate"
                                                >
                                                    View Current Resume
                                                </a>
                                            </div>
                                            <Button 
                                                type="button" 
                                                variant="outline" 
                                                onClick={() => {
                                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                                    fileInputRef.current?.click();
                                                }}
                                            >
                                                Update Resume
                                            </Button>
                                        </>
                                    ) : (
                                        <div className="flex-1 flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-dashed">
                                            <FileText className="h-5 w-5 text-muted-foreground" />
                                            <span className="text-sm text-muted-foreground">
                                                No resume uploaded yet. Use the auto-fill section above to upload.
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* SOCIAL LINKS */}
                    <Card className="p-6 space-y-6 border-[#e0e0e0] dark:border-[#4a4a4a]">
                        <h2 className="text-xl font-semibold flex items-center gap-2 text-foreground">
                            <Link className="h-5 w-5 text-[#2E2E2E] dark:text-white" /> Social Links & Portfolio
                        </h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Linkedin className="h-4 w-4" /> LinkedIn
                                </Label>
                                <Input 
                                    value={formData.linkedin_url} 
                                    onChange={e => handleChange("linkedin_url", e.target.value)} 
                                    placeholder="https://linkedin.com/in/..."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Github className="h-4 w-4" /> GitHub
                                </Label>
                                <Input 
                                    value={formData.github_url} 
                                    onChange={e => handleChange("github_url", e.target.value)} 
                                    placeholder="https://github.com/..."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Globe className="h-4 w-4" /> Portfolio
                                </Label>
                                <Input 
                                    value={formData.portfolio_url} 
                                    onChange={e => handleChange("portfolio_url", e.target.value)} 
                                    placeholder="https://yourportfolio.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Globe className="h-4 w-4" /> Personal Website
                                </Label>
                                <Input 
                                    value={formData.personal_website} 
                                    onChange={e => handleChange("personal_website", e.target.value)} 
                                    placeholder="https://yourwebsite.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Code className="h-4 w-4" /> LeetCode
                                </Label>
                                <Input 
                                    value={formData.leetcode_url} 
                                    onChange={e => handleChange("leetcode_url", e.target.value)} 
                                    placeholder="https://leetcode.com/..."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Code className="h-4 w-4" /> HackerRank
                                </Label>
                                <Input 
                                    value={formData.hackerrank_url} 
                                    onChange={e => handleChange("hackerrank_url", e.target.value)} 
                                    placeholder="https://hackerrank.com/..."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Code className="h-4 w-4" /> Kaggle
                                </Label>
                                <Input 
                                    value={formData.kaggle_url} 
                                    onChange={e => handleChange("kaggle_url", e.target.value)} 
                                    placeholder="https://kaggle.com/..."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Twitter / X</Label>
                                <Input 
                                    value={formData.twitter_url} 
                                    onChange={e => handleChange("twitter_url", e.target.value)} 
                                    placeholder="https://twitter.com/..."
                                />
                            </div>
                        </div>
                    </Card>

                    {/* WORK EXPERIENCE */}
                    <Card className="p-6 space-y-6 border-[#e0e0e0] dark:border-[#4a4a4a]">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold flex items-center gap-2 text-foreground">
                                <Briefcase className="h-5 w-5 text-[#2E2E2E] dark:text-white" /> Work Experience
                            </h2>
                            <Button type="button" variant="outline" size="sm" onClick={addWorkExperience}>
                                <Plus className="h-4 w-4 mr-1" /> Add
                            </Button>
                        </div>
                        
                        {workExperience.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                No work experience added. Click "Add" to add your experience.
                            </p>
                        ) : (
                            <div className="space-y-6">
                                {workExperience.map((exp, i) => (
                                    <div key={i} className="p-4 border rounded-lg space-y-4 relative">
                                        <Button 
                                            type="button" 
                                            variant="ghost" 
                                            size="sm" 
                                            className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                                            onClick={() => removeWorkExperience(i)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Company</Label>
                                                <Input 
                                                    value={exp.company} 
                                                    onChange={e => updateWorkExperience(i, "company", e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Role / Title</Label>
                                                <Input 
                                                    value={exp.role} 
                                                    onChange={e => updateWorkExperience(i, "role", e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Start Date</Label>
                                                <Input 
                                                    type="month"
                                                    value={exp.start_date} 
                                                    onChange={e => updateWorkExperience(i, "start_date", e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>End Date</Label>
                                                <Input 
                                                    type="month"
                                                    value={exp.end_date || ""} 
                                                    onChange={e => updateWorkExperience(i, "end_date", e.target.value || null)}
                                                    disabled={exp.is_current}
                                                    placeholder={exp.is_current ? "Present" : ""}
                                                />
                                            </div>
                                            <div className="col-span-2 flex items-center gap-2">
                                                <input 
                                                    type="checkbox" 
                                                    id={`current-${i}`}
                                                    checked={exp.is_current}
                                                    onChange={e => updateWorkExperience(i, "is_current", e.target.checked)}
                                                    className="rounded"
                                                />
                                                <Label htmlFor={`current-${i}`}>Currently working here</Label>
                                            </div>
                                            <div className="col-span-2 space-y-2">
                                                <Label>Description</Label>
                                                <Textarea 
                                                    value={exp.description} 
                                                    onChange={e => updateWorkExperience(i, "description", e.target.value)}
                                                    placeholder="Describe your responsibilities and achievements..."
                                                    rows={3}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>

                    {/* PROJECTS */}
                    <Card className="p-6 space-y-6 border-[#e0e0e0] dark:border-[#4a4a4a]">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold flex items-center gap-2 text-foreground">
                                <Code className="h-5 w-5 text-[#2E2E2E] dark:text-white" /> Projects
                            </h2>
                            <Button type="button" variant="outline" size="sm" onClick={addProject}>
                                <Plus className="h-4 w-4 mr-1" /> Add
                            </Button>
                        </div>
                        
                        {projects.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                No projects added. Click "Add" to showcase your work.
                            </p>
                        ) : (
                            <div className="space-y-6">
                                {projects.map((proj, i) => (
                                    <div key={i} className="p-4 border rounded-lg space-y-4 relative">
                                        <Button 
                                            type="button" 
                                            variant="ghost" 
                                            size="sm" 
                                            className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                                            onClick={() => removeProject(i)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div className="col-span-2 space-y-2">
                                                <Label>Project Title</Label>
                                                <Input 
                                                    value={proj.title} 
                                                    onChange={e => updateProject(i, "title", e.target.value)}
                                                />
                                            </div>
                                            <div className="col-span-2 space-y-2">
                                                <Label>Description</Label>
                                                <Textarea 
                                                    value={proj.description} 
                                                    onChange={e => updateProject(i, "description", e.target.value)}
                                                    placeholder="Describe what you built and the impact..."
                                                    rows={2}
                                                />
                                            </div>
                                            <div className="col-span-2 space-y-2">
                                                <Label>Technologies (comma separated)</Label>
                                                <Input 
                                                    value={proj.technologies.join(", ")} 
                                                    onChange={e => updateProject(i, "technologies", e.target.value.split(",").map(t => t.trim()))}
                                                    placeholder="React, Node.js, PostgreSQL"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Live URL</Label>
                                                <Input 
                                                    value={proj.url || ""} 
                                                    onChange={e => updateProject(i, "url", e.target.value || null)}
                                                    placeholder="https://..."
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>GitHub URL</Label>
                                                <Input 
                                                    value={proj.github_url || ""} 
                                                    onChange={e => updateProject(i, "github_url", e.target.value || null)}
                                                    placeholder="https://github.com/..."
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>

                    {/* SUMMARY & HEADLINE */}
                    <Card className="p-6 space-y-6 border-[#e0e0e0] dark:border-[#4a4a4a]">
                        <h2 className="text-xl font-semibold flex items-center gap-2 text-foreground">
                            <Trophy className="h-5 w-5 text-[#2E2E2E] dark:text-white" /> Professional Summary
                        </h2>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Headline (One-liner that describes you)</Label>
                                <Input 
                                    value={formData.headline} 
                                    onChange={e => handleChange("headline", e.target.value)}
                                    placeholder="Full Stack Developer | AI Enthusiast | Open Source Contributor"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Summary</Label>
                                <Textarea 
                                    value={formData.summary} 
                                    onChange={e => handleChange("summary", e.target.value)}
                                    placeholder="Write a brief professional summary highlighting your expertise, achievements, and career goals..."
                                    rows={4}
                                />
                            </div>
                        </div>
                    </Card>

                    {/* SOCIAL & PORTFOLIO LINKS */}
                    <Card className="p-6 space-y-6 border-[#e0e0e0] dark:border-[#4a4a4a]">
                        <h2 className="text-xl font-semibold flex items-center gap-2 text-foreground">
                            <Link className="h-5 w-5 text-[#2E2E2E] dark:text-white" /> Social & Portfolio Links
                        </h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Linkedin className="h-4 w-4" /> LinkedIn
                                </Label>
                                <Input value={formData.linkedin_url} onChange={e => handleChange("linkedin_url", e.target.value)} placeholder="https://linkedin.com/in/..." />
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Github className="h-4 w-4" /> GitHub
                                </Label>
                                <Input value={formData.github_url} onChange={e => handleChange("github_url", e.target.value)} placeholder="https://github.com/..." />
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Globe className="h-4 w-4" /> Portfolio Website
                                </Label>
                                <Input value={formData.portfolio_url} onChange={e => handleChange("portfolio_url", e.target.value)} placeholder="https://..." />
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Code className="h-4 w-4" /> LeetCode
                                </Label>
                                <Input value={formData.leetcode_url} onChange={e => handleChange("leetcode_url", e.target.value)} placeholder="https://leetcode.com/..." />
                            </div>
                            <div className="space-y-2">
                                <Label>HackerRank</Label>
                                <Input value={formData.hackerrank_url} onChange={e => handleChange("hackerrank_url", e.target.value)} placeholder="https://hackerrank.com/..." />
                            </div>
                            <div className="space-y-2">
                                <Label>Kaggle</Label>
                                <Input value={formData.kaggle_url} onChange={e => handleChange("kaggle_url", e.target.value)} placeholder="https://kaggle.com/..." />
                            </div>
                            <div className="space-y-2">
                                <Label>Twitter / X</Label>
                                <Input value={formData.twitter_url} onChange={e => handleChange("twitter_url", e.target.value)} placeholder="https://twitter.com/..." />
                            </div>
                            <div className="space-y-2">
                                <Label>Personal Website</Label>
                                <Input value={formData.personal_website} onChange={e => handleChange("personal_website", e.target.value)} placeholder="https://..." />
                            </div>
                        </div>
                    </Card>

                    {/* WORK EXPERIENCE */}
                    <Card className="p-6 space-y-6 border-[#e0e0e0] dark:border-[#4a4a4a]">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold flex items-center gap-2 text-foreground">
                                <Briefcase className="h-5 w-5 text-[#2E2E2E] dark:text-white" /> Work Experience
                            </h2>
                            <Button type="button" variant="outline" size="sm" onClick={addWorkExperience}>
                                <Plus className="h-4 w-4 mr-1" /> Add Experience
                            </Button>
                        </div>
                        
                        {workExperience.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                No work experience added yet. Click "Add Experience" to add your work history.
                            </p>
                        ) : (
                            <div className="space-y-6">
                                {workExperience.map((exp, index) => (
                                    <div key={index} className="p-4 border rounded-lg space-y-4 relative">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                                            onClick={() => removeWorkExperience(index)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Company</Label>
                                                <Input value={exp.company} onChange={e => updateWorkExperience(index, "company", e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Role / Title</Label>
                                                <Input value={exp.role} onChange={e => updateWorkExperience(index, "role", e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Start Date</Label>
                                                <Input type="month" value={exp.start_date} onChange={e => updateWorkExperience(index, "start_date", e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>End Date</Label>
                                                <Input 
                                                    type="month" 
                                                    value={exp.end_date || ""} 
                                                    onChange={e => updateWorkExperience(index, "end_date", e.target.value || null)}
                                                    disabled={exp.is_current}
                                                />
                                                <label className="flex items-center gap-2 text-sm">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={exp.is_current} 
                                                        onChange={e => updateWorkExperience(index, "is_current", e.target.checked)}
                                                    />
                                                    Currently working here
                                                </label>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Location</Label>
                                                <Input value={exp.location} onChange={e => updateWorkExperience(index, "location", e.target.value)} placeholder="City, Country" />
                                            </div>
                                            <div className="col-span-2 space-y-2">
                                                <Label>Description</Label>
                                                <Textarea 
                                                    value={exp.description} 
                                                    onChange={e => updateWorkExperience(index, "description", e.target.value)}
                                                    placeholder="Brief description of your role and responsibilities"
                                                    rows={3}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>

                    {/* PROJECTS */}
                    <Card className="p-6 space-y-6 border-[#e0e0e0] dark:border-[#4a4a4a]">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold flex items-center gap-2 text-foreground">
                                <Code className="h-5 w-5 text-[#2E2E2E] dark:text-white" /> Projects
                            </h2>
                            <Button type="button" variant="outline" size="sm" onClick={addProject}>
                                <Plus className="h-4 w-4 mr-1" /> Add Project
                            </Button>
                        </div>
                        
                        {projects.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                No projects added yet. Click "Add Project" to showcase your work.
                            </p>
                        ) : (
                            <div className="space-y-6">
                                {projects.map((proj, index) => (
                                    <div key={index} className="p-4 border rounded-lg space-y-4 relative">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                                            onClick={() => removeProject(index)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Project Title</Label>
                                                <Input value={proj.title} onChange={e => updateProject(index, "title", e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Technologies (comma separated)</Label>
                                                <Input 
                                                    value={proj.technologies.join(", ")} 
                                                    onChange={e => updateProject(index, "technologies", e.target.value.split(",").map(t => t.trim()))}
                                                    placeholder="React, Node.js, PostgreSQL"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Live URL</Label>
                                                <Input value={proj.url || ""} onChange={e => updateProject(index, "url", e.target.value || null)} placeholder="https://..." />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>GitHub URL</Label>
                                                <Input value={proj.github_url || ""} onChange={e => updateProject(index, "github_url", e.target.value || null)} placeholder="https://github.com/..." />
                                            </div>
                                            <div className="col-span-2 space-y-2">
                                                <Label>Description</Label>
                                                <Textarea 
                                                    value={proj.description} 
                                                    onChange={e => updateProject(index, "description", e.target.value)}
                                                    placeholder="Brief description of the project"
                                                    rows={3}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>

                    {/* ACHIEVEMENTS */}
                    <Card className="p-6 space-y-6 border-[#e0e0e0] dark:border-[#4a4a4a]">
                        <h2 className="text-xl font-semibold flex items-center gap-2 text-foreground">
                            <Trophy className="h-5 w-5 text-[#2E2E2E] dark:text-white" /> Achievements & Summary
                        </h2>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Professional Headline</Label>
                                <Input 
                                    value={formData.headline} 
                                    onChange={e => handleChange("headline", e.target.value)} 
                                    placeholder="Full Stack Developer | 3+ Years Experience"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Professional Summary</Label>
                                <Textarea 
                                    value={formData.summary} 
                                    onChange={e => handleChange("summary", e.target.value)}
                                    placeholder="Brief summary of your professional background and career goals..."
                                    rows={4}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Achievements (one per line)</Label>
                                <Textarea 
                                    value={achievements.join("\n")} 
                                    onChange={e => setAchievements(e.target.value.split("\n").filter(a => a.trim()))}
                                    placeholder="Won 1st place at XYZ Hackathon 2024&#10;Published paper in IEEE Conference&#10;Dean's List 2023"
                                    rows={4}
                                />
                            </div>
                        </div>
                    </Card>

                    <div className="flex justify-end pt-4 pb-20">
                        <Button type="submit" size="lg" disabled={saving} className="min-w-[150px] bg-[#2E2E2E] hover:bg-[#404040] text-white">
                            {saving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" /> Save Changes
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
