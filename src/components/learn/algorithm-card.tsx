"use client";

import { AlgorithmCaseMock } from "@/lib/learn/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, CheckCircle2, Play } from "lucide-react";
import { cn } from "@/lib/utils";

export function AlgorithmCard({ algCase }: { algCase: AlgorithmCaseMock }) {
  return (
    <Card className={cn(
      "overflow-hidden transition-colors hover:border-primary/50", 
      algCase.learned && "bg-muted/20 border-muted-foreground/20"
    )}>
      <CardContent className="p-0 flex flex-col sm:flex-row h-full">
        {/* Left side: Content & Actions */}
        <div className="flex-1 p-4 flex flex-col justify-between order-2 sm:order-1 border-t sm:border-t-0 sm:border-r border-border/50">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className={cn("font-semibold text-base", algCase.learned && "text-muted-foreground")}>
                {algCase.name}
              </h3>
              <div className="flex items-center gap-1 -mr-2">
                <Button variant="ghost" size="icon-sm" className={cn(algCase.starred ? "text-yellow-500 hover:text-yellow-600 hover:bg-yellow-500/10" : "text-muted-foreground")}>
                  <Star className={cn("h-4 w-4", algCase.starred && "fill-current")} />
                  <span className="sr-only">Star</span>
                </Button>
                <Button variant="ghost" size="icon-sm" className={cn(algCase.learned ? "text-green-500 hover:text-green-600 hover:bg-green-500/10" : "text-muted-foreground")}>
                  <CheckCircle2 className={cn("h-4 w-4", algCase.learned && "fill-current")} />
                  <span className="sr-only">Mark Learned</span>
                </Button>
              </div>
            </div>
            
            <div className={cn(
              "p-2.5 rounded-md font-mono text-sm tracking-wide break-words border border-border/50",
              algCase.learned ? "bg-muted/20 text-muted-foreground" : "bg-muted/40 text-foreground/90"
            )}>
              {algCase.moves}
            </div>
          </div>
          
          <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
            <Button variant={algCase.learned ? "ghost" : "secondary"} size="sm" className="w-full sm:w-auto font-medium">
              <Play className="h-3.5 w-3.5 mr-2" />
              Train Case
            </Button>
          </div>
        </div>

        {/* Right side: Visualizer */}
        <div className="w-full sm:w-[140px] shrink-0 bg-muted/5 p-4 flex items-center justify-center order-1 sm:order-2 aspect-[2/1] sm:aspect-auto">
          {/* Placeholder for 2D top-down view */}
          <div className={cn(
            "w-16 h-16 sm:w-20 sm:h-20 border-2 border-border/80 rounded-md flex items-center justify-center shadow-sm",
            algCase.learned ? "bg-muted/50 opacity-50" : "bg-background"
          )}>
            <span className="text-[10px] text-muted-foreground font-medium text-center leading-tight px-1">2D View</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
