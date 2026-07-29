import { MOCK_LEARN_DATA } from "@/lib/learn/mock-data";
import { PuzzleCard } from "@/components/learn/puzzle-card";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Learn | CubeHub",
  description: "Learn how to solve Rubik's Cubes of all types with our free tutorials.",
};

export default function LearnPage() {
  return (
    <div className="container max-w-6xl py-8 space-y-8">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Learn</h1>
        <p className="text-xl text-muted-foreground max-w-2xl">
          Master the cube. Choose a puzzle below to explore our step-by-step tutorials and algorithm sets.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {MOCK_LEARN_DATA.map((puzzle) => (
          <PuzzleCard key={puzzle.id} puzzle={puzzle} />
        ))}
      </div>
    </div>
  );
}
