import { getPuzzle } from "@/lib/learn/dal";
import { SeriesCard } from "@/components/learn/series-card";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <div className="container max-w-6xl py-8 space-y-8">
      <div className="space-y-4">
        <Button variant="ghost" size="sm" render={<Link href="/learn" />} nativeButton={false} className="-ml-3 text-muted-foreground">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Puzzles
        </Button>
        <h1 className="text-4xl font-bold tracking-tight">{puzzleData.name}</h1>
        <p className="text-xl text-muted-foreground max-w-2xl">
          {puzzleData.description}
        </p>
      </div>

      {puzzleData.series.length > 0 ? (
        <div className="flex flex-wrap justify-center gap-6">
          {puzzleData.series.map((series) => (
            <div key={series.id} className="w-full sm:w-[calc(50%-1.5rem)] lg:w-[340px]">
              <SeriesCard series={series as any} puzzleId={puzzleData.id} />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border-2 border-dashed border-border/50 rounded-lg text-muted-foreground">
          <p>No tutorials or algorithms available for this puzzle yet.</p>
        </div>
      )}
    </div>
  );
}
