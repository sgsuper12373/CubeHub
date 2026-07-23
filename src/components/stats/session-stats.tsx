"use client";

import { BarChart3, Star } from "lucide-react";

import { formatAverage, formatMs } from "@/lib/timer/format";
import {
  bestSingle,
  effectiveMs,
  sessionMean,
  wcaAverage,
  worstSingle,
} from "@/lib/timer/stats";
import type { Solve } from "@/lib/timer/types";
import { cn } from "@/lib/utils";

/**
 * The session's stats as a vertical list — the tall left column of the default
 * dashboard. Singles up top (with a ★ on the personal best), a divider, then
 * the trimmed WCA averages. Teal marks the headline numbers a cuber glances at
 * first (solve count, best single, current Ao5); the rest are white.
 *
 * The horizontal `StatTiles` strip still serves the mobile stats drawer, where
 * a wide-and-short shape fits better.
 */
export function SessionStats({ solves }: { solves: Solve[] }) {
  if (solves.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-4 py-6 text-center">
        <BarChart3 className="size-8 text-muted-foreground/25" aria-hidden />
        <p className="max-w-[15rem] text-sm text-balance text-muted-foreground">
          Complete your first solve to see your stats.
        </p>
      </div>
    );
  }

  const count = solves.length;
  const valid = solves.reduce(
    (n, s) => n + (effectiveMs(s) !== null ? 1 : 0),
    0,
  );
  const best = bestSingle(solves);
  const worst = worstSingle(solves);
  const mean = sessionMean(solves);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-auto px-3 py-1">
      <Row label="Solves" value={`${valid}/${count}`} accent />
      <Row label="Mean" value={mean !== null ? formatMs(mean) : "—"} />
      <Row
        label="Best"
        value={best !== null ? formatMs(best) : "—"}
        accent
        star
      />
      <Row label="Worst" value={worst !== null ? formatMs(worst) : "—"} />
      <div className="my-1.5 border-t border-border/60" />
      <Row label="Ao5" value={formatAverage(wcaAverage(solves, 5))} accent />
      <Row label="Ao12" value={formatAverage(wcaAverage(solves, 12))} />
      <Row label="Ao50" value={formatAverage(wcaAverage(solves, 50))} />
      <Row label="Ao100" value={formatAverage(wcaAverage(solves, 100))} />
    </div>
  );
}

function Row({
  label,
  value,
  accent = false,
  star = false,
}: {
  label: string;
  value: string;
  /** Teal value — a headline metric. */
  accent?: boolean;
  /** Personal-best star on the label. */
  star?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        {star && (
          <Star
            className="size-3 fill-timer-ready text-timer-ready"
            aria-label="personal best"
          />
        )}
        {label}
      </span>
      <span
        className={cn(
          "font-mono text-sm font-semibold tabular-nums",
          accent ? "text-timer-ready" : "text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}
