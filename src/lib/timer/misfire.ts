import type { TimerPuzzle } from "./types";

/**
 * Which solves count for records. Mirrors `misfire_limit_ms` and
 * `solve_counts` in supabase/migrations/20261019000000_solve_sanity.sql; keep
 * the two in step.
 *
 * A misfire is a raw time (before any +2) under the event's limit, a little
 * under the world-record single. An excluded solve is one its owner left out
 * from the solve detail. Neither counts for personal bests, averages, badges,
 * levels or the Stats charts; both stay in the session list.
 */
export const MISFIRE_LIMIT_MS: Record<TimerPuzzle, number> = {
  "333": 3000,
  "222": 400,
  "444": 15000,
  "555": 30000,
  "333oh": 5000,
  pyra: 700,
  skewb: 700,
  mega: 22000,
};

export function isMisfire(puzzle: TimerPuzzle, timeMs: number): boolean {
  return timeMs < (MISFIRE_LIMIT_MS[puzzle] ?? 1000);
}

export function countsForRecords(
  puzzle: TimerPuzzle,
  solve: { timeMs: number; excluded?: boolean },
): boolean {
  return !solve.excluded && !isMisfire(puzzle, solve.timeMs);
}

/** A session's solves that count (each solve carries its own event). */
export function countedSessionSolves<
  T extends { puzzle: TimerPuzzle; timeMs: number; excluded?: boolean },
>(solves: T[]): T[] {
  return solves.filter((s) => countsForRecords(s.puzzle, s));
}

/** The solves that count, in the order given. */
export function countedSolves<T extends { timeMs: number; excluded?: boolean }>(
  puzzle: TimerPuzzle,
  solves: T[],
): T[] {
  return solves.filter((s) => countsForRecords(puzzle, s));
}

/**
 * Drill Lab: a rep faster than 60 ms a move (over 16 turns a second, never
 * under 0.30) is a misfire. Mirrors `drill_misfire_limit_ms` in the same
 * migration, which keeps such reps out of the variant medians.
 */
export function drillMisfireLimitMs(moveCount: number): number {
  return Math.max(300, moveCount * 60);
}
