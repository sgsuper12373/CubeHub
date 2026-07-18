import type { Solve } from "./types";

type SolveTimes = Pick<Solve, "timeMs" | "penalty" | "effectiveTimeMs">;

/**
 * The effective (penalty-aware) time of a solve, or null for DNF.
 *
 * Cloud rows carry the DB generated column and it is returned untouched.
 * Local-only rows have no DB to compute it, so this is the single place in
 * the app allowed to mirror the `solves.effective_time_ms` CASE expression:
 * NULL for DNF, time + 2000 for +2, else the raw time.
 */
export function effectiveMs(solve: SolveTimes): number | null {
  if (solve.penalty === "dnf") return null;
  if (solve.effectiveTimeMs !== null) return solve.effectiveTimeMs;
  return solve.penalty === "plus2" ? solve.timeMs + 2000 : solve.timeMs;
}

/** Best non-DNF single, or null with no counting solves. */
export function bestSingle(solves: SolveTimes[]): number | null {
  let best: number | null = null;
  for (const s of solves) {
    const t = effectiveMs(s);
    if (t !== null && (best === null || t < best)) best = t;
  }
  return best;
}

/** Plain mean of all non-DNF solves (informal session stat, not a WCA mean). */
export function sessionMean(solves: SolveTimes[]): number | null {
  let sum = 0;
  let count = 0;
  for (const s of solves) {
    const t = effectiveMs(s);
    if (t !== null) {
      sum += t;
      count += 1;
    }
  }
  return count === 0 ? null : Math.round(sum / count);
}

/**
 * WCA trimmed average over the most recent `n` solves (list is newest-first,
 * as kept by the session store): drop the single best and single worst, then
 * mean the rest, rounded to the nearest centisecond.
 *
 * DNF handling per WCA: a DNF counts as the worst solve, so one DNF is
 * dropped by the trim; two or more make the average itself "DNF".
 * Returns null while fewer than `n` solves exist.
 */
export function wcaAverage(
  solves: SolveTimes[],
  n: 5 | 12 | 50 | 100,
): number | "DNF" | null {
  if (solves.length < n) return null;

  const window = solves.slice(0, n);
  let dnfCount = 0;
  const times: number[] = [];
  for (const s of window) {
    const t = effectiveMs(s);
    if (t === null) dnfCount += 1;
    else times.push(t);
  }
  if (dnfCount >= 2) return "DNF";

  times.sort((a, b) => a - b);
  // Trim one best and one worst. With exactly one DNF, the DNF *is* the
  // worst, so only the best finite time is removed.
  const counting =
    dnfCount === 1 ? times.slice(1) : times.slice(1, times.length - 1);

  const mean = counting.reduce((sum, t) => sum + t, 0) / counting.length;
  return Math.round(mean / 10) * 10;
}
