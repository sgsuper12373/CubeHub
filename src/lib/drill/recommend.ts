import { formatMs } from "@/lib/timer/format";

import type { StatsByAlgorithm, VariantStats } from "./types";

/**
 * When to tell a user to switch algorithm variants.
 *
 * Only on evidence: both variants need MIN_SUCCESSES clean reps, and the
 * alternative's median must be clearly faster both relatively (SWITCH_RATIO)
 * and absolutely (MIN_GAIN_MS). A 30 ms edge on ten reps is noise, and telling
 * someone to relearn an algorithm on noise costs them weeks.
 */
export const MIN_SUCCESSES = 10;
export const SWITCH_RATIO = 0.95;
export const MIN_GAIN_MS = 100;
/** Once the current variant is well measured, suggest measuring an untried one. */
export const TRY_AFTER_SUCCESSES = 20;

export type Recommendation =
  | { kind: "switch"; current: VariantStats; better: VariantStats; gainMs: number }
  | { kind: "try"; current: VariantStats; alternativeId: string };

/**
 * @param currentId  the variant the user drills now
 * @param variantIds every approved variant of the case, in display order
 */
export function recommendSwitch(
  currentId: string,
  variantIds: readonly string[],
  stats: StatsByAlgorithm,
): Recommendation | null {
  const current = stats.get(currentId);
  if (!current || current.successes < MIN_SUCCESSES || current.medianMs === null) return null;

  let better: VariantStats | null = null;
  for (const id of variantIds) {
    if (id === currentId) continue;
    const alt = stats.get(id);
    if (!alt || alt.successes < MIN_SUCCESSES || alt.medianMs === null) continue;
    const gain = current.medianMs - alt.medianMs;
    if (alt.medianMs <= current.medianMs * SWITCH_RATIO && gain >= MIN_GAIN_MS) {
      if (better === null || alt.medianMs < (better.medianMs ?? Infinity)) better = alt;
    }
  }
  if (better) {
    return { kind: "switch", current, better, gainMs: current.medianMs - (better.medianMs ?? 0) };
  }

  if (current.successes >= TRY_AFTER_SUCCESSES) {
    const untried = variantIds.find(
      (id) => id !== currentId && (stats.get(id)?.successes ?? 0) < MIN_SUCCESSES,
    );
    if (untried) return { kind: "try", current, alternativeId: untried };
  }
  return null;
}

function seconds(ms: number): string {
  return `${formatMs(ms)}s`;
}

function times(n: number): string {
  return n === 1 ? "once" : `${n} times`;
}

/** The sentence the Drill Lab shows, e.g. "You have used … 34 times, median 1.82s. …" */
export function recommendationText(
  rec: Recommendation,
  movesById: ReadonlyMap<string, string>,
): string {
  const currentMoves = movesById.get(rec.current.algorithmId) ?? "your current algorithm";
  const used = `You have used ${currentMoves} ${times(rec.current.attempts)}, median ${seconds(rec.current.medianMs ?? 0)}.`;

  if (rec.kind === "switch") {
    const betterMoves = movesById.get(rec.better.algorithmId) ?? "the alternative";
    return (
      `${used} You have used the alternative ${betterMoves} ${times(rec.better.attempts)}, ` +
      `median ${seconds(rec.better.medianMs ?? 0)}. Consider switching.`
    );
  }
  const altMoves = movesById.get(rec.alternativeId) ?? "an alternative";
  return `${used} Try ${altMoves} for ${MIN_SUCCESSES} reps to see whether it is faster for you.`;
}
