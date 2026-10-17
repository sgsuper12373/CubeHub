"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Box, Check, GraduationCap, Play } from "lucide-react";
import type { AlgorithmCase } from "@/lib/learn/dal";
import { Button, buttonVariants } from "@/components/ui/button";
import { AlgLine } from "@/components/learn/algorithm-card";
import { AlgPlayer } from "@/components/learn/alg-player";
import { CaseViewer } from "@/components/learn/case-viewer";
import { FaceletViewer } from "@/components/learn/facelet-viewer";
import { toggleAlgorithmBookmark } from "@/lib/learn/actions";
import { caseDiagram, mainAlgorithm } from "@/lib/learn/case-diagram";
import { isPlaygroundPuzzle } from "@/lib/playground/puzzles";
import { announceUnlocks, toUnlocks } from "@/lib/profile/achievements";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toast-store";
import { useLearnMode } from "@/components/learn/use-learn-mode";

/** Where Learn mode goes after this case: the next unlearned one in the list. */
export type NextUnlearned = { caseNumber: number; heading: string; href: string };

/**
 * The body of a case page: the 3D player, the recognition diagram, every
 * algorithm (pick one to play it), and the same actions as the case card.
 * Used on the case page and in the list's side panel, so the layout follows
 * its container's width, not the viewport's.
 *
 * With Learn mode on, marking the case learned goes on to `nextUnlearned`:
 * through `onSelectCase` in the panel, or by navigating to its href.
 */
export function CaseDetail({
  algCase,
  puzzle,
  nextUnlearned = null,
  onSelectCase,
}: {
  algCase: AlgorithmCase;
  puzzle: string;
  nextUnlearned?: NextUnlearned | null;
  onSelectCase?: (caseNumber: number) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [learnMode, setLearnMode] = useLearnMode();
  const router = useRouter();
  const mainAlg = mainAlgorithm(algCase);
  const [selectedId, setSelectedId] = useState(mainAlg?.id ?? null);

  const algorithms = mainAlg
    ? [mainAlg, ...algCase.algorithms.filter((a) => a !== mainAlg)]
    : [];
  const selected = algorithms.find((a) => a.id === selectedId) ?? mainAlg;
  const diagram = caseDiagram(algCase);

  const advances = learnMode && !algCase.learned;

  const handleToggleLearned = () => {
    if (!mainAlg) return;
    const marking = !algCase.learned;
    startTransition(async () => {
      const unlocks = await toggleAlgorithmBookmark(mainAlg.id, marking);
      announceUnlocks(toUnlocks(unlocks));
      if (!marking || !learnMode) return;
      if (!nextUnlearned) {
        toast({ kind: "info", message: "That's every case here learned. Nice work!", durationMs: 4000 });
      } else if (onSelectCase) {
        onSelectCase(nextUnlearned.caseNumber);
      } else {
        router.push(nextUnlearned.href);
      }
    });
  };

  return (
    <div className="@container">
      <div className="grid gap-6 @3xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* Player */}
        <div className="flex h-fit flex-col items-center gap-3">
          {selected ? (
            <>
              <AlgPlayer
                moves={selected.moves}
                setupMoves={algCase.setup_moves}
                puzzle={puzzle}
                size={280}
              />
              <p className="w-full break-words text-center font-mono text-sm text-muted-foreground">
                {selected.moves}
              </p>
            </>
          ) : (
            <p className="py-16 text-sm text-muted-foreground">
              No algorithm has been added for this case yet.
            </p>
          )}
        </div>

        <div className="min-w-0 space-y-6">
          {/* Recognition */}
          {diagram.kind !== "none" && (
            <section aria-labelledby="recognition" className="flex items-center gap-4">
              <div className="grid size-28 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-background/60">
                {diagram.kind === "facelets" ? (
                  <FaceletViewer cubeState={diagram.state} size={96} />
                ) : (
                  <CaseViewer
                    {...(diagram.kind === "algorithm"
                      ? { algorithm: diagram.moves }
                      : { cubeState: diagram.moves })}
                    puzzle={puzzle}
                    size={96}
                    visualization="experimental-2D-LL"
                  />
                )}
              </div>
              <div className="min-w-0 space-y-1">
                <h2 id="recognition" className="text-sm font-semibold">
                  Recognition
                </h2>
                <p className="text-sm text-muted-foreground">
                  The last layer as you&apos;ll see it before the algorithm, from the top.
                </p>
              </div>
            </section>
          )}

          {/* Algorithms */}
          {algorithms.length > 0 && (
            <section aria-labelledby="algorithms" className="space-y-3">
              <h2 id="algorithms" className="text-sm font-semibold">
                {algorithms.length > 1 ? `${algorithms.length} algorithms` : "Algorithm"}
                {algorithms.length > 1 && (
                  <span className="font-normal text-muted-foreground"> · pick one to play it</span>
                )}
              </h2>
              <ul className="space-y-2">
                {algorithms.map((a) => {
                  const active = a.id === selected?.id;
                  return (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(a.id)}
                        aria-pressed={active}
                        className={cn(
                          "w-full rounded-lg border p-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                          active
                            ? "border-primary/40 bg-primary/5"
                            : "border-transparent hover:bg-muted/40",
                        )}
                      >
                        <AlgLine
                          moves={a.moves}
                          label={a === mainAlg ? "Main" : (a.label ?? undefined)}
                          emphasised={a === mainAlg}
                        />
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {a.move_count} moves
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Actions: the same as the case card */}
          <div className="flex flex-wrap items-center gap-2 border-t border-border/50 pt-4">
            {mainAlg && (
              <Button
                variant={algCase.learned ? "outline" : "default"}
                onClick={handleToggleLearned}
                disabled={isPending}
                title={
                  advances && nextUnlearned
                    ? `Mark learned, then go to ${nextUnlearned.heading}`
                    : undefined
                }
              >
                <Check className={cn("mr-1.5 h-4 w-4", algCase.learned && "text-success")} />
                {algCase.learned ? "Learned" : "Mark Learned"}
                {advances && nextUnlearned && <ArrowRight className="ml-1.5 h-4 w-4" />}
              </Button>
            )}
            {mainAlg && isPlaygroundPuzzle(puzzle) && (
              <Link
                href={`/playground?puzzle=${puzzle}&case=${encodeURIComponent(mainAlg.moves)}`}
                className={buttonVariants({ variant: "ghost" })}
              >
                <Box className="mr-1.5 h-4 w-4" />
                Try it
              </Link>
            )}
            <Link
              href={`/learn/${puzzle}/drill?case=${algCase.id}`}
              className={cn(buttonVariants({ variant: "secondary" }), "ml-auto")}
            >
              <Play className="mr-1.5 h-4 w-4" />
              Drill this case
            </Link>
          </div>

          {mainAlg && (
            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border/50 bg-muted/20 p-3 text-sm">
              <input
                type="checkbox"
                checked={learnMode}
                onChange={(e) => setLearnMode(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-primary"
              />
              <span className="space-y-0.5">
                <span className="flex items-center gap-1.5 font-medium">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  Learn mode
                </span>
                <span className="block text-xs text-muted-foreground">
                  {nextUnlearned
                    ? `Marking a case learned takes you to the next one to learn: ${nextUnlearned.heading}.`
                    : "Marking a case learned takes you to the next one to learn."}
                </span>
              </span>
            </label>
          )}
        </div>
      </div>
    </div>
  );
}
