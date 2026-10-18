/**
 * The trend chart's points, worked out apart from the drawing so they can be
 * tested. Pure, like scale.ts.
 */

import { effectiveMs, rollingAverages } from "@/lib/timer/stats";
import type { PersonalBest, SolveMetric } from "@/lib/timer/types";

export type TrendPoint = {
  id: string;
  /** Position among all plotted solves, oldest first (the "by solve" axis). */
  idx: number;
  /** createdAt in epoch ms (the "by date" axis). */
  t: number;
  createdAt: string;
  /** Effective time, null for a DNF. For a mis-stop, its raw time. */
  single: number | null;
  /** A flagged mis-stop: left out, drawn hollow, no averages. */
  flagged: boolean;
  ao5: number | "DNF" | null;
  ao12: number | "DNF" | null;
};

/**
 * Counted solves and flagged mis-stops on one time line. Averages come from
 * the counted solves only, as everywhere else, and sit on their own solves.
 *
 * @param counted newest first, as the repositories return them
 * @param flagged newest first; drawn but never averaged
 */
export function buildTrendPoints(counted: SolveMetric[], flagged: SolveMetric[]): TrendPoint[] {
  const ao5 = rollingAverages(counted, 5);
  const ao12 = rollingAverages(counted, 12);
  const points: Omit<TrendPoint, "idx">[] = [
    ...counted.map((m, i) => ({
      id: m.id,
      t: Date.parse(m.createdAt),
      createdAt: m.createdAt,
      single: effectiveMs(m),
      flagged: false,
      ao5: ao5[i],
      ao12: ao12[i],
    })),
    ...flagged.map((m) => ({
      id: m.id,
      t: Date.parse(m.createdAt),
      createdAt: m.createdAt,
      single: m.timeMs,
      flagged: true,
      ao5: null,
      ao12: null,
    })),
  ];
  points.sort((a, b) => a.t - b.t || (a.id < b.id ? -1 : 1));
  return points.map((p, idx) => ({ ...p, idx }));
}

export type PbMark = { id: string; category: "single" | "ao5" | "ao12"; ms: number };

/** Stars for the all-time PBs whose solve is on the chart. */
export function pbMarks(points: TrendPoint[], bests: PersonalBest[]): PbMark[] {
  const onChart = new Set(points.filter((p) => !p.flagged).map((p) => p.id));
  const marks: PbMark[] = [];
  for (const b of bests) {
    if ((b.category === "single" || b.category === "ao5" || b.category === "ao12") && b.solveId && onChart.has(b.solveId)) {
      marks.push({ id: b.solveId, category: b.category, ms: b.timeMs });
    }
  }
  return marks;
}

/** The point nearest to a data-space x value, among `points` (sorted by `xOf`). */
export function nearestPoint<T>(points: T[], value: number, xOf: (p: T) => number): T | null {
  if (points.length === 0) return null;
  let lo = 0;
  let hi = points.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (xOf(points[mid]) < value) lo = mid;
    else hi = mid;
  }
  return Math.abs(xOf(points[lo]) - value) <= Math.abs(xOf(points[hi]) - value) ? points[lo] : points[hi];
}
