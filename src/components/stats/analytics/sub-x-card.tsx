"use client";

import { barrierLabel, subXByPeriod, subXRate } from "@/lib/timer/practice-stats";
import type { SolveMetric } from "@/lib/timer/types";
import { cn } from "@/lib/utils";

const pct = (rate: number) => `${Math.round(rate * 100)}%`;

/**
 * Sub-X: cubers think in barriers (sub-30, sub-20, sub-15), so the headline is
 * the share of solves under the goal, this 30 days against the 30 before,
 * with a bar per 30-day period in the range. The goal is the cuber's pick,
 * or the next barrier under their current Ao12.
 */
export function SubXCard({
  counted,
  goalMs,
  options,
  suggested,
  onGoal,
  now,
}: {
  /** When the data was loaded; the periods count back from it. */
  now: number;
  /** Counted solves in the range, newest first. */
  counted: SolveMetric[];
  goalMs: number;
  /** Barriers to offer in the picker. */
  options: number[];
  /** True when the goal is the suggestion, not a pick. */
  suggested: boolean;
  /** A new goal; null goes back to the suggestion. */
  onGoal: (ms: number | null) => void;
}) {
  const label = barrierLabel(goalMs);
  const periods = subXByPeriod(counted, goalMs, now);
  const latest = periods.at(-1);
  const previous = periods.at(-2);
  const rangeRate = subXRate(counted, goalMs);

  let headline: string;
  let detail: string | null = null;
  let trend: "up" | "down" | null = null;
  if (latest && latest.rate !== null) {
    headline = `${pct(latest.rate)} of solves ${label} in the last 30 days`;
    if (previous && previous.rate !== null) {
      const diff = Math.round(latest.rate * 100) - Math.round(previous.rate * 100);
      trend = diff > 0 ? "up" : diff < 0 ? "down" : null;
      detail =
        diff === 0
          ? `Same as the 30 days before (${pct(previous.rate)}).`
          : `${diff > 0 ? "Up" : "Down"} from ${pct(previous.rate)} the 30 days before.`;
    }
  } else {
    headline = rangeRate === null ? `No solves to measure ${label}` : `${pct(rangeRate)} of solves in this range ${label}`;
  }

  return (
    <section className="flex flex-col rounded-lg border border-border bg-card p-4" aria-labelledby="subx-heading">
      <header className="mb-2 flex items-center justify-between gap-2">
        <h2 id="subx-heading" className="text-sm font-semibold text-foreground">
          Goal
        </h2>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="sr-only">Goal barrier</span>
          <select
            value={suggested ? "suggested" : String(goalMs)}
            onChange={(e) => onGoal(e.target.value === "suggested" ? null : Number(e.target.value))}
            className="rounded-md border border-border bg-card px-1.5 py-1 text-xs font-medium text-foreground"
          >
            <option value="suggested">{suggested ? `${label} (suggested)` : "Suggested"}</option>
            {options.map((ms) => (
              <option key={ms} value={ms}>
                {barrierLabel(ms)}
              </option>
            ))}
          </select>
        </label>
      </header>

      <p className="text-sm font-medium text-foreground" data-testid="subx-headline">
        {headline}
      </p>
      {detail && (
        <p className={cn("mt-0.5 text-xs", trend === "up" ? "text-success" : trend === "down" ? "text-warning" : "text-muted-foreground")}>
          {detail}
        </p>
      )}

      {periods.length >= 2 && (
        <div className="mt-3">
          <div className="flex h-16 items-end gap-1" role="img" aria-label={`Share of solves ${label} per 30 days, oldest first: ${periods.map((p) => (p.rate === null ? "no solves" : pct(p.rate))).join(", ")}`}>
            {periods.map((p, i) => (
              <div
                key={p.to}
                title={p.rate === null ? "No solves" : `${pct(p.rate)} of ${p.solves} solves`}
                className={cn(
                  "flex-1 rounded-t-sm",
                  i === periods.length - 1 ? "bg-chart-1" : "bg-chart-1/45",
                )}
                style={{ height: `${Math.max(p.rate === null ? 0 : 4, (p.rate ?? 0) * 100)}%` }}
              />
            ))}
          </div>
          <p className="mt-1 flex justify-between text-[0.65rem] text-muted-foreground">
            <span>{periods.length * 30} days ago</span>
            <span>Last 30 days</span>
          </p>
        </div>
      )}
    </section>
  );
}
