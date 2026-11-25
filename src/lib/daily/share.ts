/**
 * The daily scramble's share line and streak (docs/home-plan.md → card 2,
 * "later"). Pure, so the exact text and the day arithmetic are unit-tested.
 */
import { addDays, formatDay } from "@/lib/daily/day";
import { formatResult } from "@/lib/timer/format";
import type { Penalty } from "@/lib/timer/types";

/**
 * Days in a row with a daily attempt, ending today or yesterday (a streak
 * isn't broken until today's daily closes). `days` in any order, duplicates ok.
 */
export function dailyStreak(days: readonly string[], today: string): number {
  const set = new Set(days);
  let day = set.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (set.has(day)) {
    n += 1;
    day = addDays(day, -1);
  }
  return n;
}

/**
 * The text a cuber shares: the day, their result and place, a streak once it
 * means something, and a link that opens the same scramble.
 *
 *   CuberHub daily scramble · Tue, 25 Nov
 *   12.34 · #3 of 41 · 5-day streak
 *   https://…/timer?daily=2026-11-25
 */
export function dailyShareText(input: {
  day: string;
  timeMs: number;
  penalty: Penalty;
  rank: number | null;
  solved: number | null;
  streak: number;
  url: string;
}): string {
  const parts = [formatResult(input.timeMs, input.penalty)];
  if (input.rank) parts.push(input.solved ? `#${input.rank} of ${input.solved}` : `#${input.rank}`);
  if (input.streak >= 2) parts.push(`${input.streak}-day streak`);
  return [`CuberHub daily scramble · ${formatDay(input.day)}`, parts.join(" · "), input.url].join("\n");
}
