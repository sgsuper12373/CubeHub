import type { Penalty } from "./types";

/**
 * Time formatting for display. All inputs are millisecond numbers from
 * performance.now() deltas or the DB; formatting truncates (never rounds up —
 * a solve is not faster than it was).
 *
 *   formatMs(9_423)   → "9.42"
 *   formatMs(62_450)  → "1:02.45"
 *   formatMs(9_423, 3) → "9.423"   (running display can show ms if wanted)
 */
export function formatMs(ms: number, decimals: 2 | 3 = 2): string {
  if (!Number.isFinite(ms) || ms < 0) ms = 0;

  const divisor = decimals === 2 ? 10 : 1;
  const units = Math.floor(ms / divisor); // centis or millis
  const perSecond = decimals === 2 ? 100 : 1000;

  const totalSeconds = Math.floor(units / perSecond);
  const fraction = units % perSecond;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const frac = String(fraction).padStart(decimals, "0");
  if (minutes === 0) return `${seconds}.${frac}`;
  return `${minutes}:${String(seconds).padStart(2, "0")}.${frac}`;
}

/**
 * Decorated result string following csTimer conventions:
 * none → "12.34", plus2 → "14.34+" (effective time, plus marker), dnf → "DNF".
 * `timeMs` is the raw time; the +2 is applied here for display only —
 * persistence always stores the raw time and lets the DB generate the
 * effective value (docs/database.md: never re-derive penalties for DB rows).
 */
export function formatResult(timeMs: number, penalty: Penalty): string {
  switch (penalty) {
    case "dnf":
      return "DNF";
    case "plus2":
      return `${formatMs(timeMs + 2000)}+`;
    default:
      return formatMs(timeMs);
  }
}

/** Averages can themselves be DNF (two or more DNFs in the window). */
export function formatAverage(avg: number | "DNF" | null): string {
  if (avg === null) return "—";
  if (avg === "DNF") return "DNF";
  return formatMs(avg);
}
