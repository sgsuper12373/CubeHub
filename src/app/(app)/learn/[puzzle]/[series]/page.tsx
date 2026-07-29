import { MOCK_LEARN_DATA } from "@/lib/learn/mock-data";
import { AlgorithmCard } from "@/components/learn/algorithm-card";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Play, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface Props {
  params: Promise<{
    puzzle: string;
    series: string;
  }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const puzzleData = MOCK_LEARN_DATA.find((p) => p.id === resolvedParams.puzzle);
  const seriesData = puzzleData?.series.find((s) => s.id === resolvedParams.series);
  
  if (!seriesData || !puzzleData) {
    return { title: "Not Found | CubeHub" };
  }

  return {
    title: `${seriesData.name} | CubeHub`,
    description: seriesData.description,
  };
}

export default async function SeriesCasesPage({ params }: Props) {
  const resolvedParams = await params;
  const puzzleData = MOCK_LEARN_DATA.find((p) => p.id === resolvedParams.puzzle);
  const seriesData = puzzleData?.series.find((s) => s.id === resolvedParams.series);

  if (!seriesData || !puzzleData) {
    notFound();
  }

  const totalCases = seriesData.cases.length;
  const learnedCases = seriesData.cases.filter((c) => c.learned).length;
  const progressPercent = totalCases > 0 ? Math.round((learnedCases / totalCases) * 100) : 0;

  return (
    <div className="container max-w-7xl py-8 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4 flex-1">
          <Button variant="ghost" size="sm" render={<Link href={`/learn/${puzzleData.id}`} />} nativeButton={false} className="-ml-3 text-muted-foreground">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to {puzzleData.name}
          </Button>
          
          <h1 className="text-4xl font-bold tracking-tight">{seriesData.name}</h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            {seriesData.description}
          </p>
        </div>
        
        <div className="shrink-0 flex items-center gap-3">
          <Button variant="outline" className="hidden sm:flex">
            <LayoutGrid className="mr-2 h-4 w-4" />
            Filters
          </Button>
          <Button size="lg" className="w-full sm:w-auto font-semibold">
            <Play className="mr-2 h-4 w-4" />
            Train Set
          </Button>
        </div>
      </div>

      {/* Progress Section */}
      {totalCases > 0 && (
        <div className="bg-muted/30 border border-border/50 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between text-sm font-medium">
              <span>Your Progress</span>
              <span>{learnedCases} / {totalCases} learned ({progressPercent}%)</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
          <p className="text-sm text-muted-foreground sm:max-w-[200px] text-right">
            Keep drilling cases to improve your recognition speed.
          </p>
        </div>
      )}

      {/* Grid Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {seriesData.cases.map((algCase) => (
          <AlgorithmCard key={algCase.id} algCase={algCase} />
        ))}
      </div>
      
      {totalCases === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-border/50 rounded-lg text-muted-foreground">
          <p>No cases have been added to this module yet.</p>
        </div>
      )}
    </div>
  );
}
