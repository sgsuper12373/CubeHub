import { effectiveMs, medianMs, stdDevMs, type DayCount } from "./stats";
import type { Solve, SolveMetric } from "./types";

type SolveTimes = Pick<Solve, "timeMs" | "penalty" | "effectiveTimeMs">;
type TimeStamped = SolveTimes & Pick<SolveMetric, "createdAt">;

/**
 * Stats-page figures that read better than a formula: sub-X barriers, streaks,
 * the fastest time of day, and whether the spread is shrinking. Pure, like
 * stats.ts.
 */

// ── Sub-X ──

/** The barriers cubers talk about, in ms: sub-10, sub-15, sub-20, sub-1:00… */
export const BARRIERS_MS = [
  3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17, 20, 25, 30, 35, 40, 45, 50, 60, 75, 90, 105, 120, 150,
  180, 240, 300, 360, 420, 480, 600,
].map((s) => s * 1000);

/** "sub-20", "sub-1:30". */
export function barrierLabel(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `sub-${s}`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `sub-${m}:${String(r).padStart(2, "0")}`;
}

/**
 * The goal to suggest: the next barrier under the current average (a 21.43
 * Ao12 suggests sub-20). Already under every barrier: the smallest one.
 */
export function defaultGoalMs(currentMs: number): number {
  const below = BARRIERS_MS.filter((b) => b < currentMs);
  return below.length > 0 ? below[below.length - 1] : BARRIERS_MS[0];
}

/** Barriers worth offering around an average: a few either side of the default. */
export function goalOptions(currentMs: number, around = 4): number[] {
  const i = BARRIERS_MS.indexOf(defaultGoalMs(currentMs));
  return BARRIERS_MS.slice(Math.max(0, i - around), i + around + 1);
}

/** Share of solves under the goal; a DNF is never under it. Null with no solves. */
export function subXRate(solves: SolveTimes[], goalMs: number): number | null {
  if (solves.length === 0) return null;
  let under = 0;
  for (const s of solves) {
    const t = effectiveMs(s);
    if (t !== null && t < goalMs) under += 1;
  }
  return under / solves.length;
}

export type RatePeriod = { from: number; to: number; solves: number; rate: number | null };

/**
 * The sub-X rate in 30-day periods counting back from `now`, oldest first,
 * up to `periods` of them; periods with no solves are kept (rate null) so the
 * bars line up with time.
 */
export function subXByPeriod(
  solves: TimeStamped[],
  goalMs: number,
  now: number,
  periods = 6,
  periodMs = 30 * 86_400_000,
): RatePeriod[] {
  const out: RatePeriod[] = [];
  for (let k = periods - 1; k >= 0; k--) {
    const to = now - k * periodMs;
    const from = to - periodMs;
    const inside = solves.filter((s) => {
      const t = Date.parse(s.createdAt);
      return t > from && t <= to;
    });
    out.push({ from, to, solves: inside.length, rate: subXRate(inside, goalMs) });
  }
  // Drop leading empty periods: before the cuber started, not a drop to 0.
  const first = out.findIndex((p) => p.solves > 0);
  return first === -1 ? [] : out.slice(first);
}

// ── Streaks ──

function localDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() + n);
  return localDay(d);
}

/**
 * Practice streaks from `dailyCounts()` days (local `YYYY-MM-DD`).
 * The current streak still counts if today has no solves yet but yesterday
 * did: the day isn't over. "This week" starts on Monday.
 */
export function practiceStreaks(
  days: Pick<DayCount, "day" | "count">[],
  now: Date = new Date(),
): { current: number; longest: number; thisWeek: number } {
  const practiced = new Set(days.filter((d) => d.count > 0).map((d) => d.day));
  const today = localDay(now);

  let longest = 0;
  for (const day of practiced) {
    if (practiced.has(addDays(day, -1))) continue; // not the start of a run
    let length = 1;
    while (practiced.has(addDays(day, length))) length += 1;
    longest = Math.max(longest, length);
  }

  let current = 0;
  let cursor = practiced.has(today) ? today : addDays(today, -1);
  while (practiced.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  const monday = addDays(today, -((now.getDay() + 6) % 7));
  const thisWeek = days.filter((d) => d.day >= monday && d.day <= today).reduce((n, d) => n + d.count, 0);

  return { current, longest, thisWeek };
}

// ── Time of day ──

/** Two-hour blocks need this many solves to be judged. */
const HOUR_BLOCK_MIN = 20;

/**
 * The two-hour block of the day (local time) with the fastest median, when at
 * least two blocks have enough solves to compare. `fromHour` is 0–22.
 */
export function fastestHours(
  solves: TimeStamped[],
): { fromHour: number; medianMs: number; overallMs: number } | null {
  const blocks = new Map<number, TimeStamped[]>();
  for (const s of solves) {
    const d = new Date(s.createdAt);
    if (Number.isNaN(d.getTime())) continue;
    const block = Math.floor(d.getHours() / 2) * 2;
    const list = blocks.get(block);
    if (list) list.push(s);
    else blocks.set(block, [s]);
  }
  const judged = [...blocks.entries()]
    .filter(([, list]) => list.length >= HOUR_BLOCK_MIN)
    .map(([fromHour, list]) => ({ fromHour, medianMs: medianMs(list) }))
    .filter((b): b is { fromHour: number; medianMs: number } => b.medianMs !== null);
  if (judged.length < 2) return null;
  const best = judged.reduce((a, b) => (b.medianMs < a.medianMs ? b : a));
  const overall = medianMs(solves);
  return overall === null ? null : { ...best, overallMs: overall };
}

/** "9 and 11 pm", "11 pm and 1 am", "noon and 2 pm". */
export function hourRangeLabel(fromHour: number): string {
  const h = (n: number) => {
    const x = n % 24;
    if (x === 0) return "midnight";
    if (x === 12) return "noon";
    return `${x % 12} ${x < 12 ? "am" : "pm"}`;
  };
  return `${h(fromHour)} and ${h(fromHour + 2)}`;
}

// ── Spread over time ──

/**
 * σ over consecutive chunks of solves, oldest first, for a small "getting
 * steadier?" line. Needs at least two full chunks.
 *
 * @param solves newest first
 */
export function spreadTrend(solves: SolveTimes[], chunk = 25, maxPoints = 12): number[] {
  const chrono = [...solves].reverse();
  const chunks = Math.min(maxPoints, Math.floor(chrono.length / chunk));
  if (chunks < 2) return [];
  // The newest `chunks` full chunks.
  const start = chrono.length - chunks * chunk;
  const out: number[] = [];
  for (let i = 0; i < chunks; i++) {
    const slice = chrono.slice(start + i * chunk, start + (i + 1) * chunk);
    const sigma = stdDevMs(slice, chunk);
    if (sigma !== null) out.push(sigma);
  }
  return out.length >= 2 ? out : [];
}
