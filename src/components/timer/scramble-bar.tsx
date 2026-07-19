"use client";

import { Check, Copy, Shuffle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
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
  const moves = alg.trim().split(/\s+/);

  return (
    <p
      aria-label={`Scramble: ${alg}`}
      className="flex max-w-2xl flex-wrap items-center justify-center gap-y-1 text-center font-mono text-base leading-relaxed text-foreground md:text-lg"
    >
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
  onNext,
  onCopy,
}: {
  alg: string | null;
  generating: boolean;
  puzzle: TimerPuzzle;
  onNext: () => void;
  onCopy: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyResetRef.current) clearTimeout(copyResetRef.current);
    };
  }, []);

  return (
    <div className="flex min-h-20 flex-col items-center justify-center gap-2 px-4 pt-6">
      {alg === null ? (
        <div
          className="h-6 w-64 max-w-full animate-pulse rounded-md bg-muted"
          aria-label="generating scramble"
        />
      ) : (
        <ScrambleTokens alg={alg} />
      )}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`New ${puzzle === "222" ? "2x2" : "3x3"} scramble`}
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
      </div>
    </div>
  );
}
