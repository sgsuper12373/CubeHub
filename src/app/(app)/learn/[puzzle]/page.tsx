import { MOCK_LEARN_DATA } from "@/lib/learn/mock-data";
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
  const puzzleData = MOCK_LEARN_DATA.find((p) => p.id === resolvedParams.puzzle);
  
  if (!puzzleData) {
    return { title: "Not Found | CubeHub" };
  }

  return {
    title: `${puzzleData.name} Tutorials | CubeHub`,
    description: puzzleData.description,
  };
}

export default async function PuzzleSeriesPage({ params }: Props) {
  const resolvedParams = await params;
  const puzzleData = MOCK_LEARN_DATA.find((p) => p.id === resolvedParams.puzzle);

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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {puzzleData.series.map((series) => (
          <SeriesCard key={series.id} puzzleId={puzzleData.id} series={series} />
        ))}
      </div>
    </div>
  );
}
