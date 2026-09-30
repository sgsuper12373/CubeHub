import { getPuzzle } from "@/lib/learn/dal";
import { PuzzleHero } from "@/components/learn/puzzle-hero";
import { PuzzleSeriesList } from "@/components/learn/puzzle-series-list";
import { CTASection } from "@/components/learn/cta-section";
import { Metadata } from "next";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{
    puzzle: string;
  }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const puzzleData = await getPuzzle(resolvedParams.puzzle);
  
  if (!puzzleData) {
    return { title: "Not Found | CubeHub" };
  }

  return {
    title: `${puzzleData.name} | Learn | CubeHub`,
    description: puzzleData.description,
  };
}

export default async function PuzzleSeriesPage({ params }: Props) {
  const resolvedParams = await params;
  const puzzleData = await getPuzzle(resolvedParams.puzzle);

  if (!puzzleData) {
    notFound();
  }

  // The "New to solving?" CTA points at the puzzle's first tutorial series
  // (series are ordered by order_index), and is hidden if there is none.
  const beginnerSeries = puzzleData.series.find((s) => s.type === "tutorial");

  return (
    <div className="min-h-screen relative overflow-hidden bg-background pb-24">
      {/* Global Background Effects */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklch,var(--foreground)_7%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklch,var(--foreground)_7%,transparent)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-0 opacity-50" />
      <div className="absolute top-0 left-1/4 w-[1000px] h-[1000px] bg-accent-2/10 blur-[150px] rounded-full pointer-events-none opacity-20 z-0 mix-blend-screen" />
      
      <div className="container relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Top Hero Section */}
        <PuzzleHero puzzle={puzzleData} />

        {/* Series List with interactive filtering and search */}
        <PuzzleSeriesList puzzleId={puzzleData.id} series={puzzleData.series} />

        {/* Bottom CTA */}
        {beginnerSeries && (
          <CTASection href={`/learn/${puzzleData.id}/${beginnerSeries.slug}`} />
        )}
        
      </div>
    </div>
  );
}
