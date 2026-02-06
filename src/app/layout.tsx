// Root Layout with Providers

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { Header } from "@/components/layout/header";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  title: "HIRENEX - AI-Powered Talent Evaluation Platform",
  description:
    "Enterprise-grade assessment platform featuring scenario-based MCQs, coding sandbox, psychometric evaluations, and transparent AI hiring decisions.",
  keywords: [
    "talent evaluation",
    "assessment engine",
    "coding sandbox",
    "psychometric test",
    "scenario MCQ",
    "skill assessment",
    "talent evaluation",
    "hiring platform",
  ],
  authors: [{ name: "HIRENEX Team" }],
  openGraph: {
    title: "HIRENEX - AI-Powered Talent Evaluation Platform",
    description: "Enterprise-grade assessment with AI-powered evaluations",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <div className="relative min-h-screen bg-white dark:bg-[#2E2E2E]">
              <Header />
              <main className="relative z-10">{children}</main>
            </div>
            <Toaster position="top-right" richColors />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
