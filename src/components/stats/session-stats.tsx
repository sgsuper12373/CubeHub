"use client";

import { BarChart3, Copy, Star } from "lucide-react";

import { formatAverage, formatMs } from "@/lib/timer/format";
import {
  bestSingle,
  effectiveMs,
  meanOfN,
  sessionMean,
  wcaAverage,
  worstSingle,
} from "@/lib/timer/stats";
import { copyAverage } from "@/lib/timer/copy-text";
import type { WindowSize } from "@/lib/timer/stats";
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

  /** A copy handler while the window is full, so short rows stay plain text. */
  const copyFor = (n: WindowSize) => {
    if (solves.length < n) return undefined;
    return () => copyAverage(solves, n);
  };

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
      <Row label="Mo3" value={formatAverage(meanOfN(solves, 3))} onCopy={copyFor(3)} />
      <Row label="Ao5" value={formatAverage(wcaAverage(solves, 5))} accent onCopy={copyFor(5)} />
      <Row label="Ao12" value={formatAverage(wcaAverage(solves, 12))} onCopy={copyFor(12)} />
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
  onCopy,
}: {
  label: string;
  value: string;
  /** Teal value — a headline metric. */
  accent?: boolean;
  /** Personal-best star on the label. */
  star?: boolean;
  /** Makes the row a button that copies the average as text. */
  onCopy?: () => void;
}) {
  const labelEl = (
    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
      {star && (
        <Star
          className="size-3 fill-timer-ready text-timer-ready"
          aria-label="personal best"
        />
      )}
      {label}
    </span>
  );
  const valueEl = (
    <span
      className={cn(
        "font-mono text-sm font-semibold tabular-nums",
        accent ? "text-timer-ready" : "text-foreground",
      )}
    >
      {value}
    </span>
  );

  if (!onCopy) {
    return (
      <div className="flex items-center justify-between py-1.5">
        {labelEl}
        {valueEl}
      </div>
    );
  }
  return (
    <button
      type="button"
      title={`Copy ${label} as text`}
      aria-label={`Copy ${label} ${value} as text`}
      onClick={(e) => {
        // Blur so the next Space reaches the timer, not this button.
        e.currentTarget.blur();
        onCopy();
      }}
      className="group -mx-1.5 flex items-center justify-between rounded-md px-1.5 py-1.5 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      {labelEl}
      <span className="flex items-center gap-1.5">
        <Copy
          className="size-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          aria-hidden
        />
        {valueEl}
      </span>
    </button>
  );
}
