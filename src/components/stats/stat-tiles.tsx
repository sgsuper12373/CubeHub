"use client";

import { BarChart3, Star } from "lucide-react";

import { formatAverage, formatMs } from "@/lib/timer/format";
import { cn } from "@/lib/utils";

/**
 * The headline session metrics as a row of distinct, elevated cards (design
 * brief §4). Pure display — the parent computes these from the solves array
 * via stats.ts selectors.
 *
 * Best is the session PB: a teal value with a star. The rest are white values
 * over a muted label. The row scrolls horizontally when the panel is narrow
 * (the mobile drawer, a short sidebar) and each card snaps into place.
 *
 * With no solves yet, the whole rail becomes a single centred empty state
 * rather than a line of em dashes.
 */
export function StatTiles({
  best,
  ao5,
  ao12,
  ao50,
  ao100,
  mean,
  count,
}: {
  best: number | null;
  ao5: number | "DNF" | null;
  ao12: number | "DNF" | null;
  ao50: number | "DNF" | null;
  ao100: number | "DNF" | null;
  mean: number | null;
  count: number;
}) {
  if (count === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-4 py-6 text-center">
        <BarChart3 className="size-8 text-muted-foreground/25" aria-hidden />
        <p className="max-w-[15rem] text-sm text-muted-foreground text-balance">
          Complete your first solve to see your stats.
        </p>
      </div>
    );
  }

  return (
    <div className="hide-scrollbar flex w-full snap-x snap-mandatory gap-2 overflow-x-auto px-2 pb-1">
      <Tile label="Best" value={best !== null ? formatMs(best) : "—"} pb />
      <Tile label="Ao5" value={formatAverage(ao5)} />
      <Tile label="Ao12" value={formatAverage(ao12)} />
      <Tile label="Ao50" value={formatAverage(ao50)} />
      <Tile label="Ao100" value={formatAverage(ao100)} />
      <Tile label="Mean" value={mean !== null ? formatMs(mean) : "—"} />
      <Tile label="Solves" value={String(count)} />
    </div>
  );
}

function Tile({
  label,
  value,
  pb = false,
}: {
  label: string;
  value: string;
  /** The session personal best — accented teal, with a star. */
  pb?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-[4.25rem] flex-1 shrink-0 snap-start flex-col items-center gap-1 rounded-lg bg-card px-2 py-2.5 ring-1 ring-inset transition-colors",
        pb ? "ring-primary/30" : "ring-foreground/10",
      )}
    >
      <span className="flex items-center gap-1 text-[0.6rem] font-medium tracking-wider text-muted-foreground uppercase">
        {pb && (
          <Star
            className="size-2.5 fill-timer-ready text-timer-ready"
            aria-label="personal best"
          />
        )}
        {label}
      </span>
      <span
        className={cn(
          "font-mono text-sm font-semibold tabular-nums",
          pb ? "text-timer-ready" : "text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}
