"use client";

import { useState, useTransition } from "react";
import { AlgorithmCase } from "@/lib/learn/dal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Check, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { CaseViewer } from "@/components/learn/case-viewer";
import { FaceletViewer } from "@/components/learn/facelet-viewer";
import { AlgPlayer } from "@/components/learn/alg-player";
import { toggleAlgorithmBookmark } from "@/lib/learn/actions";
import Link from "next/link";

export function AlgorithmCard({
  algCase,
  puzzle = "333",
}: {
  algCase: AlgorithmCase;
  puzzle?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [isExpanded, setIsExpanded] = useState(false);

  const mainAlg =
    algCase.algorithms.find((a) => a.is_main) || algCase.algorithms[0];

  const handleToggleLearned = () => {
    if (!mainAlg) return;
    startTransition(() => {
      toggleAlgorithmBookmark(mainAlg.id, !algCase.learned);
    });
  };

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all duration-300 ease-out flex flex-col h-full border-white/5",
        !algCase.learned &&
          "hover:scale-[1.01] hover:shadow-[0_0_30px_-10px_rgba(var(--primary),0.3)] bg-gradient-to-br from-card/90 to-background backdrop-blur-md hover:border-primary/40",
        algCase.learned &&
          "bg-muted/10 border-white/5 hover:border-white/10 opacity-75 hover:opacity-100",
      )}
    >
      <CardContent className="p-0 flex flex-col sm:flex-row h-full relative z-10">
        {/* Left side: Content & Actions */}
        <div className="flex-1 p-5 flex flex-col justify-between order-2 sm:order-1">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-bold text-xl tracking-tight text-foreground/90">
                  {algCase.name}
                </h3>
                {algCase.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                    {algCase.description}
                  </p>
                )}
              </div>
            </div>

            {/* Algorithms */}
            <div className="space-y-3">
              {algCase.algorithms.map((alg, index) => (
                <div key={alg.id} className="group relative">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground/50 w-6">
                      #{index + 1}
                    </span>
                    <code className="flex-1 font-mono text-sm sm:text-base font-semibold tracking-wide bg-background/50 px-3 py-1.5 rounded border border-border/50 text-foreground/90">
                      {alg.moves}
                    </code>
                    {alg.is_main && (
                      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20">
                        Main
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Footer */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-border/50">
            <div className="flex items-center gap-2">
              <Button
                variant={algCase.learned ? "outline" : "default"}
                size="sm"
                className={cn(
                  "font-medium transition-all",
                  algCase.learned
                    ? "text-muted-foreground hover:text-foreground"
                    : "shadow-md",
                )}
                onClick={handleToggleLearned}
                disabled={isPending}
              >
                <Check
                  className={cn(
                    "h-4 w-4 mr-1.5",
                    algCase.learned && "text-green-500",
                  )}
                />
                {algCase.learned ? "Learned" : "Mark Learned"}
              </Button>

              {mainAlg && (
                <Button
                  variant={isExpanded ? "secondary" : "ghost"}
                  size="sm"
                  className="text-xs font-medium"
                  onClick={() => setIsExpanded((prev) => !prev)}
                  title={isExpanded ? "Hide 3D animation" : "Show 3D animation"}
                >
                  {isExpanded ? (
                    <>
                      <EyeOff className="h-3.5 w-3.5 mr-1.5" />
                      Hide 3D
                    </>
                  ) : (
                    <>
                      <Eye className="h-3.5 w-3.5 mr-1.5" />
                      Animate
                    </>
                  )}
                </Button>
              )}
            </div>

            <Link href={`/timer?train=${algCase.id}&puzzle=${puzzle}`}>
              <Button
                variant={algCase.learned ? "ghost" : "secondary"}
                size="sm"
                className="font-medium"
              >
                <Play className="h-3.5 w-3.5 mr-1.5" />
                Train Case
              </Button>
            </Link>
          </div>
        </div>

        {/* Right side: Visualization preview */}
        <div
          className={cn(
            "w-full sm:w-[160px] shrink-0 bg-black/20 border-l border-white/5 p-4 flex flex-col items-center justify-center order-1 sm:order-2 aspect-[2/1] sm:aspect-auto cursor-pointer hover:bg-black/30 transition-colors",
            algCase.learned && "grayscale-[0.5]",
          )}
          onClick={() => setIsExpanded((prev) => !prev)}
          title="Click to toggle 3D animation"
        >
          {algCase.cube_state && algCase.cube_state.length === 54 ? (
            <FaceletViewer cubeState={algCase.cube_state} size={100} />
          ) : algCase.cube_state ? (
            <CaseViewer
              cubeState={algCase.cube_state}
              puzzle={puzzle}
              size={100}
              visualization="experimental-2D-LL"
            />
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 border-2 border-border/80 rounded-md flex items-center justify-center shadow-sm bg-background">
              <span className="text-[10px] text-muted-foreground font-medium text-center leading-tight px-1">
                2D LL View
              </span>
            </div>
          )}

          {algCase.setup_moves && (
            <div className="mt-3 text-center w-full">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">
                Setup
              </span>
              <code className="text-[10px] font-mono bg-background/50 px-1.5 py-0.5 rounded text-foreground/80 border border-border/30 block break-words whitespace-pre-wrap">
                {algCase.setup_moves}
              </code>
            </div>
          )}
        </div>
      </CardContent>

      {/* Expandable 3D Animation Player */}
      {isExpanded && mainAlg && (
        <div className="p-4 border-t border-white/5 bg-black/30 animate-in fade-in-50 duration-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              3D Algorithm Animation
            </span>
            <span className="text-xs font-mono text-muted-foreground">
              {mainAlg.moves}
            </span>
          </div>
          <AlgPlayer
            moves={mainAlg.moves}
            setupMoves={algCase.setup_moves}
            puzzle={puzzle}
            size={180}
          />
        </div>
      )}
    </Card>
  );
}
