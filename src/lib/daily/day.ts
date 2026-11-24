/**
 * The daily scramble's calendar (docs/home-plan.md → card 2): days are IST
 * dates, and a new scramble starts at midnight Asia/Kolkata. Pure, so the
 * boundary is unit-tested.
 */

/** IST is UTC+5:30 all year (no daylight saving). */
const IST_OFFSET_MS = (5 * 60 + 30) * 60_000;
const DAY_MS = 24 * 60 * 60_000;

/** The IST date (yyyy-mm-dd) at `now`. */
export function istDay(now: Date = new Date()): string {
  return new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** Milliseconds until the next midnight IST. */
export function msUntilNextDay(now: Date = new Date()): number {
  const shifted = now.getTime() + IST_OFFSET_MS;
  return DAY_MS - (((shifted % DAY_MS) + DAY_MS) % DAY_MS);
}

/** "4h 12m", "12m", or "under a minute". */
export function formatCountdown(ms: number): string {
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "under a minute";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** A real calendar date in yyyy-mm-dd form. */
export function isDay(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Where a daily sits relative to today: only today's can be attempted. */
export function dayStatus(day: string, today: string): "past" | "today" | "future" {
  return day < today ? "past" : day > today ? "future" : "today";
}

/** "Tue 25 Nov", for the card and the banner. */
export function formatDay(day: string): string {
  return new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${day}T00:00:00Z`),
  );
}
