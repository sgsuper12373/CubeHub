import { getSeries, getPuzzle } from "@/lib/learn/dal";
import { AlgorithmCaseList } from "@/components/learn/algorithm-case-list";
import { TutorialStepCard } from "@/components/learn/tutorial-step-card";
import { StepToc } from "@/components/learn/step-toc";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Play, Lock } from "lucide-react";
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

  const progressPercent =
    totalItems > 0 ? Math.round((learnedItems / totalItems) * 100) : 0;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4 flex-1">
          <Button
            variant="ghost"
            size="sm"
            render={<Link href={`/learn/${puzzle.id}`} />}
            nativeButton={false}
            className="-ml-3 text-muted-foreground"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to {puzzle.name}
          </Button>

          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold tracking-tight">{series.name}</h1>
            {series.accessTier === "premium" && (
              <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-warning/10 text-warning border border-warning/20">
                <Lock className="h-3 w-3" />
                Premium
              </span>
            )}
            {series.accessTier === "free" && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                Free Account
              </span>
            )}
          </div>

          <p className="text-lg text-muted-foreground max-w-2xl">
            {series.description}
          </p>
        </div>

        {isAlgorithms && cases.length > 0 && (
          <div className="shrink-0 flex items-center gap-3">
            <Button
              render={
                <Link
                  href={`/learn/${encodeURIComponent(puzzle.id)}/drill?set=${encodeURIComponent(series.slug)}`}
                />
              }
              nativeButton={false}
              size="lg"
              className="w-full sm:w-auto font-semibold shadow-md"
            >
              <Play className="mr-2 h-4 w-4 fill-current" />
              Drill Set
            </Button>
          </div>
        )}
      </div>

      {/* Progress Section */}
      {totalItems > 0 && (
        <div className="bg-muted/30 border border-border/50 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between text-sm font-medium">
              <span>Your Progress</span>
              <span>
                {learnedItems} / {totalItems} completed ({progressPercent}%)
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
          <p className="text-sm text-muted-foreground sm:max-w-[240px] sm:text-right">
            {isAlgorithms
              ? "Keep drilling cases to improve your recognition and execution speed."
              : "Complete all steps to master this tutorial."}
          </p>
        </div>
      )}

      {/* Content Section */}
      {isAlgorithms ? (
        <AlgorithmCaseList cases={cases} puzzle={puzzle.id} />
      ) : (
        <div className="flex items-start gap-8">
          <div className="flex-1 space-y-6 min-w-0">
            {steps.map((step, idx) => (
              <TutorialStepCard
                key={step.id}
                step={step}
                puzzle={puzzle.id}
                stepIndex={idx}
                totalSteps={steps.length}
              />
            ))}
          </div>
          <StepToc steps={steps} />
        </div>
      )}

      {totalItems === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-border/50 rounded-2xl text-muted-foreground">
          <p>No content has been added to this module yet.</p>
        </div>
      )}
    </div>
  );
}
