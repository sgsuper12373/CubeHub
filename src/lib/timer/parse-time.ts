import type { Penalty } from "./types";

/**
 * Read a typed-in time the way csTimer's typing mode does, so cubers' muscle
 * memory carries over.
 *
 *   "12.34"      → 12.34          "1:02.34" → 1:02.34    "12.345" → 12.345
 *   "1234"       → 12.34          digits only: the last two are centiseconds,
 *   "10234"      → 1:02.34        the two before them seconds, the rest minutes
 *   "12.34+"     → 12.34 with +2 (the raw time; +2 is applied on top)
 *   "DNF"        → DNF            "DNF(12.34)" → DNF that took 12.34
 *
 * Returns the raw time in ms and the penalty, or an error message for the UI.
 */

export type ParsedTime =
  | { ok: true; timeMs: number; penalty: Penalty }
  | { ok: false; error: string };

const MAX_MS = 24 * 60 * 60 * 1000;

/** A time with no penalty marker, or null if it isn't one. */
function parseClock(text: string): number | null {
  // Digits only: csTimer's quick entry.
  if (/^\d{1,8}$/.test(text)) {
    const digits = text.padStart(3, "0");
    const centis = Number(digits.slice(-2));
    const rest = digits.slice(0, -2);
    const seconds = Number(rest.slice(-2));
    const minutes = rest.length > 2 ? Number(rest.slice(0, -2)) : 0;
    if (rest.length > 2 && seconds >= 60) return null;
    return (minutes * 60 + seconds) * 1000 + centis * 10;
  }

  // [h:]m:ss(.fff) or s(.fff)
  const match = /^(?:(?:(\d+):)?(\d+):)?(\d+)(?:\.(\d{1,3}))?$/.exec(text);
  if (!match) return null;
  const [, h, m, s, frac] = match;
  const hours = h ? Number(h) : 0;
  const minutes = m ? Number(m) : 0;
  const seconds = Number(s);
  // With a colon in front, seconds and minutes must be clock values.
  if ((m !== undefined && seconds >= 60) || (h !== undefined && minutes >= 60)) return null;
  const ms = frac ? Number(frac.padEnd(3, "0")) : 0;
  return ((hours * 60 + minutes) * 60 + seconds) * 1000 + ms;
}

export function parseTypedTime(input: string): ParsedTime {
  let text = input.trim().toLowerCase().replace(/\s+/g, "");
  if (!text) return { ok: false, error: "Type a time, e.g. 12.34 or 1234" };

  let penalty: Penalty = "none";
  if (text.startsWith("dnf")) {
    penalty = "dnf";
    text = text.slice(3).replace(/^\((.*)\)$/, "$1");
    // A bare DNF has no time; the database needs one above zero.
    if (!text) return { ok: true, timeMs: 1, penalty };
  } else if (text.endsWith("+")) {
    penalty = "plus2";
    text = text.slice(0, -1);
  }

  const timeMs = parseClock(text);
  if (timeMs === null) return { ok: false, error: `"${input.trim()}" isn't a time` };
  if (timeMs <= 0) return { ok: false, error: "A time has to be above zero" };
  if (timeMs >= MAX_MS) return { ok: false, error: "That's over 24 hours" };
  return { ok: true, timeMs, penalty };
}
