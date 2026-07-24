import type { Solve, SolveMetric } from "./types";

type SolveTimes = Pick<Solve, "timeMs" | "penalty" | "effectiveTimeMs">;

/** Enough of a solve to place it in time — what the Phase 2 helpers need. */
type TimeStamped = SolveTimes & Pick<SolveMetric, "createdAt">;

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

/** Worst non-DNF single, or null with no counting solves. */
export function worstSingle(solves: SolveTimes[]): number | null {
  let worst: number | null = null;
  for (const s of solves) {
    const t = effectiveMs(s);
    if (t !== null && (worst === null || t > worst)) worst = t;
  }
  return worst;
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

/**
 * The current Ao5 alongside the Ao5 as it stood one solve ago, so the UI can
 * show which way the average is trending.
 *
 * `previous` drops the newest solve and recomputes, which needs at least six
 * solves. `deltaMs` is only produced when both ends are finite — a "DNF"
 * average has no numeric distance from anything.
 *
 * Sign convention: positive means the average got *slower* (the time went up).
 * Note `wcaAverage` rounds to the nearest 10 ms, so deltas are quantised to
 * 10 ms and an unchanged average yields exactly 0.
 */
export function ao5Delta(solves: SolveTimes[]): {
  current: number | "DNF" | null;
  previous: number | "DNF" | null;
  deltaMs: number | null;
} {
  const current = wcaAverage(solves, 5);
  const previous = wcaAverage(solves.slice(1), 5);
  const deltaMs =
    typeof current === "number" && typeof previous === "number"
      ? current - previous
      : null;
  return { current, previous, deltaMs };
}

// ── Phase 2: analytics ─────────────────────────────────────────────────────
// Everything below reads the same newest-first ordering the store and the
// repositories hand out. That ordering is what makes the windows cheap:
// `list.slice(i)` starts at solve i and runs backwards in time, so the first
// `n` entries of that slice are exactly the window *ending* at solve i.

/**
 * The AoN as it stood at each solve, aligned index-for-index with the input.
 * Element `i` is the average of the n solves ending at solve `i` — `null` while
 * the window is short, `"DNF"` when two or more of them were DNFs.
 *
 * This is the overlay series for the trend chart. Callers plotting left-to-right
 * must reverse it alongside the solves, exactly as `session-trend.tsx` does.
 */
export function rollingAverages(
  solves: SolveTimes[],
  n: 5 | 12 | 50 | 100,
): (number | "DNF" | null)[] {
  return solves.map((_, i) => wcaAverage(solves.slice(i), n));
}

/**
 * Best AoN ever completed, with the solve that completed it — or null if no
 * full window exists.
 *
 * Windows never span a session boundary. A rolling average across two sittings
 * is meaningless to a cuber, and per-session is what csTimer does, which is what
 * these numbers get compared against. The database computes the cloud copy the
 * same way (`best_average_of_n` in the average-PB migration) and returns the
 * same three fields; the two are held to agreeing to the millisecond.
 *
 * Ties go to the earliest — the first time the cuber hit it, matching the DB.
 */
export function bestAverageOfN(
  solves: SolveMetric[],
  n: 5 | 12 | 50 | 100,
): { timeMs: number; solveId: string; achievedAt: string } | null {
  const bySession = new Map<string, SolveMetric[]>();
  for (const s of solves) {
    const list = bySession.get(s.sessionId);
    if (list) list.push(s);
    else bySession.set(s.sessionId, [s]);
  }

  let best: { timeMs: number; solveId: string; achievedAt: string } | null = null;
  for (const list of bySession.values()) {
    for (let i = 0; i + n <= list.length; i++) {
      const avg = wcaAverage(list.slice(i), n);
      if (typeof avg !== "number") continue;

      // The window runs backwards from solve `i`, so `i` is the solve that
      // completed the average.
      const candidate = {
        timeMs: avg,
        solveId: list[i].id,
        achievedAt: list[i].createdAt,
      };
      if (
        best === null ||
        candidate.timeMs < best.timeMs ||
        (candidate.timeMs === best.timeMs &&
          candidate.achievedAt < best.achievedAt)
      ) {
        best = candidate;
      }
    }
  }
  return best;
}

/**
 * Population standard deviation over the most recent `n` solves — the
 * consistency measure.
 *
 * Population (÷ N) rather than sample (÷ N−1): these solves are the whole thing
 * being described, not a sample drawn from some larger population of solves the
 * cuber might have done.
 *
 * DNFs are dropped rather than counted as a maximum. A DNF is a failure to
 * produce a time, not a slow time, and letting it inflate the spread would say
 * "inconsistent" when the honest reading is "didn't finish". Returns null with
 * fewer than two counting solves, where spread is undefined.
 */
export function stdDevMs(solves: SolveTimes[], n = 50): number | null {
  const times: number[] = [];
  for (const s of solves.slice(0, n)) {
    const t = effectiveMs(s);
    if (t !== null) times.push(t);
  }
  if (times.length < 2) return null;

  const mean = times.reduce((sum, t) => sum + t, 0) / times.length;
  const variance =
    times.reduce((sum, t) => sum + (t - mean) ** 2, 0) / times.length;
  return Math.round(Math.sqrt(variance));
}

export interface HistogramBucket {
  /** Inclusive lower edge, in ms. */
  fromMs: number;
  /** Exclusive upper edge, in ms. */
  toMs: number;
  count: number;
}

/**
 * Round bucket widths, chosen from a fixed ladder rather than computed, so the
 * axis reads "12.5s, 13.0s, 13.5s" and never "12.47s, 12.83s". The ladder is
 * picked to land near `targetBuckets` across the actual spread; a run with no
 * spread at all still returns one bucket rather than dividing by zero.
 *
 * DNFs are excluded — they have no time to bucket.
 */
export function histogramBuckets(
  solves: SolveTimes[],
  targetBuckets = 14,
): { bucketMs: number; buckets: HistogramBucket[] } {
  const LADDER = [
    50, 100, 250, 500, 1000, 2000, 2500, 5000, 10_000, 15_000, 30_000, 60_000,
  ];

  const times: number[] = [];
  for (const s of solves) {
    const t = effectiveMs(s);
    if (t !== null) times.push(t);
  }
  if (times.length === 0) return { bucketMs: LADDER[0], buckets: [] };

  const min = Math.min(...times);
  const max = Math.max(...times);
  const ideal = (max - min) / targetBuckets;
  const bucketMs =
    LADDER.find((w) => w >= ideal) ?? LADDER[LADDER.length - 1];

  const first = Math.floor(min / bucketMs) * bucketMs;
  const last = Math.floor(max / bucketMs) * bucketMs;

  const buckets: HistogramBucket[] = [];
  for (let edge = first; edge <= last; edge += bucketMs) {
    buckets.push({ fromMs: edge, toMs: edge + bucketMs, count: 0 });
  }
  for (const t of times) {
    const i = Math.floor((t - first) / bucketMs);
    buckets[Math.min(i, buckets.length - 1)].count += 1;
  }
  return { bucketMs, buckets };
}

export interface DayCount {
  /** `YYYY-MM-DD` in the viewer's own timezone. */
  day: string;
  count: number;
  /** Best counting single that day, or null if every solve was a DNF. */
  bestMs: number | null;
}

/**
 * Solves per calendar day, for the practice heatmap.
 *
 * Days are the user's *local* days, not UTC ones. A solve at 01:00 belongs to
 * the day the cuber was actually sitting there — bucketing by UTC would shift
 * an entire evening's practice onto the next square for anyone east of London,
 * which includes every user this product is being built for.
 */
export function dailyCounts(solves: TimeStamped[]): DayCount[] {
  const byDay = new Map<string, DayCount>();

  for (const s of solves) {
    const d = new Date(s.createdAt);
    if (Number.isNaN(d.getTime())) continue;
    // Local-time parts, zero-padded — not toISOString(), which is UTC.
    const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;

    const t = effectiveMs(s);
    const entry = byDay.get(day);
    if (entry) {
      entry.count += 1;
      if (t !== null && (entry.bestMs === null || t < entry.bestMs))
        entry.bestMs = t;
    } else {
      byDay.set(day, { day, count: 1, bestMs: t });
    }
  }

  return [...byDay.values()].sort((a, b) => (a.day < b.day ? -1 : 1));
}
