"use client";

import { ArrowDown, ArrowUp } from "lucide-react";

import { formatAverage, formatMs } from "@/lib/timer/format";
import { formatDuration } from "@/lib/timer/next-solve";
import { windowStat } from "@/lib/timer/stats";
import type { SolveMetric } from "@/lib/timer/types";
import { cn } from "@/lib/utils";

/**
 * Where the cuber is now, before the all-time bests: current Ao5, Ao12 and
 * Ao100 over the newest counted solves of the event, whatever session they're
 * in, each against the same average as it stood 30 days ago; then solves and
 * time spent solving in the selected range.
 *
 * Rolling across sessions on purpose (docs/stats-plan.md): it answers "what's
 * my level now". Personal bests stay per session, as the database keeps them.
 */
export function NowStrip({
  recent,
  monthAgo,
  rangeSolves,
  rangeTimeMs,
  rangeLabel,
}: {
  /** Counted solves, newest first, any session (up to 100 needed). */
  recent: SolveMetric[];
  /** Counted solves from before 30 days ago, newest first. */
  monthAgo: SolveMetric[];
  rangeSolves: number;
  rangeTimeMs: number;
  /** How the range reads in a sentence, e.g. "in 30 days". */
  rangeLabel: string;
}) {
  return (
    <section
      aria-label="Now"
      className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-card p-4 sm:grid-cols-3 lg:grid-cols-5"
    >
      <header className="col-span-full flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-sm font-semibold text-foreground">Now</h2>
        <p className="text-xs text-muted-foreground">
          Your newest solves across sessions · change vs 30 days ago
        </p>
      </header>
      {([5, 12, 100] as const).map((n) => (
        <AverageTile key={n} n={n} now={windowStat(recent, n)} then={windowStat(monthAgo, n)} />
      ))}
      <Tile label="Solves" value={rangeSolves.toLocaleString()} note={rangeLabel} />
      <Tile
        label="Time solving"
        value={formatDuration(rangeTimeMs)}
        note={rangeLabel}
        className="col-span-2 sm:col-span-1"
      />
    </section>
  );
}

function AverageTile({
  n,
  now,
  then,
}: {
  n: 5 | 12 | 100;
  now: number | "DNF" | null;
  then: number | "DNF" | null;
}) {
  const label = `Ao${n}`;
  if (now === null) {
    return <Tile label={label} value="—" note={`Needs ${n} solves`} />;
  }
  const delta = typeof now === "number" && typeof then === "number" ? now - then : null;
  return (
    <div className="flex flex-col gap-1 rounded-lg px-3 py-2.5 ring-1 ring-inset ring-foreground/10">
      <span className="text-[0.6rem] font-medium tracking-wider text-muted-foreground uppercase">
        {label}
      </span>
      <span className="font-mono text-lg font-semibold text-foreground tabular-nums">
        {formatAverage(now)}
      </span>
      {delta === null ? (
        <span className="text-[0.65rem] text-muted-foreground">No average 30 days ago</span>
      ) : delta === 0 ? (
        <span className="text-[0.65rem] text-muted-foreground">Same as 30 days ago</span>
      ) : (
        <span
          className={cn(
            "flex items-center gap-0.5 text-[0.65rem] font-medium",
            delta < 0 ? "text-success" : "text-warning",
          )}
        >
          {delta < 0 ? <ArrowDown className="size-3" aria-hidden /> : <ArrowUp className="size-3" aria-hidden />}
          {delta < 0 ? "down" : "up"} {formatMs(Math.abs(delta))} s
        </span>
      )}
    </div>
  );
}

function Tile({
  label,
  value,
  note,
  className,
}: {
  label: string;
  value: string;
  note: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1 rounded-lg px-3 py-2.5 ring-1 ring-inset ring-foreground/10", className)}>
      <span className="text-[0.6rem] font-medium tracking-wider text-muted-foreground uppercase">
        {label}
      </span>
      <span className="font-mono text-lg font-semibold text-foreground tabular-nums">{value}</span>
      <span className="text-[0.65rem] text-muted-foreground">{note}</span>
    </div>
  );
}
