"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Briefcase,
  MapPin,
  Clock,
  Building2,
  Search,
  Filter,
  ArrowRight,
  Star,
  TrendingUp
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

interface CandidateProfile {
  skills_primary: string[];
  skills_secondary: string[];
  current_education: string;
  years_experience: number;
  preferred_role: string;
  preferred_work_type: string;
  current_city: string;
  employment_status: string;
}

interface JobWithScore {
  id: string;
  title: string;
  company_name: string;
  location: string;
  employment_type: string;
  work_mode: string;
  skills_config: { required?: string[]; nice_to_have?: string[] };
  experience_range: string;
  seniority_level: string;
  created_at: string;
  matchScore: number;
  matchReasons: string[];
}

// Calculate match score between candidate profile and job
function calculateMatchScore(profile: CandidateProfile | null, job: any): { score: number; reasons: string[] } {
  if (!profile) return { score: 0, reasons: [] };

  let score = 0;
  const reasons: string[] = [];

  const candidateSkills = [
    ...(profile.skills_primary || []),
    ...(profile.skills_secondary || [])
  ].map(s => s.toLowerCase().trim());

  // Skills matching (up to 50 points)
  const jobSkills = [
    ...(job.skills_config?.required || []),
    ...(job.skills_config?.nice_to_have || [])
  ].map((s: string) => s.toLowerCase().trim());

  if (jobSkills.length > 0 && candidateSkills.length > 0) {
    const matchedSkills = candidateSkills.filter(skill =>
      jobSkills.some(js => js.includes(skill) || skill.includes(js))
    );
    const skillScore = Math.min(50, (matchedSkills.length / Math.max(jobSkills.length, 1)) * 50);
    score += skillScore;
    if (matchedSkills.length > 0) {
      reasons.push(`${matchedSkills.length} skill${matchedSkills.length > 1 ? 's' : ''} match`);
    }
  }

  // Experience matching (up to 20 points)
  const expRange = job.experience_range || "";
  const candidateExp = profile.years_experience || 0;
  if (expRange) {
    const expMatch = expRange.match(/(\d+)/);
    if (expMatch) {
      const requiredExp = parseInt(expMatch[1]);
      if (candidateExp >= requiredExp) {
        score += 20;
        reasons.push("Experience matches");
      } else if (candidateExp >= requiredExp - 1) {
        score += 10;
        reasons.push("Close experience match");
      }
    }
  } else {
    score += 10; // No experience requirement
  }

  // Work type matching (up to 15 points)
  const jobType = (job.employment_type || "").toLowerCase();
  const preferredType = (profile.preferred_work_type || "").toLowerCase();
  if (preferredType && jobType) {
    if (jobType.includes(preferredType) || preferredType.includes(jobType)) {
      score += 15;
      reasons.push("Work type matches");
    }
  }

  // Location matching (up to 10 points)
  const jobLocation = (job.location || "").toLowerCase();
  const candidateCity = (profile.current_city || "").toLowerCase();
  const workMode = (job.work_mode || "").toLowerCase();
  if (workMode === "remote") {
    score += 10;
    reasons.push("Remote friendly");
  } else if (candidateCity && jobLocation && jobLocation.includes(candidateCity)) {
    score += 10;
    reasons.push("Location match");
  }

  // Role preference (up to 5 points)
  const preferredRole = (profile.preferred_role || "").toLowerCase();
  const jobTitle = (job.title || "").toLowerCase();
  if (preferredRole && jobTitle.includes(preferredRole)) {
    score += 5;
    reasons.push("Role preference match");
  }

  return { score: Math.round(score), reasons };
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobWithScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      // Fetch candidate profile first
      const { data: { user } } = await supabase.auth.getUser();
      
      let candidateProfile: CandidateProfile | null = null;
      if (user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("skills_primary, skills_secondary, current_education, years_experience, preferred_role, preferred_work_type, current_city, employment_status")
          .eq("id", user.id)
          .single();
        
        if (profileData) {
          candidateProfile = profileData as CandidateProfile;
          setProfile(candidateProfile);
        }
      }

      // Fetch jobs
      const { data, error } = await supabase
        .from("job_descriptions")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (data) {
        // Calculate match scores for each job
        const jobsWithScores: JobWithScore[] = data.map(job => {
          const { score, reasons } = calculateMatchScore(candidateProfile, job);
          return {
            ...job,
            matchScore: score,
            matchReasons: reasons
          };
        });

        // Sort by match score (highest first)
        jobsWithScores.sort((a, b) => b.matchScore - a.matchScore);
        setJobs(jobsWithScores);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  const filteredJobs = jobs.filter(job =>
    job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Separate recommended jobs (score >= 40) from others
  const recommendedJobs = filteredJobs.filter(job => job.matchScore >= 40);
  const otherJobs = filteredJobs.filter(job => job.matchScore < 40);

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-[#2E2E2E] flex items-center justify-center">
                <Briefcase className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-lg">HIRENEX</span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost">Dashboard</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 max-w-6xl">
        <div className="text-center mb-12 space-y-4">
          <h1 className="text-4xl font-bold text-[#2E2E2E] dark:text-white">
            Find Your Next Opportunity
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Browse active roles, view requirements, and start your AI-powered assessment journey.
          </p>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-4 mb-8 max-w-2xl mx-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by role or company..."
              className="pl-9 h-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" /> Filters
          </Button>
        </div>

        {/* Profile Status Banner */}
        {!profile?.skills_primary?.length && (
          <div className="mb-8 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-amber-800 dark:text-amber-200 text-sm">
              <strong>Complete your profile</strong> to get personalized job recommendations based on your skills and experience.{" "}
              <Link href="/candidate/profile" className="underline font-medium">Update Profile</Link>
            </p>
          </div>
        )}

        {/* Job Grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 rounded-xl bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-10">
            {/* Recommended Jobs Section */}
            {recommendedJobs.length > 0 && profile && (
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <h2 className="text-xl font-bold text-[#2E2E2E] dark:text-white">Recommended for You</h2>
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Based on your profile
                  </Badge>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recommendedJobs.map((job) => (
                    <Link href={`/jobs/${job.id}`} key={job.id}>
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ y: -5 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <Card className="p-6 h-full hover:border-green-500/50 hover:shadow-lg transition-all group relative overflow-hidden border-green-200 dark:border-green-800">
                          {/* Match Score Badge */}
                          <div className="absolute top-3 right-3 z-20">
                            <div className="flex items-center gap-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded-full text-xs font-medium">
                              <Star className="h-3 w-3 fill-current" />
                              {job.matchScore}% Match
                            </div>
                          </div>

                          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Briefcase className="h-24 w-24 -mr-8 -mt-8 text-green-600" />
                          </div>

                          <div className="relative z-10 space-y-4">
                            <div className="flex items-start justify-between">
                              <div className="h-12 w-12 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors">
                                <Building2 className="h-6 w-6" />
                              </div>
                            </div>

                            <div>
                              <h3 className="font-bold text-lg group-hover:text-green-600 transition-colors line-clamp-1">
                                {job.title}
                              </h3>
                              <p className="text-muted-foreground text-sm flex items-center gap-1">
                                {job.company_name || 'Tech Company'}
                              </p>
                            </div>

                            {/* Match Reasons */}
                            {job.matchReasons.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {job.matchReasons.slice(0, 3).map((reason, idx) => (
                                  <span key={idx} className="text-xs bg-green-50 dark:bg-green-900/50 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
                                    {reason}
                                  </span>
                                ))}
                              </div>
                            )}

                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1 bg-secondary px-2 py-1 rounded-md">
                                <MapPin className="h-3 w-3" /> {job.location || 'Remote'}
                              </span>
                              <span className="flex items-center gap-1 bg-secondary px-2 py-1 rounded-md">
                                {job.employment_type?.replace('_', ' ') || 'Full Time'}
                              </span>
                            </div>

                            <Button className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white transition-all">
                              View Details <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                          </div>
                        </Card>
                      </motion.div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* All Jobs Section */}
            <div>
              {recommendedJobs.length > 0 && profile && (
                <h2 className="text-xl font-bold text-[#2E2E2E] dark:text-white mb-6">All Positions</h2>
              )}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(recommendedJobs.length > 0 && profile ? otherJobs : filteredJobs).length > 0 ? (
                  (recommendedJobs.length > 0 && profile ? otherJobs : filteredJobs).map((job) => (
                    <Link href={`/jobs/${job.id}`} key={job.id}>
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ y: -5 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <Card className="p-6 h-full hover:border-[#2E2E2E]/50 hover:shadow-lg transition-all group relative overflow-hidden">
                          {/* Match Score if profile exists */}
                          {profile && job.matchScore > 0 && (
                            <div className="absolute top-3 right-3 z-20">
                              <div className="flex items-center gap-1 bg-secondary text-muted-foreground px-2 py-1 rounded-full text-xs">
                                {job.matchScore}% Match
                              </div>
                            </div>
                          )}

                          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Briefcase className="h-24 w-24 -mr-8 -mt-8 text-primary" />
                          </div>

                          <div className="relative z-10 space-y-4">
                            <div className="flex items-start justify-between">
                              <div className="h-12 w-12 rounded-lg bg-secondary flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                <Building2 className="h-6 w-6" />
                              </div>
                              <Badge variant="secondary" className="bg-secondary text-secondary-foreground">
                                {job.employment_type?.replace('_', ' ') || 'Full Time'}
                              </Badge>
                            </div>

                            <div>
                              <h3 className="font-bold text-lg group-hover:text-primary transition-colors line-clamp-1">
                                {job.title}
                              </h3>
                              <p className="text-muted-foreground text-sm flex items-center gap-1">
                                {job.company_name || 'Tech Company'}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1 bg-secondary px-2 py-1 rounded-md">
                                <MapPin className="h-3 w-3" /> {job.location || 'Remote'}
                              </span>
                              <span className="flex items-center gap-1 bg-secondary px-2 py-1 rounded-md">
                                <Clock className="h-3 w-3" /> Posted {new Date(job.created_at).toLocaleDateString()}
                              </span>
                            </div>

                            <Button className="w-full mt-4 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                              View Details <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                          </div>
                        </Card>
                      </motion.div>
                    </Link>
                  ))
                ) : (
                  <div className="col-span-full text-center py-20">
                    <p className="text-muted-foreground">No jobs found matching your criteria.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
