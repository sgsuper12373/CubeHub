/**
 * Daily scramble results: what counts, how they rank, and the browser's own
 * record of today's attempt. Pure apart from the localStorage helpers.
 */
import type { Penalty } from "@/lib/timer/types";

/** The server refuses anything under this (`misstop_limit_ms('333')`) or over an hour. */
export const DAILY_MIN_MS = 2000;
export const DAILY_MAX_MS = 60 * 60_000;

export type DailyAttempt = {
  /** Raw time, kept even for a DNF (the server stores null for those). */
  timeMs: number;
  penalty: Penalty;
  /** Sent to the leaderboard (signed in only). */
  posted: boolean;
};

/** Why a result can't go on the board, or null when it can. */
export function dailyResultProblem(timeMs: number, penalty: Penalty): string | null {
  if (penalty === "dnf") return null;
  if (!Number.isFinite(timeMs) || timeMs < DAILY_MIN_MS) {
    return "Under 2.00 s looks like a mis-stop, so it can't go on the leaderboard.";
  }
  if (timeMs > DAILY_MAX_MS) return "Over an hour can't go on the leaderboard.";
  return null;
}

/** The ranked time: +2 applied, null for a DNF (unranked). */
export function effectiveMs(timeMs: number | null, penalty: Penalty): number | null {
  if (penalty === "dnf" || timeMs === null) return null;
  return penalty === "plus2" ? timeMs + 2000 : timeMs;
}

/** The penalties a cuber may pick after the attempt: never below what inspection gave. */
export function allowedPenalties(fromInspection: Penalty): Penalty[] {
  if (fromInspection === "dnf") return ["dnf"];
  if (fromInspection === "plus2") return ["plus2", "dnf"];
  return ["none", "plus2", "dnf"];
}

// ── This browser's attempts ──

export const DAILY_STORAGE_KEY = "cubehub.daily.v1";
/** Old days are dropped on write; a week is plenty to show yesterday's result. */
const KEEP_DAYS = 7;

type Stored = Record<string, DailyAttempt>;

function parseAttempt(v: unknown): DailyAttempt | null {
  if (!v || typeof v !== "object") return null;
  const a = v as Record<string, unknown>;
  if (typeof a.timeMs !== "number" || !Number.isFinite(a.timeMs) || a.timeMs <= 0) return null;
  if (a.penalty !== "none" && a.penalty !== "plus2" && a.penalty !== "dnf") return null;
  return { timeMs: a.timeMs, penalty: a.penalty, posted: a.posted === true };
}

export function parseStoredAttempts(raw: string | null): Stored {
  if (!raw) return {};
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const out: Stored = {};
    for (const [day, v] of Object.entries(value)) {
      const a = parseAttempt(v);
      if (a && /^\d{4}-\d{2}-\d{2}$/.test(day)) out[day] = a;
    }
    return out;
  } catch {
    return {};
  }
}

/** Keeps the newest KEEP_DAYS days. */
export function withAttempt(stored: Stored, day: string, attempt: DailyAttempt): Stored {
  const next = { ...stored, [day]: attempt };
  const days = Object.keys(next).sort().reverse().slice(0, KEEP_DAYS);
  return Object.fromEntries(days.map((d) => [d, next[d]]));
}

export function loadAttempt(day: string): DailyAttempt | null {
  if (typeof localStorage === "undefined") return null;
  return parseStoredAttempts(localStorage.getItem(DAILY_STORAGE_KEY))[day] ?? null;
}

export function saveAttempt(day: string, attempt: DailyAttempt): void {
  if (typeof localStorage === "undefined") return;
  const stored = parseStoredAttempts(localStorage.getItem(DAILY_STORAGE_KEY));
  localStorage.setItem(DAILY_STORAGE_KEY, JSON.stringify(withAttempt(stored, day, attempt)));
}
