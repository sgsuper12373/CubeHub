import { getPuzzles } from "@/lib/learn/dal";
import { PuzzleCard } from "@/components/learn/puzzle-card";
import { HeroSection } from "@/components/learn/hero-section";
import { FeatureSection } from "@/components/learn/feature-section";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Learn | CubeHub",
  description: "Learn how to solve Rubik's Cubes of all types with our free tutorials.",
};

export default async function LearnPage() {
  const puzzles = await getPuzzles();

  return (
    <div className="relative min-h-screen bg-learn-bg selection:bg-learn-teal/30">
      {/* Global Background Effects */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,92,255,0.05),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(0,229,196,0.05),transparent_50%)]" />
      </div>

      <div className="container relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-24">
        <HeroSection />

        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {puzzles.map((puzzle, index) => (
              <PuzzleCard key={puzzle.id} puzzle={puzzle} index={index} />
            ))}
          </div>
        </div>

        <FeatureSection />
      </div>
    </div>
  );
}
