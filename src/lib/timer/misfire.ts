import type { TimerPuzzle } from "./types";

/**
 * Which solves count for records, and which look like mis-stops. Mirrors
 * supabase/migrations/20261021000000_misstops.sql (`solve_counts`,
 * `misstop_limit_ms`, `backfill_misstops`); keep the two in step.
 *
 * A solve counts unless it's excluded. Nothing is left out by a time rule the
 * cuber can't override: a suspected mis-stop is saved excluded (reason
 * "auto_misstop") and the cuber can mark it real. Excluded solves stay in the
 * session list but are skipped by personal bests, averages, badges, levels
 * and the Stats charts.
 */

/** Implausible rule: a raw time (before any +2) well below the world record. */
export const MISSTOP_LIMIT_MS: Record<TimerPuzzle, number> = {
  "333": 2000,
  "222": 300,
  "333oh": 4000,
  "444": 12000,
  "555": 25000,
  pyra: 500,
  skewb: 500,
  mega: 18000,
};

/** Relative rule: under this share of the recent median… */
export const MISSTOP_RATIO = 0.5;
/** …of the last this many counted solves for the puzzle, across sessions… */
export const MISSTOP_WINDOW = 50;
/** …once there are at least this many. */
export const MISSTOP_MIN_SOLVES = 12;

export type MisstopRule = "implausible" | "relative";

/** Median of raw times; the mean of the middle two for an even count (as `percentile_cont(0.5)`). */
export function median(times: readonly number[]): number | null {
  if (times.length === 0) return null;
  const sorted = [...times].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * The median the relative rule compares against, or null until there are
 * enough solves. `recentCountedTimes` is newest first; only the first
 * `MISSTOP_WINDOW` are used.
 */
export function misstopMedian(recentCountedTimes: readonly number[]): number | null {
  const window = recentCountedTimes.slice(0, MISSTOP_WINDOW);
  return window.length >= MISSTOP_MIN_SOLVES ? median(window) : null;
}

/**
 * Which rule, if any, flags a raw time as a suspected mis-stop.
 *
 * @param recentCountedTimes raw times of the cuber's recent counted solves for
 *   the puzzle, newest first: not excluded, not DNF, any session.
 */
export function suspectedMisstop(
  puzzle: TimerPuzzle,
  timeMs: number,
  recentCountedTimes: readonly number[],
): MisstopRule | null {
  if (timeMs < (MISSTOP_LIMIT_MS[puzzle] ?? 500)) return "implausible";
  const m = misstopMedian(recentCountedTimes);
  if (m !== null && timeMs < MISSTOP_RATIO * m) return "relative";
  return null;
}

/** Whether a solve counts for records: only its exclusion decides. */
export function countsForRecords(solve: { excluded?: boolean }): boolean {
  return !solve.excluded;
}

/** The solves that count, in the order given. */
export function countedSolves<T extends { excluded?: boolean }>(solves: T[]): T[] {
  return solves.filter(countsForRecords);
}

/** A flagged solve that its owner hasn't marked real (the "Mis-stop?" tag). */
export function isFlaggedMisstop(solve: { excluded?: boolean; excludedReason?: string }): boolean {
  return !!solve.excluded && solve.excludedReason === "auto_misstop";
}

/**
 * Run both rules in order over solves that were never flagged (an import),
 * as the database backfill does: oldest first per puzzle, each judged on the
 * counted solves before it. Solves already excluded or confirmed are kept as
 * they are. Returns new objects; the input order is kept.
 */
export function flagMisstops<
  T extends {
    puzzle: TimerPuzzle;
    timeMs: number;
    penalty: string;
    createdAt: string;
    excluded?: boolean;
    excludedReason?: "user" | "auto_misstop";
    misstopConfirmed?: boolean;
  },
>(solves: T[]): T[] {
  const order = solves
    .map((s, i) => i)
    .sort((a, b) => (solves[a].createdAt < solves[b].createdAt ? -1 : solves[a].createdAt > solves[b].createdAt ? 1 : a - b));
  const recent = new Map<TimerPuzzle, number[]>();
  const out = [...solves];
  for (const i of order) {
    const s = solves[i];
    if (s.excluded || s.penalty === "dnf") continue;
    const times = recent.get(s.puzzle) ?? [];
    if (!s.misstopConfirmed && suspectedMisstop(s.puzzle, s.timeMs, times)) {
      out[i] = { ...s, excluded: true, excludedReason: "auto_misstop" };
    } else {
      recent.set(s.puzzle, [s.timeMs, ...times].slice(0, MISSTOP_WINDOW));
    }
  }
  return out;
}

/**
 * Drill Lab: a rep faster than 60 ms a move (over 16 turns a second, never
 * under 0.30) is a misfire. Mirrors `drill_misfire_limit_ms` in
 * 20261019000000_solve_sanity.sql, which keeps such reps out of the variant
 * medians.
 */
export function drillMisfireLimitMs(moveCount: number): number {
  return Math.max(300, moveCount * 60);
}
