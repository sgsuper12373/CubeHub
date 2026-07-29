import { getSeries, getPuzzle } from "@/lib/learn/dal";
import { AlgorithmCard } from "@/components/learn/algorithm-card";
import { TutorialStepCard } from "@/components/learn/tutorial-step-card";
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
  const data = await getSeries(resolvedParams.puzzle, resolvedParams.series);
  
  if (!data) {
    return { title: "Not Found | CubeHub" };
  }

  return {
    title: `${data.series.name} | CubeHub`,
    description: data.series.description,
  };
}

export default async function SeriesCasesPage({ params }: Props) {
  const resolvedParams = await params;
  const data = await getSeries(resolvedParams.puzzle, resolvedParams.series);
  const puzzle = await getPuzzle(resolvedParams.puzzle);

  if (!data || !puzzle) {
    notFound();
  }

  const { series, cases, steps } = data;
  const isAlgorithms = series.type === "algorithms";
  
  const totalItems = isAlgorithms ? cases.length : steps.length;
  const learnedItems = isAlgorithms 
    ? cases.filter((c) => c.learned).length 
    : steps.filter((s) => s.completed).length;
    
  const progressPercent = totalItems > 0 ? Math.round((learnedItems / totalItems) * 100) : 0;

  return (
    <div className="container max-w-7xl py-8 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4 flex-1">
          <Button variant="ghost" size="sm" render={<Link href={`/learn/${puzzle.id}`} />} nativeButton={false} className="-ml-3 text-muted-foreground">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to {puzzle.name}
          </Button>
          
          <h1 className="text-4xl font-bold tracking-tight">{series.name}</h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            {series.description}
          </p>
        </div>
        
        {isAlgorithms && (
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
        )}
      </div>

      {/* Progress Section */}
      {totalItems > 0 && (
        <div className="bg-muted/30 border border-border/50 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between text-sm font-medium">
              <span>Your Progress</span>
              <span>{learnedItems} / {totalItems} completed ({progressPercent}%)</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
          <p className="text-sm text-muted-foreground sm:max-w-[200px] text-right">
            {isAlgorithms 
              ? "Keep drilling cases to improve your recognition speed."
              : "Complete all steps to master this tutorial."}
          </p>
        </div>
      )}

      {/* Content Section */}
      {isAlgorithms ? (
        <div className="flex flex-wrap justify-center gap-4">
          {cases.map((algCase) => (
            <div key={algCase.id} className="w-full sm:w-[calc(50%-1rem)] xl:w-[400px]">
              <AlgorithmCard algCase={algCase} puzzle={puzzle.id} />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6 max-w-4xl mx-auto">
          {steps.map((step) => (
            <TutorialStepCard key={step.id} step={step} puzzle={puzzle.id} />
          ))}
        </div>
      )}
      
      {totalItems === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-border/50 rounded-lg text-muted-foreground">
          <p>No content has been added to this module yet.</p>
        </div>
      )}
    </div>
  );
}
