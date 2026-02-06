// TalentPulse - AI-Enabled HR Evaluation System
// Landing Page

"use client";

import Link from "next/link";
import { motion, Variants } from "framer-motion";
import {
  ClipboardCheck,
  Code2,
  SlidersHorizontal,
  MessageSquareText,
  ArrowRight,
  Zap,
  Shield,
  FileSearch,
  Brain,
  BarChart3,
  Eye,
  Upload,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const features = [
  {
    icon: ClipboardCheck,
    title: "Scenario-Based MCQs",
    description:
      "Workplace situation questions evaluating decision-making and professional judgment in real-world scenarios.",
    color: "bg-[#2E2E2E]",
  },
  {
    icon: Code2,
    title: "Coding Sandbox",
    description:
      "Functional IDE where candidates write code executed and graded against hidden test cases in real-time.",
    color: "bg-[#2E2E2E]",
  },
  {
    icon: MessageSquareText,
    title: "Text-Based Responses",
    description:
      "Open-ended questions evaluating communication skills, critical thinking, and thought process clarity.",
    color: "bg-[#2E2E2E]",
  },
  {
    icon: SlidersHorizontal,
    title: "Psychometric Mapping",
    description:
      "Slider-based inputs for quantitative self-assessments and preference scales for personality profiling.",
    color: "bg-[#2E2E2E]",
  },
  {
    icon: Eye,
    title: "Integrity Shield",
    description:
      "Robust proctoring system with visual monitoring, tab detection, and comprehensive audit trails.",
    color: "bg-[#2E2E2E]",
  },
  {
    icon: FileSearch,
    title: "Smart Resume Shortlisting",
    description:
      "AI-powered resume parsing with job matching, auto-ranking into High Match, Potential, and Reject categories.",
    color: "bg-[#2E2E2E]",
  },
];

const capabilities = [
  {
    icon: Target,
    title: "Technical Assessment",
    description: "Syntax, logic, system design, and domain knowledge evaluation",
  },
  {
    icon: Brain,
    title: "Psychometric Assessment",
    description: "Emotional intelligence, resilience, leadership, and culture fit",
  },
  {
    icon: Shield,
    title: "Anti-Cheat Proctoring",
    description: "Face detection, tab monitoring, and suspicious activity logging",
  },
  {
    icon: BarChart3,
    title: "Explainable AI Decisions",
    description: "Transparent Hire/No-Hire recommendations with full rationale",
  },
];

const stats = [
  { value: "4+", label: "Assessment Types" },
  { value: "50+", label: "Languages Supported" },
  { value: "AI", label: "Powered Decisions" },
  { value: "Real-time", label: "Proctoring" },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 100, damping: 10 },
  },
};

export default function HomePage() {
  return (
    <div className="relative overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center px-4 py-20">
        <div className="container max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/5 border border-black/10 text-black dark:text-white dark:bg-white/5 dark:border-white/10 text-sm font-medium"
            >
              <Zap className="h-4 w-4" />
              AI-Enabled HR Evaluation System
            </motion.div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight">
              <span className="block">Hire Smarter with</span>
              <span className="block text-black dark:text-white">
                Explainable AI
              </span>
            </h1>

            <p className="max-w-2xl mx-auto text-lg text-muted-foreground md:text-xl">
              End-to-end HR evaluation from resume upload to final hiring decision.
              Multi-modal assessments, integrity proctoring, and transparent AI rationale.
            </p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4 justify-center pt-4"
            >
              <Link href="/login">
                <Button
                  size="lg"
                  className="group bg-[#2E2E2E] hover:bg-[#404040] text-white shadow-lg px-8"
                >
                  Start Evaluation
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/resume">
                <Button size="lg" variant="outline" className="group border-2 border-[#2E2E2E] hover:bg-[#2E2E2E] hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-[#2E2E2E] px-8">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Resume
                </Button>
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 max-w-3xl mx-auto"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 + index * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-bold text-black dark:text-white">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Dual-Track Assessment Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Dual-Track Assessment Logic</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Comprehensive evaluation across technical skills and psychological traits
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {capabilities.map((cap, index) => (
              <motion.div
                key={cap.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="p-6 h-full hover:shadow-lg transition-all border-[#e0e0e0] dark:border-[#4a4a4a] hover:border-[#2E2E2E] dark:hover:border-white">
                  <div className="h-12 w-12 rounded-xl bg-[#2E2E2E] dark:bg-white flex items-center justify-center mb-4">
                    <cap.icon className="h-6 w-6 text-white dark:text-[#2E2E2E]" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{cap.title}</h3>
                  <p className="text-sm text-muted-foreground">{cap.description}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container max-w-6xl mx-auto">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.h2 variants={itemVariants} className="text-3xl md:text-4xl font-bold mb-4">
              Multi-Modal Assessment Engine
            </motion.h2>
            <motion.p variants={itemVariants} className="text-muted-foreground max-w-2xl mx-auto">
              Versatile testing interface supporting various data inputs to evaluate candidate job-readiness.
            </motion.p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            {features.map((feature) => (
              <motion.div key={feature.title} variants={itemVariants}>
                <Card className="group p-6 h-full hover:shadow-xl transition-all duration-300 border-[#e0e0e0] dark:border-[#4a4a4a] hover:border-[#2E2E2E] dark:hover:border-white cursor-pointer">
                  <div
                    className={`h-12 w-12 rounded-xl ${feature.color} dark:bg-white flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                  >
                    <feature.icon className="h-6 w-6 text-white dark:text-[#2E2E2E]" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How HIRENEX Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              From resume upload to final hiring decision with transparent AI rationale
            </p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: "1", title: "Upload Resume", desc: "AI parses and scores against job description" },
              { step: "2", title: "Take Assessment", desc: "MCQs, coding, text responses with proctoring" },
              { step: "3", title: "AI Evaluation", desc: "Comprehensive scoring across all dimensions" },
              { step: "4", title: "Get Decision", desc: "Hire/No-Hire with full explainable rationale" },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="h-16 w-16 rounded-full bg-[#2E2E2E] dark:bg-white flex items-center justify-center mx-auto mb-4 text-white dark:text-[#2E2E2E] text-2xl font-bold">
                  {item.step}
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <h2 className="text-3xl md:text-4xl font-bold">Ready to Transform Your Hiring?</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Join companies using AI-powered assessments with transparent decision-making.
            </p>
            <Link href="/login">
              <Button
                size="lg"
                className="bg-[#2E2E2E] hover:bg-[#404040] text-white px-8"
              >
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4">
        <div className="container max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-[#2E2E2E] dark:bg-white flex items-center justify-center">
              <Zap className="h-4 w-4 text-white dark:text-[#2E2E2E]" />
            </div>
            <span className="font-bold text-lg">HIRENEX</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 HIRENEX. AI-Powered Talent Evaluation Platform.</p>
        </div>
      </footer>
    </div>
  );
}
