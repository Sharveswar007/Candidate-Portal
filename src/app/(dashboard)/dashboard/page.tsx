// Dashboard - Candidate Overview

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Code2,
  Trophy,
  Target,
  ArrowRight,
  Zap,
  ClipboardCheck,
  FileText,
  SlidersHorizontal,
  BarChart3,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Briefcase,
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { FloatingOrbs } from "@/components/effects/floating-orbs";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    assessmentsCompleted: 0,
    technicalScore: 0,
    psychometricScore: 0,
    codingChallenges: 0,
  });
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      // Fetch Recent Jobs
      const { data: jobs } = await supabase
        .from("job_descriptions")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(3);

      if (jobs) setRecentJobs(jobs);

      if (user) {
        // Fetch real stats - wrapped in try-catch to handle RLS issues
        try {
          const [sessionsRes, submissionsRes] = await Promise.all([
            supabase
              .from("assessment_sessions")
              .select("total_score, technical_score, psychometric_score")
              .eq("candidate_id", user.id)
              .eq("status", "completed")
              .order("completed_at", { ascending: false })
              .limit(1),
            supabase
              .from("coding_submissions")
              .select("id")
              .eq("candidate_id", user.id)
              .eq("status", "passed"),
          ]);

          const latestSession = sessionsRes.data?.[0];
          setStats({
            assessmentsCompleted: sessionsRes.data?.length || 0,
            technicalScore: latestSession?.technical_score || 0,
            psychometricScore: latestSession?.psychometric_score || 0,
            codingChallenges: submissionsRes.data?.length || 0,
          });
        } catch (err) {
          // Silently handle RLS or table access errors
          console.log("Stats fetch skipped (table may not be accessible)");
        }
      }

      setLoading(false);
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="h-12 w-12 rounded-full bg-gradient-to-r from-violet-500 to-indigo-600 animate-pulse" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </motion.div>
      </div>
    );
  }

  const quickActions = [
    {
      href: "/jobs",
      icon: Briefcase,
      title: "Browse All Jobs",
      description: "View active roles & apply",
      color: "from-blue-600 to-indigo-600",
    },
    {
      href: "/assessment",
      icon: ClipboardCheck,
      title: "Start Assessment",
      description: "Take the full multi-modal evaluation",
      color: "from-violet-500 to-purple-500",
    },
    {
      href: "/challenges",
      icon: Code2,
      title: "Coding Sandbox",
      description: "Practice coding challenges",
      color: "from-orange-500 to-amber-500",
    },
    {
      href: "/psychometric",
      icon: SlidersHorizontal,
      title: "Psychometric Test",
      description: "Complete personality assessment",
      color: "from-emerald-500 to-teal-500",
    },
    {
      href: "/resume",
      icon: FileText,
      title: "Resume Analysis",
      description: "Upload and analyze your resume",
      color: "from-blue-500 to-cyan-500",
    },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingOrbs variant="subtle" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="container py-8 px-4 max-w-6xl mx-auto relative z-10"
      >
        {/* Header */}
        <motion.header variants={itemVariants} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <motion.div
              className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg"
              whileHover={{ scale: 1.05, rotate: 5 }}
            >
              <Zap className="h-6 w-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-3xl font-bold">
                Welcome, {user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Candidate"}!
              </h1>
              <p className="text-muted-foreground">Your HR evaluation dashboard</p>
            </div>
          </div>
        </motion.header>

        {/* Stats Cards */}
        <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-4 mb-8">
          {[
            { icon: Trophy, label: "Assessments", value: stats.assessmentsCompleted, color: "text-violet-500", bg: "bg-violet-500/10" },
            { icon: Target, label: "Technical Score", value: `${stats.technicalScore}%`, color: "text-emerald-500", bg: "bg-emerald-500/10" },
            { icon: SlidersHorizontal, label: "Psychometric", value: `${stats.psychometricScore}%`, color: "text-blue-500", bg: "bg-blue-500/10" },
            { icon: Code2, label: "Coding Passed", value: stats.codingChallenges, color: "text-orange-500", bg: "bg-orange-500/10" },
          ].map((stat) => (
            <motion.div key={stat.label} whileHover={{ y: -5, scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
              <Card className="p-6 hover:shadow-xl transition-all">
                <div className="flex items-center gap-4">
                  <div className={`p-3 ${stat.bg} rounded-xl`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* New: Recent Job Openings */}
        <motion.section variants={itemVariants} className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recent Job Openings</h2>
            <Link href="/jobs" className="text-sm text-primary hover:underline flex items-center gap-1">
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {recentJobs.length > 0 ? (
              recentJobs.map((job) => (
                <Link href={`/jobs/${job.id}`} key={job.id}>
                  <motion.div whileHover={{ y: -5 }} transition={{ type: "spring", stiffness: 300 }}>
                    <Card className="p-5 h-full hover:shadow-lg transition-all hover:border-primary/50 cursor-pointer border-l-4 border-l-primary/20 hover:border-l-primary">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold line-clamp-1">{job.title}</h3>
                        <Badge variant="secondary" className="text-[10px] h-5">{job.employment_type?.replace('_', ' ') || 'Full Time'}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">{job.company_name}</p>

                      <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto">
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-3 w-3" /> {job.location || 'Remote'}
                        </span>
                        <span className="text-primary font-medium group-hover:underline">Apply Now &rarr;</span>
                      </div>
                    </Card>
                  </motion.div>
                </Link>
              ))
            ) : (
              <Card className="col-span-3 p-8 flex flex-col items-center justify-center text-center text-muted-foreground bg-muted/20 border-dashed">
                <Briefcase className="h-10 w-10 mb-2 opacity-50" />
                <p>No active job postings yet.</p>
                <p className="text-sm">Check back later for new opportunities!</p>
              </Card>
            )}
          </div>
        </motion.section>

        {/* Quick Actions */}
        <motion.section variants={itemVariants} className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => (
              <Link key={action.href} href={action.href}>
                <motion.div whileHover={{ y: -5 }} transition={{ type: "spring", stiffness: 300 }}>
                  <Card className="p-6 h-full hover:shadow-xl transition-all hover:border-violet-500/50 cursor-pointer group">
                    <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <action.icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="font-semibold mb-1">{action.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{action.description}</p>
                    <div className="flex items-center text-sm text-violet-600 dark:text-violet-400">
                      Start <ArrowRight className="ml-1 h-4 w-4" />
                    </div>
                  </Card>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.section>

        {/* Assessment Status */}
        <motion.section variants={itemVariants}>
          <h2 className="text-xl font-semibold mb-4">Evaluation Progress</h2>
          <Card className="p-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <h3 className="font-medium">Resume Uploaded</h3>
                  <p className="text-sm text-muted-foreground">Your resume has been parsed</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-medium">Assessment Pending</h3>
                  <p className="text-sm text-muted-foreground">Complete your evaluation</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <BarChart3 className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-medium">Results Pending</h3>
                  <p className="text-sm text-muted-foreground">Complete assessment first</p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Ready to begin your evaluation?</h3>
                  <p className="text-sm text-muted-foreground">Complete all assessment modules for your final score</p>
                </div>
                <Link href="/assessment">
                  <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700">
                    Start Assessment
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </motion.section>
      </motion.div>
    </div>
  );
}
