import type { TimerEventId } from "@/lib/timer/events";

/**
 * Levels (docs/profile.md, C12): a "Sub-20" style badge per event, worked out
 * from the best Ao12 timed on CubeHub (typed-in times don't count, as for the
 * speed achievements). Nobody can set it by hand.
 *
 * Each ladder runs from a beginner's milestone to elite, in seconds; harder
 * events have longer ladders' worth of time.
 */
export const LEVEL_LADDERS: Record<TimerEventId, readonly number[]> = {
  "333": [60, 40, 30, 20, 15, 12, 10, 8],
  "222": [20, 15, 10, 8, 6, 5, 4, 3],
  "444": [180, 120, 90, 60, 50, 40, 35, 30],
  "555": [300, 180, 150, 120, 90, 75, 60],
  "333oh": [90, 60, 40, 30, 25, 20, 15],
  pyra: [20, 15, 10, 8, 6, 5, 4, 3],
  skewb: [20, 15, 10, 8, 6, 5, 4, 3],
  mega: [300, 180, 120, 90, 75, 60, 50, 40],
};

export type Level = {
  /** "Sub-20", or "Sub-1:30" past a minute. */
  label: string;
  /** 1-based rung reached, out of `of`. */
  tier: number;
  of: number;
};

function secondsLabel(s: number): string {
  if (s < 60) return String(s);
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return rest === 0 ? `${m}:00` : `${m}:${String(rest).padStart(2, "0")}`;
}

/** The tightest rung the Ao12 is strictly under, or null (no Ao12, or slower than every rung). */
export function levelFor(event: string, ao12Ms: number | null | undefined): Level | null {
  const ladder = LEVEL_LADDERS[event as TimerEventId];
  if (!ladder || ao12Ms == null) return null;
  let reached = -1;
  ladder.forEach((s, i) => {
    if (ao12Ms < s * 1000) reached = i;
  });
  if (reached === -1) return null;
  return { label: `Sub-${secondsLabel(ladder[reached])}`, tier: reached + 1, of: ladder.length };
}

export const METHODS = [
  { value: "beginner", label: "Beginner" },
  { value: "cfop", label: "CFOP" },
  { value: "roux", label: "Roux" },
  { value: "zz", label: "ZZ" },
  { value: "petrus", label: "Petrus" },
  { value: "other", label: "Other" },
] as const;

export type MethodValue = (typeof METHODS)[number]["value"];

export function isMethod(v: string): v is MethodValue {
  return METHODS.some((m) => m.value === v);
}

export function methodLabel(v: string | null): string | null {
  return METHODS.find((m) => m.value === v)?.label ?? null;
}
