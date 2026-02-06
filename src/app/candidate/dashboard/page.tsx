// Candidate Dashboard - Simple status view
// Candidates see: resume status, eligibility, assessment status
// Candidates do NOT see: scores, logs, decision logic

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Upload,
  ClipboardCheck,
  Shield,
  Loader2,
  Rocket,
  Target,
  Sparkles,
  MapPin,
  Hand,
  Building2,
  Search,
  TrendingUp,
  Compass,
  Map,
  ExternalLink,
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface CandidateStatus {
  hasResume: boolean;
  resumeStatus: "pending" | "high_match" | "potential" | "reject" | null;
  hasCompletedAssessment: boolean;
  assessmentStatus: "not_started" | "in_progress" | "completed";
}

export default function CandidateDashboard() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [recentJobs, setRecentJobs] = useState<any[]>([]);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    // 1. Get Profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    setProfile(profileData);

    // 2. Get My Applications (silently handle errors)
    const { data: myApps, error: appsError } = await supabase
      .from("applications")
      .select(`
        *,
        job:job_descriptions (title, company_name, location)
      `)
      .eq("candidate_id", user.id)
      .order("created_at", { ascending: false });

    if (!appsError && myApps) {
      setApplications(myApps);
    }

    // 3. Get Recent Jobs (excluding applied ones could be a nice touch, but keep simple for now)
    const { data: jobs } = await supabase
      .from("job_descriptions")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(6);
    setRecentJobs(jobs || []);

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#2E2E2E] dark:text-white" />
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row items-center justify-between mb-10 gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
            Welcome, {profile?.full_name?.split(" ")[0] || "Candidate"}! <Hand className="h-7 w-7" />
          </h1>
          <p className="text-muted-foreground">
            Find your dream role and track your applications.
          </p>
        </div>

        <Link href="/jobs">
          <Button className="gap-2 bg-primary hover:bg-primary/90">
            <Rocket className="h-4 w-4" /> Explore All Jobs
          </Button>
        </Link>
      </motion.div>

      {/* My Applications Section */}
      {applications.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-10"
        >
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-[#2E2E2E] dark:text-white" />
            My Applications
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {applications.map((app) => {
              // Map database columns to UI values
              const decision = app.final_decision === 'hire' ? 'hired' : 
                               app.final_decision === 'no_hire' ? 'rejected' : 
                               app.final_decision === 'pending' ? 'consider' : null;
              const decisionAt = app.updated_at;
              const currentStage = app.status;
              
              return (
              <Card
                key={app.id}
                onClick={() => router.push(`/jobs/${app.job_id}`)}
                className={`p-4 hover:border-[#2E2E2E]/50 dark:hover:border-white/50 transition-all cursor-pointer group h-full ${
                  decision === 'hired' ? 'border-green-500/50 bg-green-500/5' :
                  decision === 'rejected' ? 'border-red-500/30 bg-red-500/5' : ''
                }`}
              >
                {/* HR Decision Banner - Show prominently if decision made */}
                {decision && (
                  <div className={`-mx-4 -mt-4 mb-4 px-4 py-3 rounded-t-lg ${
                    decision === 'hired' 
                      ? 'bg-green-500 text-white' 
                      : decision === 'rejected'
                        ? 'bg-red-500/80 text-white'
                        : 'bg-yellow-500/80 text-white'
                  }`}>
                    <div className="flex items-center gap-2">
                      {decision === 'hired' ? (
                        <>
                          <CheckCircle2 className="h-5 w-5" />
                          <span className="font-semibold">🎉 Congratulations! You&apos;ve Been Hired!</span>
                        </>
                      ) : decision === 'rejected' ? (
                        <>
                          <AlertTriangle className="h-5 w-5" />
                          <span className="font-medium">Application Not Selected</span>
                        </>
                      ) : (
                        <>
                          <Clock className="h-5 w-5" />
                          <span className="font-medium">Under Consideration</span>
                        </>
                      )}
                    </div>
                    {decisionAt && (
                      <p className="text-xs opacity-80 mt-1">
                        Decision made on {new Date(decisionAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{app.job?.title || "Unknown Role"}</h3>
                    <p className="text-sm text-muted-foreground">{app.job?.company_name}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {!decision && (
                      <Badge variant={
                        currentStage === 'shortlisted' ? 'default' :
                          currentStage === 'assessment' ? 'secondary' : 'outline'
                      }>
                        {currentStage ? currentStage.charAt(0).toUpperCase() + currentStage.slice(1) : 'Applied'}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground text-xs">
                    Applied: {new Date(app.created_at).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-1 text-[#2E2E2E] dark:text-white font-medium group-hover:translate-x-1 transition-transform">
                    {decision === 'hired' ? 'View Offer Details' :
                      decision === 'rejected' ? 'View Feedback' :
                      currentStage === 'assessment' ? 'Start Assessment' :
                      currentStage === 'pending' ? 'Check Status' : 'View Details'}
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </Card>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Career Path Explorer Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-10"
      >
        <a 
          href="https://career-path-neon.vercel.app/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="block"
        >
          <Card className="p-6 bg-[#2E2E2E] text-white border-none hover:shadow-xl transition-all cursor-pointer group">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center">
                    <Compass className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Career Path Explorer</h3>
                    <p className="text-white/60 text-sm">AI-Powered Career Planning</p>
                  </div>
                </div>
                
                <p className="text-white/70 mb-4 text-sm">
                  Discover your ideal career trajectory based on your skills and market trends.
                </p>
                
                <div className="flex flex-wrap gap-2">
                  <span className="px-2.5 py-1 rounded bg-white/10 text-xs text-white/80">Career Roadmaps</span>
                  <span className="px-2.5 py-1 rounded bg-white/10 text-xs text-white/80">Growth Paths</span>
                  <span className="px-2.5 py-1 rounded bg-white/10 text-xs text-white/80">Skill Analysis</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-white/60 group-hover:text-white transition-colors">
                <span className="text-sm font-medium hidden sm:inline">Explore</span>
                <ExternalLink className="h-5 w-5" />
              </div>
            </div>
          </Card>
        </a>
      </motion.div>

      {/* Recommended Jobs Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Target className="h-5 w-5 text-[#2E2E2E] dark:text-white" />
            Recommended Jobs
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {recentJobs.length > 0 ? (
            recentJobs.map((job) => (
              <motion.div
                key={job.id}
                whileHover={{ y: -5 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="h-full"
              >
                <Card
                  onClick={() => router.push(`/jobs/${job.id}`)}
                  className="p-5 h-full hover:shadow-lg transition-all hover:border-[#2E2E2E]/50 dark:hover:border-white/50 cursor-pointer border-t-4 border-t-transparent hover:border-t-[#2E2E2E] dark:hover:border-t-white"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <Badge variant="outline" className="text-[10px]">{job.employment_type?.replace('_', ' ') || 'Full Time'}</Badge>
                  </div>

                  <h3 className="font-semibold line-clamp-1 mb-1">{job.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{job.company_name}</p>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-auto">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {job.location || 'Remote'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {new Date(job.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </Card>
              </motion.div>
            ))
          ) : (
            <Card className="col-span-full p-12 flex flex-col items-center justify-center text-center text-muted-foreground bg-muted/20 border-dashed">
              <div className="h-12 w-12 mb-4 opacity-50 flex items-center justify-center rounded-full bg-muted"><Search className="h-6 w-6" /></div>
              <p className="text-lg font-medium">No jobs found</p>
              <p className="text-sm">We'll notify you when new roles are posted.</p>
            </Card>
          )}
        </div>
      </motion.div>
    </div>
  );
}
