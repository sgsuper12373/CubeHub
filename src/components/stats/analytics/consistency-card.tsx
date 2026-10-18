"use client";

import { Info } from "lucide-react";

import { Sparkline } from "@/components/stats/sparkline";
import { formatMs } from "@/lib/timer/format";
import { spreadTrend } from "@/lib/timer/practice-stats";
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
 * is the thing a cuber can feel. The band leads (most cubers don't think in
 * σ); the formula is in a tooltip, and a small line of σ per 25 solves shows
 * whether they're getting steadier.
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
  const trend = spreadTrend(metrics);
  const formula = `σ is the standard deviation of your last ${counted} solves: ${formatMs(sigma)}, which is ${(cv * 100).toFixed(1)}% of your ${formatMs(mean)} mean. The band reads that percentage.`;
  const steadier = trend.length >= 2 ? trend[trend.length - 1] < trend[0] : null;

  return (
    <section className="flex flex-col rounded-lg border border-border bg-card p-4">
      <header className="mb-3">
        <h2 className="text-sm font-semibold text-foreground">Consistency</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Spread over your last {counted} solve{counted === 1 ? "" : "s"}
        </p>
      </header>

      <p className="text-lg font-semibold text-foreground">{band.label}</p>
      <p className="mt-0.5 text-xs text-balance text-muted-foreground">{band.hint}</p>

      <p className="mt-2 flex items-center gap-1.5 font-mono text-sm tabular-nums text-muted-foreground">
        <span>σ {formatMs(sigma)}</span>
        <span title={formula} className="inline-flex cursor-help" tabIndex={0} aria-label={formula}>
          <Info className="size-3.5" aria-hidden />
        </span>
      </p>

      {trend.length >= 2 && (
        <div className="mt-3">
          <p className="text-[0.65rem] text-muted-foreground">
            Spread per 25 solves, oldest first{steadier === null ? "" : steadier ? " · getting steadier" : " · getting looser"}
          </p>
          <Sparkline
            points={trend}
            className="mt-1 max-h-12"
            ariaLabel={`Spread per 25 solves, oldest first: ${trend.map((t) => formatMs(t)).join(", ")}`}
          />
        </div>
      )}
    </section>
  );
}
