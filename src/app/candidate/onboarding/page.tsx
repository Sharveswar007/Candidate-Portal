"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { User, BookOpen, Wrench, FileText, CheckCircle2, Loader2, ArrowRight, ArrowLeft, Upload, Sparkles, AlertCircle } from "lucide-react";

const STEPS = [
    { id: 0, label: "Upload Resume", icon: Upload },
    { id: 1, label: "Personal Info", icon: User },
    { id: 2, label: "Education & Exp", icon: BookOpen },
    { id: 3, label: "Skills & Preferences", icon: Wrench },
    { id: 4, label: "Consent", icon: CheckCircle2 },
];

interface AutofillResult {
    full_name?: string;
    email?: string;
    phone_number?: string;
    date_of_birth?: string;
    gender?: string;
    current_city?: string;
    country?: string;
    address?: string;
    nationality?: string;
    languages?: string;
    current_education?: string;
    institute_name?: string;
    education_major?: string;
    graduation_year?: string;
    cgpa?: string;
    employment_status?: string;
    years_experience?: number;
    preferred_role?: string;
    preferred_work_type?: string;
    current_company?: string;
    current_designation?: string;
    skills_primary?: string[];
    skills_secondary?: string[];
    linkedin_url?: string;
    github_url?: string;
    portfolio_url?: string;
    summary?: string;
    headline?: string;
    work_experience?: Array<{
        company: string;
        role: string;
        start_date: string;
        end_date: string;
        description: string;
    }>;
    projects?: Array<{
        title: string;
        description: string;
        technologies: string[];
    }>;
}

export default function CandidateOnboarding() {
    const router = useRouter();
    const supabase = createClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [step, setStep] = useState(0); // Start at step 0 (Resume Upload)
    const [loading, setLoading] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [autofilling, setAutofilling] = useState(false);
    const [autofillComplete, setAutofillComplete] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        // Step 1: Personal
        full_name: "",
        date_of_birth: "",
        gender: "",
        current_city: "",
        country: "",
        phone_number: "",
        linkedin_url: "",
        github_url: "",

        // Step 2: Education
        highest_education: "",
        institute_name: "",
        education_major: "",
        graduation_year: "",
        employment_status: "",
        years_of_experience: "0",
        current_company: "",
        current_designation: "",

        // Step 3: Skills
        preferred_role: "",
        preferred_work_type: "",
        skills_primary: "", // stored as comma-sep string for input
        skills_secondary: "",
        resume_url: "",

        // Step 4: Consent
        consent_webcam: false,
        consent_data: false
    });

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
                // Pre-fill email/name if available
                setFormData(prev => ({ ...prev, full_name: user.user_metadata?.full_name || "" }));
            }
        };
        checkUser();
    }, []);

    // Handle resume file selection and auto-fill
    const handleResumeUpload = async (file: File) => {
        setResumeFile(file);
        setAutofilling(true);

        try {
            const formDataApi = new FormData();
            formDataApi.append("file", file);

            const response = await fetch("/api/profile/autofill", {
                method: "POST",
                body: formDataApi,
            });

            const apiResponse = await response.json();

            // Handle error responses but don't block the user
            if (!response.ok) {
                console.warn("Resume parse warning:", apiResponse.error || "Could not auto-fill");
                toast.warning("Could not auto-fill from resume. Please fill in details manually.");
                setAutofillComplete(true);
                setAutofilling(false);
                setStep(1); // Move to next step anyway
                return;
            }

            const result: AutofillResult = apiResponse.profile || apiResponse;

            // Populate form with extracted data
            setFormData(prev => ({
                ...prev,
                full_name: result.full_name || prev.full_name,
                phone_number: result.phone_number || prev.phone_number,
                date_of_birth: result.date_of_birth || prev.date_of_birth,
                gender: result.gender || prev.gender,
                current_city: result.current_city || prev.current_city,
                country: result.country || prev.country,
                linkedin_url: result.linkedin_url || prev.linkedin_url,
                github_url: result.github_url || prev.github_url,

                highest_education: result.current_education || prev.highest_education,
                institute_name: result.institute_name || prev.institute_name,
                education_major: result.education_major || prev.education_major,
                graduation_year: result.graduation_year || prev.graduation_year,
                employment_status: result.employment_status || prev.employment_status,
                years_of_experience: result.years_experience?.toString() || prev.years_of_experience,
                current_company: result.current_company || prev.current_company,
                current_designation: result.current_designation || prev.current_designation,

                preferred_role: result.preferred_role || result.current_designation || prev.preferred_role,
                preferred_work_type: result.preferred_work_type || prev.preferred_work_type,
                skills_primary: Array.isArray(result.skills_primary) ? result.skills_primary.join(", ") : prev.skills_primary,
                skills_secondary: Array.isArray(result.skills_secondary) ? result.skills_secondary.join(", ") : prev.skills_secondary,
                resume_url: file.name,
            }));

            setAutofillComplete(true);
            toast.success("Resume parsed successfully! Review and complete your profile.");

        } catch (error) {
            console.error("Autofill error:", error);
            toast.error("Could not parse resume. Please fill in details manually.");
        } finally {
            setAutofilling(false);
        }
    };

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const validateStep = () => {
        if (step === 0) {
            // Resume upload is optional but encouraged
            return true;
        }
        if (step === 1) {
            return formData.full_name && formData.date_of_birth && formData.current_city && formData.country && formData.phone_number;
        }
        if (step === 2) {
            return formData.highest_education && formData.institute_name && formData.education_major && formData.graduation_year && formData.employment_status;
        }
        if (step === 3) {
            return formData.preferred_role && formData.preferred_work_type && formData.skills_primary.length > 0;
        }
        if (step === 4) {
            return formData.consent_webcam && formData.consent_data;
        }
        return true;
    };

    const handleNext = () => {
        if (!validateStep()) {
            toast.error("Please fill all required fields");
            return;
        }
        setStep(prev => Math.min(prev + 1, 4));
    };

    const handleBack = () => {
        setStep(prev => Math.max(prev - 1, 0));
    };

    const handleSubmit = async () => {
        if (!userId) return;
        setLoading(true);

        try {
            // Process skills strings into arrays
            const skillsPrimary = formData.skills_primary.split(",").map(s => s.trim()).filter(Boolean);
            const skillsSecondary = formData.skills_secondary.split(",").map(s => s.trim()).filter(Boolean);

            // Use upsert to handle case where profile row doesn't exist
            const { error } = await supabase
                .from("profiles")
                .upsert({
                    id: userId,
                    role: "candidate",
                    full_name: formData.full_name,
                    date_of_birth: formData.date_of_birth,
                    gender: formData.gender,
                    current_city: formData.current_city,
                    country: formData.country,
                    phone_number: formData.phone_number,
                    linkedin_url: formData.linkedin_url,
                    github_url: formData.github_url,

                    // existing `current_education` field can be used for "Highest Degree".
                    current_education: formData.highest_education,
                    institute_name: formData.institute_name,
                    education_major: formData.education_major,
                    graduation_year: formData.graduation_year,
                    employment_status: formData.employment_status,
                    years_experience: parseFloat(formData.years_of_experience),
                    current_company: formData.current_company,
                    current_designation: formData.current_designation,

                    preferred_role: formData.preferred_role,
                    preferred_work_type: formData.preferred_work_type,
                    skills_primary: skillsPrimary,
                    skills_secondary: skillsSecondary,

                    consents: {
                        webcam: formData.consent_webcam,
                        data_processing: formData.consent_data,
                        timestamp: new Date().toISOString()
                    },

                    onboarding_complete: true,
                    updated_at: new Date().toISOString()
                }, { onConflict: "id" });

            if (error) throw error;

            toast.success("Profile Setup Complete! Redirecting...");
            
            // Force a hard navigation to ensure redirect works
            setTimeout(() => {
                window.location.href = "/candidate/dashboard";
            }, 1500);

        } catch (error) {
            console.error("Onboarding Error:", error);
            toast.error("Failed to save profile. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center py-10 px-4">
            <div className="w-full max-w-3xl space-y-8">
                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold text-foreground">Complete Your Profile</h1>
                    <p className="text-muted-foreground">We need a few details to match you with the best jobs.</p>
                </div>

                {/* Progress */}
                <div className="relative">
                    <Progress value={(step / 4) * 100} className="h-2 bg-muted" />
                    <div className="absolute top-0 left-0 w-full flex justify-between -mt-2.5 px-1">
                        {STEPS.map((s) => (
                            <div key={s.id} className={`flex flex-col items-center ${step >= s.id ? "text-[#2E2E2E] dark:text-white" : "text-muted-foreground"}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 bg-background ${step >= s.id ? "border-[#2E2E2E] dark:border-white bg-[#f5f5f5] dark:bg-[#404040]" : "border-muted-foreground/30"}`}>
                                    <s.icon className="w-4 h-4" />
                                </div>
                                <span className="text-xs font-medium mt-1 hidden sm:block">{s.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Form Card */}
                <Card className="p-8 border-border shadow-xl bg-card">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="space-y-6"
                        >
                            {/* STEP 0: RESUME UPLOAD */}
                            {step === 0 && (
                                <div className="space-y-6">
                                    <div className="text-center space-y-2">
                                        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#2E2E2E] to-[#4a4a4a] text-white px-4 py-2 rounded-full text-sm font-medium">
                                            <Sparkles className="w-4 h-4" />
                                            AI-Powered Auto-Fill
                                        </div>
                                        <h2 className="text-xl font-semibold">Upload Your Resume</h2>
                                        <p className="text-muted-foreground text-sm max-w-md mx-auto">
                                            Upload your resume and we will automatically extract your details using AI. You can review and edit everything before submitting.
                                        </p>
                                    </div>

                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                handleResumeUpload(file);
                                            }
                                        }}
                                    />

                                    <div
                                        onClick={() => !autofilling && fileInputRef.current?.click()}
                                        className={`relative flex flex-col items-center justify-center w-full h-56 border-2 border-dashed rounded-xl transition-all cursor-pointer ${
                                            autofillComplete
                                                ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                                                : "border-border bg-muted/50 hover:bg-muted hover:border-[#2E2E2E] dark:hover:border-white"
                                        }`}
                                    >
                                        {autofilling ? (
                                            <div className="flex flex-col items-center gap-4">
                                                <Loader2 className="w-12 h-12 text-[#2E2E2E] dark:text-white animate-spin" />
                                                <div className="text-center">
                                                    <p className="font-medium text-foreground">Analyzing your resume...</p>
                                                    <p className="text-xs text-muted-foreground mt-1">Extracting skills, experience, and more</p>
                                                </div>
                                            </div>
                                        ) : autofillComplete && resumeFile ? (
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full">
                                                    <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
                                                </div>
                                                <div className="text-center">
                                                    <p className="font-medium text-foreground">{resumeFile.name}</p>
                                                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">Resume parsed successfully</p>
                                                    <p className="text-xs text-muted-foreground mt-2">Click to upload a different file</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="bg-muted p-4 rounded-full">
                                                    <Upload className="w-10 h-10 text-[#2E2E2E] dark:text-white" />
                                                </div>
                                                <div className="text-center">
                                                    <p className="font-medium text-foreground">Click to upload your resume</p>
                                                    <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, or Image (PNG, JPG) up to 10MB</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {!autofillComplete && (
                                        <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                            <p className="text-sm text-amber-800 dark:text-amber-200">
                                                <strong>Tip:</strong> Uploading a resume saves time. All fields will be pre-filled for you to review. You can also skip and fill manually.
                                            </p>
                                        </div>
                                    )}

                                    {autofillComplete && (
                                        <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                                            <p className="text-sm text-green-800 dark:text-green-200">
                                                <strong>Great!</strong> We have extracted your details. Click Next to review and make any corrections.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* STEP 1: PERSONAL */}
                            {step === 1 && (
                                <div className="space-y-4">
                                    <h2 className="text-xl font-semibold">Personal Information</h2>
                                    {autofillComplete && (
                                        <p className="text-sm text-muted-foreground">Review the auto-filled data and make corrections if needed.</p>
                                    )}
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Full Name *</Label>
                                            <Input value={formData.full_name} onChange={e => handleChange("full_name", e.target.value)} placeholder="John Doe" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Date of Birth *</Label>
                                            <Input type="date" value={formData.date_of_birth} onChange={e => handleChange("date_of_birth", e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Gender</Label>
                                            <Select onValueChange={v => handleChange("gender", v)} value={formData.gender}>
                                                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Male">Male</SelectItem>
                                                    <SelectItem value="Female">Female</SelectItem>
                                                    <SelectItem value="Other">Other</SelectItem>
                                                    <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Phone Number *</Label>
                                            <Input value={formData.phone_number} onChange={e => handleChange("phone_number", e.target.value)} placeholder="+91 9999999999" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Current City *</Label>
                                            <Input value={formData.current_city} onChange={e => handleChange("current_city", e.target.value)} placeholder="Mumbai" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Country *</Label>
                                            <Input value={formData.country} onChange={e => handleChange("country", e.target.value)} placeholder="India" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>LinkedIn URL</Label>
                                            <Input value={formData.linkedin_url} onChange={e => handleChange("linkedin_url", e.target.value)} placeholder="https://linkedin.com/in/..." />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>GitHub URL</Label>
                                            <Input value={formData.github_url} onChange={e => handleChange("github_url", e.target.value)} placeholder="https://github.com/..." />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: EDUCATION & EXP */}
                            {step === 2 && (
                                <div className="space-y-4">
                                    <h2 className="text-xl font-semibold">Education & Experience</h2>
                                    {autofillComplete && (
                                        <p className="text-sm text-muted-foreground">Review the auto-filled data and make corrections if needed.</p>
                                    )}
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Highest Education Level *</Label>
                                            <Select onValueChange={v => handleChange("highest_education", v)} value={formData.highest_education}>
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
                                            <Label>Graduation Year *</Label>
                                            <Input type="number" value={formData.graduation_year} onChange={e => handleChange("graduation_year", e.target.value)} placeholder="2024" />
                                        </div>
                                        <div className="col-span-2 space-y-2">
                                            <Label>College / University *</Label>
                                            <Input value={formData.institute_name} onChange={e => handleChange("institute_name", e.target.value)} placeholder="University Name" />
                                        </div>
                                        <div className="col-span-2 space-y-2">
                                            <Label>Major / Department *</Label>
                                            <Input value={formData.education_major} onChange={e => handleChange("education_major", e.target.value)} placeholder="Computer Science" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Current Status *</Label>
                                            <Select onValueChange={v => handleChange("employment_status", v)} value={formData.employment_status}>
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
                                            <Input type="number" step="0.1" value={formData.years_of_experience} onChange={e => handleChange("years_of_experience", e.target.value)} placeholder="0" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Current Company</Label>
                                            <Input value={formData.current_company} onChange={e => handleChange("current_company", e.target.value)} placeholder="Company Name" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Current Designation</Label>
                                            <Input value={formData.current_designation} onChange={e => handleChange("current_designation", e.target.value)} placeholder="Software Engineer" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 3: SKILLS */}
                            {step === 3 && (
                                <div className="space-y-4">
                                    <h2 className="text-xl font-semibold">Skills & Preferences</h2>
                                    {autofillComplete && (
                                        <p className="text-sm text-muted-foreground">Review the auto-filled data and make corrections if needed.</p>
                                    )}
                                    <div className="grid gap-4">
                                        <div className="space-y-2">
                                            <Label>Preferred Job Role *</Label>
                                            <Input value={formData.preferred_role} onChange={e => handleChange("preferred_role", e.target.value)} placeholder="e.g. Frontend Developer" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Preferred Work Type *</Label>
                                            <Select onValueChange={v => handleChange("preferred_work_type", v)} value={formData.preferred_work_type}>
                                                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Full-time">Full-time</SelectItem>
                                                    <SelectItem value="Internship">Internship</SelectItem>
                                                    <SelectItem value="Contract">Contract</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Primary Skills (Comma separated) *</Label>
                                            <Input value={formData.skills_primary} onChange={e => handleChange("skills_primary", e.target.value)} placeholder="React, Node.js, Python" />
                                            <p className="text-xs text-muted-foreground">Your strongest skills that define your expertise</p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Secondary Skills (Comma separated)</Label>
                                            <Input value={formData.skills_secondary} onChange={e => handleChange("skills_secondary", e.target.value)} placeholder="Git, AWS, Docker" />
                                            <p className="text-xs text-muted-foreground">Additional skills you are familiar with</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 4: CONSENT */}
                            {step === 4 && (
                                <div className="space-y-6">
                                    <h2 className="text-xl font-semibold">Final Declarations</h2>
                                    <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded text-sm text-amber-800">
                                        <p className="font-medium mb-1">Important:</p>
                                        To ensure a fair assessment process, valid consent is required.
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer" onClick={() => handleChange("consent_webcam", !formData.consent_webcam)}>
                                            <Checkbox checked={formData.consent_webcam} onCheckedChange={(c) => handleChange("consent_webcam", c === true)} />
                                            <div className="space-y-1">
                                                <Label className="font-medium cursor-pointer">I consent to webcam proctoring</Label>
                                                <p className="text-xs text-muted-foreground">
                                                    My camera will be active during assessments to prevent malpractice. No permanent video is stored unless a violation is flagged.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer" onClick={() => handleChange("consent_data", !formData.consent_data)}>
                                            <Checkbox checked={formData.consent_data} onCheckedChange={(c) => handleChange("consent_data", c === true)} />
                                            <div className="space-y-1">
                                                <Label className="font-medium cursor-pointer">I consent to data processing</Label>
                                                <p className="text-xs text-muted-foreground">
                                                    My profile and assessment data will be processed by AI and shared with recruiters for hiring purposes.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>

                    {/* Navigation */}
                    <div className="flex justify-between pt-8 border-t border-border mt-8">
                        <Button variant="outline" onClick={handleBack} disabled={step === 0 || autofilling}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Button>

                        {step < 4 ? (
                            <Button onClick={handleNext} disabled={autofilling} className="bg-[#2E2E2E] hover:bg-[#404040]">
                                {step === 0 && !autofillComplete ? "Skip & Fill Manually" : "Next"} <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        ) : (
                            <Button onClick={handleSubmit} disabled={loading || !formData.consent_webcam || !formData.consent_data} className="bg-green-600 hover:bg-green-700 min-w-[140px]">
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                                Complete Setup
                            </Button>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}
