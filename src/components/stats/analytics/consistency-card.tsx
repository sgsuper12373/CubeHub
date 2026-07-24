"use client";

import { formatMs } from "@/lib/timer/format";
import { sessionMean, stdDevMs } from "@/lib/timer/stats";
import type { SolveMetric } from "@/lib/timer/types";

/**
 * Consistency: the spread of the last 50 solves.
 *
 * A single value, so it is a **hero figure**, not a chart.
 *
 * σ alone is not comparable between cubers — a 4-second spread means something
 * very different at 12s than at 60s — so the band is read off the coefficient
 * of variation (σ ÷ mean) while the headline number stays σ in real time, which
 * is the thing a cuber can feel. Both are shown; neither is invented out of a
 * 0–100 score nobody can check.
 */

const WINDOW = 50;

const BANDS = [
  { max: 0.08, label: "Very consistent", hint: "Your times barely move." },
  { max: 0.12, label: "Consistent", hint: "A steady, repeatable solve." },
  { max: 0.18, label: "Variable", hint: "Good solves, but they come and go." },
  {
    max: Infinity,
    label: "Inconsistent",
    hint: "Big gaps between your best and worst.",
  },
];

export function ConsistencyCard({ metrics }: { metrics: SolveMetric[] }) {
  const sigma = stdDevMs(metrics, WINDOW);
  const mean = sessionMean(metrics.slice(0, WINDOW));
  const counted = Math.min(metrics.length, WINDOW);

  if (sigma === null || mean === null || mean === 0) {
    return (
      <section className="flex flex-col rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">Consistency</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Two counting solves needed before there is any spread to measure.
        </p>
      </section>
    );
  }

  const cv = sigma / mean;
  const band = BANDS.find((b) => cv < b.max) ?? BANDS[BANDS.length - 1];

  return (
    <section className="flex flex-col rounded-lg border border-border bg-card p-4">
      <header className="mb-3">
        <h2 className="text-sm font-semibold text-foreground">Consistency</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Spread over your last {counted} solve{counted === 1 ? "" : "s"}
        </p>
      </header>

      <p className="font-mono text-4xl font-semibold tabular-nums text-timer-ready">
        <span className="mr-1 text-2xl text-muted-foreground">σ</span>
        {formatMs(sigma)}
      </p>

      <p className="mt-2 text-sm font-medium text-foreground">{band.label}</p>
      <p className="mt-0.5 text-xs text-balance text-muted-foreground">
        {band.hint} That is {(cv * 100).toFixed(1)}% of your {formatMs(mean)}{" "}
        mean.
      </p>
    </section>
  );
}
