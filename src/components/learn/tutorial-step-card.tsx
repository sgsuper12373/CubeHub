"use client";

import { useTransition } from "react";
import { TutorialStep } from "@/lib/learn/dal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { CaseViewer } from "@/components/learn/case-viewer";
import { toggleTutorialStepProgress } from "@/lib/learn/actions";

interface TutorialStepCardProps {
  step: TutorialStep;
  puzzle?: string;
  stepIndex: number;
  totalSteps: number;
}

export function TutorialStepCard({
  step,
  puzzle = "333",
  stepIndex,
  totalSteps,
}: TutorialStepCardProps) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    startTransition(() => {
      toggleTutorialStepProgress(step.id, !step.completed);
    });
  };

  const scrollToStep = (targetIndex: number) => {
    const el = document.getElementById(`step-${targetIndex + 1}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <Card
      id={`step-${stepIndex + 1}`}
      className={cn(
        "overflow-hidden transition-colors border-border/50 scroll-mt-24",
        step.completed && "bg-muted/10 border-muted-foreground/20",
      )}
    >
      <CardContent className="p-0 flex flex-col h-full">
        {/* Header with Title and Mark Complete */}
        <div className="flex items-center justify-between p-4 border-b border-border/50 bg-muted/20">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold">
              {stepIndex + 1}
            </span>
            <h3
              className={cn(
                "font-semibold text-lg",
                step.completed && "text-muted-foreground",
              )}
            >
              {step.title}
            </h3>
          </div>
          <Button
            variant={step.completed ? "secondary" : "default"}
            size="sm"
            className="font-medium"
            onClick={handleToggle}
            disabled={isPending}
          >
            <CheckCircle2
              className={cn(
                "h-4 w-4 mr-2",
                step.completed && "text-success",
              )}
            />
            {step.completed ? "Completed" : "Mark Complete"}
          </Button>
        </div>

        {/* Body with Markdown content & optional 3D cube visualizer */}
        <div className="flex flex-col md:flex-row">
          <div className="flex-1 p-6 prose prose-sm sm:prose-base dark:prose-invert max-w-none">
            <div className="whitespace-pre-wrap font-sans leading-relaxed text-foreground/90">
              {step.content_md}
            </div>
          </div>

          {step.cube_state && (
            <div className="w-full md:w-[220px] shrink-0 bg-muted/5 p-6 flex flex-col items-center justify-start border-t md:border-t-0 md:border-l border-border/50">
              <CaseViewer
                cubeState={step.cube_state}
                puzzle={puzzle}
                size={140}
                visualization="3D"
              />
              <span className="text-xs text-muted-foreground mt-4 font-medium text-center">
                Target State
              </span>
            </div>
          )}
        </div>

        {/* Footer Navigation: Previous / Next Step */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-border/50 bg-muted/10">
          {stepIndex > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => scrollToStep(stepIndex - 1)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous Step
            </Button>
          ) : (
            <div />
          )}

          {stepIndex < totalSteps - 1 ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => scrollToStep(stepIndex + 1)}
            >
              Next Step
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">Final Step</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
