"use client";

import { useState, useTransition } from "react";
import { AlgorithmCase } from "@/lib/learn/dal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@base-ui/react/dialog";
import { Play, Check, Eye, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CaseViewer } from "@/components/learn/case-viewer";
import { FaceletViewer } from "@/components/learn/facelet-viewer";
import { AlgPlayer } from "@/components/learn/alg-player";
import { toggleAlgorithmBookmark } from "@/lib/learn/actions";
import { caseDiagram, mainAlgorithm } from "@/lib/learn/case-diagram";
import Link from "next/link";

export function AlgorithmCard({
  algCase,
  puzzle = "333",
}: {
  algCase: AlgorithmCase;
  puzzle?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);

  const mainAlg = mainAlgorithm(algCase);
  const diagram = caseDiagram(algCase);

  const handleToggleLearned = () => {
    if (!mainAlg) return;
    startTransition(() => {
      toggleAlgorithmBookmark(mainAlg.id, !algCase.learned);
    });
  };

  const openPlayer = () => setIsPlayerOpen(true);
  const alternatives = algCase.algorithms.filter((a) => a !== mainAlg);

  return (
    <Card
      className={cn(
        // The shared Card pads top and bottom; this card lays out its own rows.
        "h-full gap-0 py-0 transition-[border-color,box-shadow,opacity] duration-300 ease-out border border-border",
        !algCase.learned &&
          "hover:shadow-[0_0_30px_-10px_color-mix(in_oklch,var(--primary)_30%,transparent)] bg-gradient-to-br from-card/90 to-background hover:border-primary/40",
        algCase.learned &&
          "bg-muted/10 hover:border-foreground/20 opacity-75 hover:opacity-100",
      )}
    >
      <CardContent className="flex flex-1 flex-col p-0">
        {/* Header: case diagram + name */}
        <div className="flex items-center gap-4 p-5 pb-4">
          <button
            type="button"
            onClick={openPlayer}
            disabled={!mainAlg}
            aria-label={`Show 3D animation of ${algCase.name}`}
            title="Show 3D animation"
            className={cn(
              "grid size-24 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-background/60 transition-colors hover:bg-background/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              algCase.learned && "grayscale-[0.5]",
            )}
          >
            {diagram.kind === "facelets" ? (
              <FaceletViewer cubeState={diagram.state} size={80} />
            ) : diagram.kind === "none" ? (
              <span className="px-1 text-center text-[10px] font-medium leading-tight text-muted-foreground">
                2D LL View
              </span>
            ) : (
              <CaseViewer
                {...(diagram.kind === "algorithm"
                  ? { algorithm: diagram.moves }
                  : { cubeState: diagram.moves })}
                puzzle={puzzle}
                size={80}
                visualization="experimental-2D-LL"
              />
            )}
          </button>

          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="text-xl font-bold tracking-tight text-foreground/90">
              {algCase.name}
            </h3>
            {algCase.description && (
              <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                {algCase.description}
              </p>
            )}
          </div>
        </div>

        {/* Algorithms: the main one first, then any alternatives */}
        <div className="flex-1 space-y-2 px-5">
          {mainAlg && (
            <AlgLine
              moves={mainAlg.moves}
              label={alternatives.length > 0 ? "Main" : undefined}
              emphasised={alternatives.length > 0}
            />
          )}
          {alternatives.length > 0 && (
            <p className="pt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Alternatives
            </p>
          )}
          {alternatives.map((alg) => (
            <AlgLine key={alg.id} moves={alg.moves} />
          ))}

          {algCase.setup_moves && (
            <p className="break-words text-xs text-muted-foreground">
              <span className="mr-1.5 font-semibold uppercase tracking-wider">
                Setup
              </span>
              <code className="font-mono">{algCase.setup_moves}</code>
            </p>
          )}
        </div>

        {/* Action footer */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/50 px-5 py-3">
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
              className={cn("mr-1.5 h-4 w-4", algCase.learned && "text-success")}
            />
            {algCase.learned ? "Learned" : "Mark Learned"}
          </Button>

          {mainAlg && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs font-medium"
              onClick={openPlayer}
              title="Show 3D animation"
            >
              <Eye className="mr-1.5 h-3.5 w-3.5" />
              Animate
            </Button>
          )}

          <Button
            render={<Link href={`/learn/${puzzle}/drill?case=${algCase.id}`} />}
            nativeButton={false}
            variant={algCase.learned ? "ghost" : "secondary"}
            size="sm"
            className="ml-auto font-medium"
          >
            <Play className="mr-1.5 h-3.5 w-3.5" />
            Drill Case
          </Button>
        </div>
      </CardContent>

      {/* 3D player in a dialog, so opening it never resizes the grid row */}
      {mainAlg && (
        <Dialog.Root open={isPlayerOpen} onOpenChange={setIsPlayerOpen}>
          <Dialog.Portal>
            <Dialog.Backdrop className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
            <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-xl outline-none transition-all duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div className="min-w-0 space-y-1">
                  <Dialog.Title className="text-lg font-bold tracking-tight text-foreground">
                    {algCase.name}
                  </Dialog.Title>
                  <Dialog.Description className="break-words font-mono text-sm text-muted-foreground">
                    {mainAlg.moves}
                  </Dialog.Description>
                </div>
                <Dialog.Close
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      aria-label="Close"
                    />
                  }
                >
                  <X className="h-4 w-4" />
                </Dialog.Close>
              </div>
              <AlgPlayer
                moves={mainAlg.moves}
                setupMoves={algCase.setup_moves}
                puzzle={puzzle}
                size={240}
              />
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </Card>
  );
}

function AlgLine({
  moves,
  label,
  emphasised = false,
}: {
  moves: string;
  label?: string;
  emphasised?: boolean;
}) {
  return (
    <div className="space-y-1">
      {label && (
        <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
          {label}
        </p>
      )}
      <code
        className={cn(
          "block break-words rounded-md border px-3 py-1.5 font-mono font-semibold leading-relaxed tracking-wide text-foreground/90",
          emphasised
            ? "border-primary/30 bg-primary/5 text-sm sm:text-base"
            : "border-border/50 bg-background/50 text-sm",
        )}
      >
        {moves}
      </code>
    </div>
  );
}
