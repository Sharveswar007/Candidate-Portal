// Header Component for Student Portal

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardCheck,
  BarChart3,
  Moon,
  Sun,
  Menu,
  X,
  Home,
  User,
  LogOut,
  FileText,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/candidate/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/candidate/resume", label: "Resume", icon: FileText },

];

export function Header() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  // Hide header on login and assessment pages (but show on candidate dashboard/profile)
  if (
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/technical") ||
    pathname?.startsWith("/assessment") ||
    pathname?.startsWith("/proctoring") ||
    pathname?.startsWith("/candidate/onboarding")
  ) {
    return null;
  }


  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <motion.div
            className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[#2E2E2E] dark:bg-white shadow-lg"
            whileHover={{ scale: 1.05, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
          >
            <GraduationCap className="h-6 w-6 text-white dark:text-[#2E2E2E]" />
          </motion.div>
          <span className="hidden font-bold text-xl text-[#2E2E2E] dark:text-white sm:inline-block">
            HIRENEX
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== "/" && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 bg-[#2E2E2E]/10 rounded-lg border border-[#2E2E2E]/20 dark:bg-white/10 dark:border-white/20"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {mounted && (
            <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign Out">
              <LogOut className="h-5 w-5" />
            </Button>
          )}

          {mounted && (
            <Button variant="ghost" size="icon" onClick={toggleTheme} title="Toggle Theme">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={theme}
                  initial={{ y: -20, opacity: 0, rotate: -90 }}
                  animate={{ y: 0, opacity: 1, rotate: 0 }}
                  exit={{ y: 20, opacity: 0, rotate: 90 }}
                  transition={{ duration: 0.2 }}
                >
                  {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </motion.div>
              </AnimatePresence>
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden border-t bg-background"
          >
            <nav className="container py-4 px-4 space-y-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== "/" && pathname?.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                      isActive ? "bg-[#2E2E2E]/10 text-foreground dark:bg-white/10" : "text-muted-foreground hover:bg-accent"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
