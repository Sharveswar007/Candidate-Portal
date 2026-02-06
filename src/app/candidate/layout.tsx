// Candidate Portal Layout
// Clean, focused interface for job applicants

import { Header } from "@/components/layout/candidate-header";

export default function CandidateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="min-h-[calc(100vh-4rem)]">{children}</main>
    </>
  );
}
