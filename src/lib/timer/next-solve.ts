import { windowStat, type WindowSize } from "./stats";
import type { PbCategory, Solve } from "./types";

type SolveTimes = Pick<Solve, "timeMs" | "penalty" | "effectiveTimeMs">;

/** The window each PB category averages over; a single is one solve. */
export const CATEGORY_WINDOW: Record<PbCategory, 1 | WindowSize> = {
  single: 1,
  mean3: 3,
  ao5: 5,
  ao12: 12,
  ao50: 50,
  ao100: 100,
};

/**
 * What the next solve needs to set a new personal best, as csTimer's stats
 * table shows it:
 * - `below`: any time under `ms` (effective, so after a +2) does it;
 * - `any`: any non-DNF time does it (csTimer's "∞");
 * - `none`: no time can (csTimer's "N/A");
 * - `more`: an average can't complete yet; `solves` more are needed first.
 */
export type NextSolveNeed =
  | { kind: "below"; ms: number }
  | { kind: "any" }
  | { kind: "none" }
  | { kind: "more"; solves: number };

/** Upper bound for the search: a solve slower than this is never better. */
const MAX_MS = 24 * 60 * 60 * 1000;

/**
 * @param category the PB category
 * @param session  the counted solves of the session the next solve goes into,
 *                 newest first (averages never cross sessions, like PBs)
 * @param pbMs     the current personal best for the category, or null if none
 */
export function nextSolveNeeds(
  category: PbCategory,
  session: SolveTimes[],
  pbMs: number | null,
): NextSolveNeed {
  const n = CATEGORY_WINDOW[category];
  if (n === 1) return pbMs === null ? { kind: "any" } : { kind: "below", ms: pbMs };

  const previous = session.slice(0, n - 1);
  if (previous.length < n - 1) return { kind: "more", solves: n - 1 - previous.length };

  // The average with x as the next solve. It never gets faster as x grows,
  // so the threshold is found by bisection.
  const averageWith = (x: number) =>
    windowStat([{ timeMs: x, penalty: "none", effectiveTimeMs: x }, ...previous], n);
  const beats = (x: number) => {
    const avg = averageWith(x);
    return typeof avg === "number" && (pbMs === null || avg < pbMs);
  };

  if (!beats(0)) return { kind: "none" };
  if (beats(MAX_MS)) return { kind: "any" };

  // Smallest x that no longer beats it: the next solve must be under x.
  let lo = 0; // beats
  let hi = MAX_MS; // doesn't
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (beats(mid)) lo = mid;
    else hi = mid;
  }
  return { kind: "below", ms: hi };
}

/** Total raw solving time (DNFs included: the time was still spent). */
export function timeSpentMs(solves: Pick<Solve, "timeMs">[]): number {
  return solves.reduce((sum, s) => sum + s.timeMs, 0);
}

/** "3 h 12 min", "45 min", "40 s". */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds} s`;
  const minutes = Math.round(totalSeconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
