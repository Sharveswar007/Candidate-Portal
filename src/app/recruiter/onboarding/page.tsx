"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Building, ShieldCheck, Briefcase } from "lucide-react";

export default function RecruiterOnboarding() {
    const router = useRouter();
    const supabase = createClient();

    const [loading, setLoading] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        full_name: "",
        phone_number: "",
        company_name: "",
        company_domain: "",
        designation: "",
        company_website: "",
        company_size: "",
        official_id: "",
        is_authorized: false
    });

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
                setFormData(prev => ({ ...prev, full_name: user.user_metadata?.full_name || "" }));
            }
        };
        checkUser();
    }, []);

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId) return;

        if (!formData.is_authorized) {
            toast.error("You must confirm you are an authorized recruiter.");
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase
                .from("profiles")
                .update({
                    full_name: formData.full_name,
                    phone_number: formData.phone_number,
                    company_name: formData.company_name,
                    company_domain: formData.company_domain,
                    designation: formData.designation,
                    company_website: formData.company_website,
                    company_size: formData.company_size,
                    official_id: formData.official_id,
                    is_authorized_recruiter: true,
                    onboarding_complete: true,
                    updated_at: new Date().toISOString()
                })
                .eq("id", userId);

            if (error) throw error;

            toast.success("Recruiter Profile Verified!");
            router.refresh();
            setTimeout(() => router.push("/recruiter"), 1000);

        } catch (error) {
            console.error("Onboarding Error:", error);
            toast.error("Failed to save profile.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center py-10 px-4">
            <div className="w-full max-w-2xl space-y-6">
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#2E2E2E]/10 dark:bg-white/10 mb-2">
                        <Building className="h-6 w-6 text-[#2E2E2E] dark:text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-foreground">Company Verification</h1>
                    <p className="text-muted-foreground">Verify your organization details to start posting jobs.</p>
                </div>

                <Card className="p-8 shadow-xl border-border">
                    <form onSubmit={handleSubmit} className="space-y-6">

                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
                                <Briefcase className="h-5 w-5 text-muted-foreground" /> Recruiter Details
                            </h2>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Full Name *</Label>
                                    <Input required value={formData.full_name} onChange={e => handleChange("full_name", e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Phone Number *</Label>
                                    <Input required value={formData.phone_number} onChange={e => handleChange("phone_number", e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Designation / Role *</Label>
                                    <Input required value={formData.designation} onChange={e => handleChange("designation", e.target.value)} placeholder="HR Manager" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Employee ID (Optional)</Label>
                                    <Input value={formData.official_id} onChange={e => handleChange("official_id", e.target.value)} />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
                                <Building className="h-5 w-5 text-muted-foreground" /> Organization Details
                            </h2>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Company Name *</Label>
                                    <Input required value={formData.company_name} onChange={e => handleChange("company_name", e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Company Website *</Label>
                                    <Input required value={formData.company_website} onChange={e => handleChange("company_website", e.target.value)} placeholder="https://..." />
                                </div>
                                <div className="space-y-2">
                                    <Label>Company Domain *</Label>
                                    <Input required value={formData.company_domain} onChange={e => handleChange("company_domain", e.target.value)} placeholder="example.com" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Company Size *</Label>
                                    <Input required value={formData.company_size} onChange={e => handleChange("company_size", e.target.value)} placeholder="100-500" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-4">
                            <Checkbox
                                id="auth"
                                checked={formData.is_authorized}
                                onCheckedChange={(c) => handleChange("is_authorized", c === true)}
                                className="mt-1"
                            />
                            <div className="space-y-1">
                                <Label htmlFor="auth" className="font-semibold cursor-pointer">I confirm I am an authorized hiring manager</Label>
                                <p className="text-xs text-blue-800">
                                    By checking this, you certify that you have the authority to post jobs and recruit on behalf of the company listed above.
                                </p>
                            </div>
                        </div>

                        <div className="pt-2">
                            <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6">
                                {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ShieldCheck className="mr-2 h-5 w-5" />}
                                Verify & Access Dashboard
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    );
}
