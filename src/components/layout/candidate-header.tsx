// Candidate Portal Header - Clean, minimal navigation

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Zap,
  Moon,
  Sun,
  Home,
  FileText,
  ClipboardCheck,
  LogOut,
  User,
  LayoutDashboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/candidate/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

export function Header() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleSignOut = async () => {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-14 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/candidate/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black dark:bg-white">
            <Zap className="h-4 w-4 text-white dark:text-black" />
          </div>
          <span className="font-semibold text-lg text-black dark:text-white">
            HIRENEX
          </span>
        </Link>

        {/* Navigation */}
        {/* Center Label */}
        <div className="hidden md:flex items-center justify-center">
          <div className="px-3 py-1 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-medium text-black/60 dark:text-white/60">
            Candidate Portal
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-8 w-8"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          )}
          <Link href="/candidate/profile">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <User className="h-4 w-4" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
