import { getPuzzle } from "@/lib/learn/dal";
import { SeriesCard } from "@/components/learn/series-card";
import { PuzzleHero } from "@/components/learn/puzzle-hero";
import { FilterBar } from "@/components/learn/filter-bar";
import { CTASection } from "@/components/learn/cta-section";
import { StaggeredGrid } from "@/components/learn/staggered-grid";
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

  return (
    <div className="min-h-screen relative overflow-hidden bg-learn-bg pb-24">
      {/* Global Background Effects */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-0 opacity-50" />
      <div className="absolute top-0 left-1/4 w-[1000px] h-[1000px] bg-learn-purple/10 blur-[150px] rounded-full pointer-events-none opacity-20 z-0 mix-blend-screen" />
      
      <div className="container relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Top Hero Section */}
        <PuzzleHero puzzle={puzzleData as any} />

        {/* Filter and Search Bar */}
        <FilterBar />

        {/* Series Cards Grid */}
        <div className="mt-8">
          {puzzleData.series.length > 0 ? (
            <StaggeredGrid>
              {puzzleData.series.map((series) => (
                <SeriesCard key={series.id} series={series as any} puzzleId={puzzleData.id} />
              ))}
            </StaggeredGrid>
          ) : (
            <div className="text-center py-24 border border-white/5 rounded-3xl bg-white/[0.02] backdrop-blur-md">
              <p className="text-lg text-muted-foreground">No tutorials or algorithms available yet.</p>
            </div>
          )}
        </div>

        {/* Bottom CTA */}
        <CTASection puzzleId={puzzleData.id} />
        
      </div>
    </div>
  );
}
