"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Copy, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { CubeLoader } from "@/components/ui/cube-loader";
import { copyWithToast } from "@/lib/timer/copy-text";
import { eventLabel } from "@/lib/timer/events";
import { formatMs, formatResult } from "@/lib/timer/format";
import { CATEGORY_WINDOW } from "@/lib/timer/next-solve";
import type { SolveRepository } from "@/lib/timer/repo";
import { formatAverageText, formatSingleText, WINDOW_LABEL } from "@/lib/timer/share-text";
import { trimmedIndices, type WindowSize } from "@/lib/timer/stats";
import type { PersonalBest, Solve, TimerPuzzle } from "@/lib/timer/types";
import { cn } from "@/lib/utils";

/**
 * The solves behind a personal best: oldest first, the trimmed ones in
 * brackets (as csTimer lists them), each with its scramble, and a Copy that
 * gives the same text as the timer's copy-average.
 */
export function PbDetail({
  repo,
  puzzle,
  best,
  onClose,
}: {
  repo: SolveRepository;
  puzzle: TimerPuzzle;
  /** The PB to show; null keeps the dialog closed. */
  best: PersonalBest | null;
  onClose: () => void;
}) {
  const n = best ? CATEGORY_WINDOW[best.category] : 1;
  const [loaded, setLoaded] = useState<{ id: string; solves: Solve[] | null } | null>(null);

  useEffect(() => {
    if (!best?.solveId) return;
    let cancelled = false;
    const id = best.solveId;
    repo
      .loadWindowSolves(id, n)
      .then((solves) => {
        if (!cancelled) setLoaded({ id, solves });
      })
      .catch((err) => {
        console.error("stats: PB solves failed", err);
        if (!cancelled) setLoaded({ id, solves: null });
      });
    return () => {
      cancelled = true;
    };
  }, [repo, best?.solveId, n]);

  const current = loaded && loaded.id === best?.solveId ? loaded : null;
  const solves = current?.solves ?? null;
  const complete = solves !== null && solves.length === n;
  const label = best ? (n === 1 ? "Single" : WINDOW_LABEL[n as WindowSize]) : "";
  const when = best ? new Date(best.achievedAt) : new Date();

  const copy = () => {
    if (!best || !solves || !complete) return;
    const text =
      n === 1 ? formatSingleText(solves[0], puzzle, when) : formatAverageText(solves, n as WindowSize, puzzle, when);
    if (text) void copyWithToast(text, label);
  };

  // Oldest first for reading; trimmed ones worked out on the newest-first window.
  const trimmed = solves && complete && n > 3 ? trimmedIndices(solves) : new Set<number>();
  const rows = solves ? solves.map((s, i) => ({ s, trimmed: trimmed.has(i) })).reverse() : [];

  return (
    <Dialog.Root
      open={best !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-border bg-card shadow-xl outline-none transition-all duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
          {best && (
            <>
              <div className="flex items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
                <div>
                  <Dialog.Title className="text-base font-semibold text-foreground">
                    {eventLabel(puzzle)} {label}{" "}
                    <span className="font-mono tabular-nums">{formatMs(best.timeMs)}</span>
                  </Dialog.Title>
                  <Dialog.Description className="mt-0.5 text-xs text-muted-foreground">
                    Personal best, set{" "}
                    {when.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    {n > 3 && " · trimmed solves in brackets"}
                  </Dialog.Description>
                </div>
                <Dialog.Close
                  aria-label="Close"
                  className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="size-4" />
                </Dialog.Close>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
                {current === null ? (
                  <div className="flex justify-center py-8">
                    <CubeLoader />
                  </div>
                ) : solves === null ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Couldn&apos;t load these solves. Try again in a moment.
                  </p>
                ) : (
                  <>
                    {!complete && (
                      <p className="mb-2 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                        Some solves behind this PB have been deleted or left out since, so the
                        list is incomplete.
                      </p>
                    )}
                    <ol className="divide-y divide-border/60" data-testid="pb-solves">
                      {rows.map(({ s, trimmed: isTrimmed }, i) => (
                        <li key={s.id} className="flex gap-3 py-2">
                          <span className="w-6 shrink-0 pt-0.5 text-right font-mono text-xs text-muted-foreground tabular-nums">
                            {i + 1}.
                          </span>
                          <div className="min-w-0 flex-1">
                            <span
                              className={cn(
                                "font-mono text-sm font-medium tabular-nums",
                                isTrimmed ? "text-muted-foreground" : "text-foreground",
                              )}
                            >
                              {isTrimmed ? `(${formatResult(s.timeMs, s.penalty)})` : formatResult(s.timeMs, s.penalty)}
                            </span>
                            {s.scramble && (
                              <p className="mt-0.5 break-words font-mono text-xs text-muted-foreground">
                                {s.scramble}
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </>
                )}
              </div>

              <div className="flex justify-end border-t border-border/60 px-5 py-3">
                <Button size="sm" variant="outline" disabled={!complete} onClick={copy}>
                  <Copy className="size-3.5" aria-hidden />
                  Copy as text
                </Button>
              </div>
            </>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
