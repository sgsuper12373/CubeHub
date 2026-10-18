import { countedSolves, countsForRecords } from "./misfire";
import { bestAverageOfN, bestSingle, effectiveMs, windowStat, type WindowSize } from "./stats";
import { formatAverageText, formatSingleText } from "./share-text";
import type { PbCategory, PersonalBest, Solve, TimerPuzzle } from "./types";

/**
 * What a new solve just achieved: a session best, or an all-time personal
 * best. Pure, so it is tested without a store or a timer.
 *
 * Only the windows that END at the new solve can be new records, so each
 * category is one window computation, compared against the best before it.
 */

/** The categories the timer celebrates. Ao50/Ao100 records are rare and quiet. */
export const RECORD_CATEGORIES = ["single", "mean3", "ao5", "ao12"] as const;
export type RecordCategory = (typeof RECORD_CATEGORIES)[number];

export const RECORD_WINDOW: Record<Exclude<RecordCategory, "single">, WindowSize> = {
  mean3: 3,
  ao5: 5,
  ao12: 12,
};

export const RECORD_LABEL: Record<RecordCategory, string> = {
  single: "Single",
  mean3: "Mo3",
  ao5: "Ao5",
  ao12: "Ao12",
};

/**
 * An all-time best as the timer knows it. `confirmed` is false for a value the
 * timer only learned during this visit, before any history existed for the
 * category (a brand-new cuber's first Ao5): beating that is a session best,
 * not a reason for confetti.
 */
export interface KnownBest {
  timeMs: number;
  confirmed: boolean;
}

export type KnownBests = Partial<Record<PbCategory, KnownBest>>;

export interface RecordHit {
  category: RecordCategory;
  scope: "session" | "allTime";
  timeMs: number;
  /** The record it beat, in the same scope. */
  previousMs: number;
  /** The solves behind it, newest first: one for a single, n for an average. */
  solves: Solve[];
}

/** Bests loaded from the repo are history, so they are confirmed. */
export function knownBestsFrom(bests: PersonalBest[]): KnownBests {
  const known: KnownBests = {};
  for (const b of bests) known[b.category] = { timeMs: b.timeMs, confirmed: true };
  return known;
}

/**
 * @param previous the session's solves before the new one, newest first
 * @param solve    the solve just recorded
 * @param known    all-time bests before the new solve
 * @returns the hits, plus the all-time bests updated to include the new solve
 */
export function detectRecords(
  previous: Solve[],
  solve: Solve,
  known: KnownBests,
): { hits: RecordHit[]; known: KnownBests } {
  // Records count only the solves that count, like the PB triggers: an
  // excluded solve (a flagged mis-stop) is never a record, and windows close
  // over the solves around it.
  if (!countsForRecords(solve)) return { hits: [], known };
  previous = countedSolves(previous);

  const next = [solve, ...previous];
  const updated: KnownBests = { ...known };
  const hits: RecordHit[] = [];

  for (const category of RECORD_CATEGORIES) {
    let value: number | null;
    let sessionBefore: number | null;
    let solves: Solve[];

    if (category === "single") {
      value = effectiveMs(solve);
      sessionBefore = bestSingle(previous);
      solves = [solve];
    } else {
      const n = RECORD_WINDOW[category];
      const stat = windowStat(next, n);
      value = typeof stat === "number" ? stat : null;
      sessionBefore = bestAverageOfN(previous, n)?.timeMs ?? null;
      solves = next.slice(0, n);
    }
    if (value === null) continue;

    const allTime = known[category];
    if (allTime && allTime.confirmed && value < allTime.timeMs) {
      hits.push({ category, scope: "allTime", timeMs: value, previousMs: allTime.timeMs, solves });
    } else if (sessionBefore !== null && value < sessionBefore) {
      hits.push({ category, scope: "session", timeMs: value, previousMs: sessionBefore, solves });
    }

    if (!allTime || value < allTime.timeMs) {
      updated[category] = { timeMs: value, confirmed: allTime?.confirmed ?? false };
    }
  }

  return { hits, known: updated };
}

/** A record as paste-ready text: the solve and scramble, or the whole window. */
export function recordText(hit: RecordHit, puzzle: TimerPuzzle, when?: Date): string {
  if (hit.category === "single") return formatSingleText(hit.solves[0], puzzle, when);
  return formatAverageText(hit.solves, RECORD_WINDOW[hit.category], puzzle, when) ?? "";
}
