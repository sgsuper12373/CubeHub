"use client";

import { TutorialStep } from "@/lib/learn/dal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CaseViewer } from "@/components/learn/case-viewer";
import { useTransition } from "react";
import { toggleTutorialStepProgress } from "@/lib/learn/actions";
// Assuming you have a markdown rendering component, or we can just use dangerouslySetInnerHTML for now, 
// but it's better to use a dedicated markdown component if available. I'll use a basic div.

export function TutorialStepCard({ step, puzzle = "333" }: { step: TutorialStep; puzzle?: string }) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    startTransition(() => {
      toggleTutorialStepProgress(step.id, !step.completed);
    });
  };

  return (
    <Card className={cn(
      "overflow-hidden transition-colors border-border/50", 
      step.completed && "bg-muted/10 border-muted-foreground/20"
    )}>
      <CardContent className="p-0 flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b border-border/50 bg-muted/20">
          <h3 className={cn("font-semibold text-lg", step.completed && "text-muted-foreground")}>
            {step.order_index + 1}. {step.title}
          </h3>
          <Button 
            variant={step.completed ? "secondary" : "default"} 
            size="sm" 
            className="font-medium"
            onClick={handleToggle}
            disabled={isPending}
          >
            <CheckCircle2 className={cn("h-4 w-4 mr-2", step.completed && "text-green-500")} />
            {step.completed ? "Completed" : "Mark Complete"}
          </Button>
        </div>
        
        <div className="flex flex-col md:flex-row">
          <div className="flex-1 p-6 prose prose-sm sm:prose-base dark:prose-invert max-w-none">
             {/* A proper markdown renderer should be used here, but for simplicity we will just render the raw string with some basic spacing if needed, or if we expect HTML we can use dangerouslySetInnerHTML. The content is Markdown, so ideally `react-markdown`. I'll render the text directly for now, or assume it's pre-processed. Let's just output the markdown string for this prototype. */}
             <div className="whitespace-pre-wrap font-sans">
               {step.content_md}
             </div>
          </div>
          
          {step.cube_state && (
            <div className="w-full md:w-[200px] shrink-0 bg-muted/5 p-6 flex flex-col items-center justify-start border-t md:border-t-0 md:border-l border-border/50">
              <CaseViewer
                cubeState={step.cube_state}
                puzzle={puzzle}
                size={120}
                visualization="3D" // 3D is usually better for tutorials
              />
              <span className="text-xs text-muted-foreground mt-4 font-medium text-center">
                Target State
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
