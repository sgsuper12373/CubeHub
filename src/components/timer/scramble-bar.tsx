"use client";

import { Check, Copy, PenLine, Shuffle, Undo2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { eventLabel } from "@/lib/timer/events";
import type { TimerPuzzle } from "@/lib/timer/types";
import { cn } from "@/lib/utils";

/** Moves per visual group. Four is one comfortable glance. */
const GROUP = 4;

/**
 * The scramble as evenly-spaced move tokens rather than one long string.
 *
 * Two things matter to a cuber here. Each move sits in a fixed-width cell, so
 * a given scramble always occupies the same shape and you can look away
 * mid-inspection and find your place again. And the `'`/`2` modifier is
 * dimmed so the face letter carries the weight, which is what the eye
 * actually tracks when turning.
 *
 * The tokens are hidden from assistive tech and the whole line is exposed as
 * one label, so a screen reader reads a clean scramble instead of twenty
 * disconnected fragments.
 */
function ScrambleTokens({ alg }: { alg: string }) {
  // Megaminx scrambles arrive as seven lines (WCA notation: each ends in U or
  // U'), and cubers read them line by line, so line breaks are kept.
  const lines = alg.trim().split(/\n+/).map((line) => line.trim().split(/\s+/));
  const moveCount = lines.reduce((n, line) => n + line.length, 0);
  // 4x4 and bigger run 40+ moves; a smaller size keeps them on a few rows.
  const long = moveCount > 30;

  return (
    <div
      aria-label={`Scramble: ${alg}`}
      className={cn(
        "flex min-h-0 flex-col items-center gap-y-1 overflow-y-auto text-center font-mono leading-relaxed text-foreground",
        long ? "max-w-3xl text-sm md:text-base" : "max-w-2xl text-base md:text-lg",
      )}
    >
      {lines.map((moves, l) => (
        <p key={l} className="flex flex-wrap items-center justify-center gap-y-1">
          {moves.map((move, i) => {
            const face = move[0];
            const modifier = move.slice(1);
            return (
              <span
                key={`${i}-${move}`}
                aria-hidden
                className={cn(
                  "inline-flex min-w-[2.5ch] justify-center tabular-nums",
                  // A wider gap every fourth move chunks the line without
                  // introducing a second visual element to parse.
                  i > 0 && i % GROUP === 0 ? "ml-3" : "ml-0.5",
                )}
              >
                {face}
                {modifier && (
                  <span className="text-muted-foreground">{modifier}</span>
                )}
              </span>
            );
          })}
        </p>
      ))}
    </div>
  );
}

/**
 * The scramble line with its actions. Purely presentational — the container
 * decides when it is visible and what the callbacks do. Fixed min-height so
 * swapping between shimmer and scramble text never shifts the layout.
 */
export function ScrambleBar({
  alg,
  generating,
  puzzle,
  custom = false,
  canPrevious = false,
  onNext,
  onCopy,
  onPrevious,
  onCustom,
}: {
  alg: string | null;
  generating: boolean;
  puzzle: TimerPuzzle;
  /** The scramble was pasted in rather than generated. */
  custom?: boolean;
  canPrevious?: boolean;
  onNext: () => void;
  onCopy: () => void;
  onPrevious?: () => void;
  onCustom?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyResetRef.current) clearTimeout(copyResetRef.current);
    };
  }, []);

  return (
    // max-h-full + a scrolling token list keep the buttons reachable when a
    // long scramble (5x5, Megaminx) is taller than the panel.
    <div className="flex max-h-full min-h-20 flex-col items-center justify-center gap-2 px-4 pt-6">
      {alg === null ? (
        <div
          role="status"
          className="h-6 w-64 max-w-full animate-pulse rounded-md bg-muted"
          aria-label="generating scramble"
        />
      ) : (
        <ScrambleTokens alg={alg} />
      )}
      <div className="flex shrink-0 items-center gap-1">
        {custom && (
          <span className="mr-1 rounded-full bg-muted px-2 py-0.5 text-[0.65rem] font-medium text-muted-foreground">
            Custom scramble
          </span>
        )}
        {onPrevious && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Previous scramble"
            title="Previous scramble (←)"
            disabled={!canPrevious}
            onClick={(e) => {
              e.currentTarget.blur();
              onPrevious();
            }}
          >
            <Undo2 />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          title="New scramble (→)"
          aria-label={`New ${eventLabel(puzzle)} scramble`}
          disabled={alg === null && generating}
          onClick={onNext}
        >
          <Shuffle />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Copy scramble"
          disabled={alg === null}
          onClick={() => {
            onCopy();
            setCopied(true);
            if (copyResetRef.current) clearTimeout(copyResetRef.current);
            copyResetRef.current = setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check className="text-timer-ready" /> : <Copy />}
        </Button>
        {onCustom && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Enter your own scramble"
            title="Enter your own scramble"
            onClick={(e) => {
              e.currentTarget.blur();
              onCustom();
            }}
          >
            <PenLine />
          </Button>
        )}
      </div>
    </div>
  );
}
