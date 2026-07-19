"use client";

import { formatAverage, formatMs } from "@/lib/timer/format";

/**
 * The four headline stats + solve count. Pure display — the parent computes
 * these from the solves array via stats.ts selectors.
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
  return (
    <div className="flex w-full overflow-x-auto snap-x snap-mandatory gap-1 px-2 pb-1 scrollbar-none hide-scrollbar">
      <Tile label="Best" value={best !== null ? formatMs(best) : "—"} accent />
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
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col flex-1 min-w-[3.5rem] shrink-0 snap-start items-center rounded-lg bg-muted/50 px-1 py-2">
      <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span
        className={
          "font-mono text-sm font-semibold tabular-nums " +
          (accent ? "text-timer-ready" : "text-foreground")
        }
      >
        {value}
      </span>
    </div>
  );
}
