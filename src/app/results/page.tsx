"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function ResultsPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="max-w-md w-full p-8 text-center space-y-6 shadow-xl border-[#2E2E2E]/20 dark:border-white/20">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="w-24 h-24 mx-auto bg-[#2E2E2E]/10 dark:bg-white/10 rounded-full flex items-center justify-center"
          >
            <CheckCircle2 className="h-12 w-12 text-[#2E2E2E] dark:text-white" />
          </motion.div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Assessment Submitted</h1>
            <p className="text-muted-foreground">
              Thank you for completing the assessment. Your responses have been securely recorded and sent to our recruitment team.
            </p>
          </div>

          <div className="p-4 bg-muted/50 rounded-lg text-sm text-left space-y-2">
            <p><strong>What's Next?</strong></p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Our AI is analyzing your submission.</li>
              <li>The recruiter will review your profile.</li>
              <li>You will receive an email update shortly.</li>
            </ul>
          </div>

          <Link href="/candidate/dashboard">
            <Button className="w-full bg-[#2E2E2E] hover:bg-[#404040] text-white">
              Return to Dashboard
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </Card>
      </motion.div>
    </div>
  );
}
