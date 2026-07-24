import type { Penalty, Session, Solve, TimerPuzzle } from "./types";

/**
 * csTimer import — the migration path off the tool most cubers are already
 * using.
 *
 * Format, confirmed against a real export:
 *
 *   {
 *     "session1": [ [[penalty, timeMs], scramble, comment, unixSeconds], … ],
 *     "session2": [ … ],
 *     "session3": [],                       // unused sessions are present but empty
 *     "properties": {
 *       "sessionData": "{\"1\":{\"name\":1,\"stat\":[count,?,mean],…}, …}",
 *                                           // a JSON *string*, and `name` may be a
 *                                           // number rather than a string
 *       "session": 2                        // the session selected in the UI
 *     }
 *   }
 *
 * Everything here is defensive. This is a file from another program, produced
 * by an unknown version of it, and a single malformed solve must not cost the
 * user the other nine hundred — bad entries are counted and reported, never
 * thrown.
 */

/** csTimer's penalty flag, in milliseconds. -1 is its DNF sentinel. */
const DNF_FLAG = -1;
const PLUS2_FLAG = 2000;

export interface CsTimerSolve {
  timeMs: number;
  penalty: Penalty;
  scramble: string;
  notes: string | null;
  createdAt: string;
}

export interface CsTimerSession {
  /** csTimer's own session name, or its index when it never got one. */
  name: string;
  solves: CsTimerSolve[];
}

export interface CsTimerParse {
  sessions: CsTimerSession[];
  totalSolves: number;
  plus2Count: number;
  dnfCount: number;
  earliest: string | null;
  latest: string | null;
  /** Anything skipped or assumed, surfaced to the user before they commit. */
  warnings: string[];
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** csTimer stores session names in a JSON string inside the properties object. */
function readSessionNames(properties: unknown): Map<string, string> {
  const names = new Map<string, string>();
  if (!isRecord(properties) || typeof properties.sessionData !== "string") {
    return names;
  }
  try {
    const parsed: unknown = JSON.parse(properties.sessionData);
    if (!isRecord(parsed)) return names;
    for (const [index, meta] of Object.entries(parsed)) {
      // `name` is often a number (csTimer defaults it to the session index).
      if (isRecord(meta) && (typeof meta.name === "string" || typeof meta.name === "number")) {
        names.set(index, String(meta.name));
      }
    }
  } catch {
    // A malformed sessionData costs names, not solves.
  }
  return names;
}

export function parseCsTimer(raw: string): CsTimerParse {
  const warnings: string[] = [];

  let root: unknown;
  try {
    root = JSON.parse(raw);
  } catch {
    return {
      sessions: [],
      totalSolves: 0,
      plus2Count: 0,
      dnfCount: 0,
      earliest: null,
      latest: null,
      warnings: ["This file isn't valid JSON — is it a csTimer export?"],
    };
  }

  if (!isRecord(root)) {
    return {
      sessions: [],
      totalSolves: 0,
      plus2Count: 0,
      dnfCount: 0,
      earliest: null,
      latest: null,
      warnings: ["Unexpected file shape — expected a csTimer export object."],
    };
  }

  const names = readSessionNames(root.properties);
  const sessions: CsTimerSession[] = [];
  let plus2Count = 0;
  let dnfCount = 0;
  let skipped = 0;
  let earliestMs: number | null = null;
  let latestMs: number | null = null;

  // Numeric order, so "session10" does not sort between 1 and 2.
  const sessionKeys = Object.keys(root)
    .filter((k) => /^session\d+$/.test(k))
    .sort((a, b) => Number(a.slice(7)) - Number(b.slice(7)));

  for (const key of sessionKeys) {
    const rows = root[key];
    if (!Array.isArray(rows) || rows.length === 0) continue;

    const index = key.slice(7);
    const solves: CsTimerSolve[] = [];

    for (const row of rows) {
      if (!Array.isArray(row) || !Array.isArray(row[0])) {
        skipped += 1;
        continue;
      }
      const [flag, timeMs] = row[0] as unknown[];
      if (typeof flag !== "number" || typeof timeMs !== "number" || timeMs <= 0) {
        skipped += 1;
        continue;
      }

      let penalty: Penalty = "none";
      if (flag === DNF_FLAG) {
        penalty = "dnf";
        dnfCount += 1;
      } else if (flag === PLUS2_FLAG) {
        penalty = "plus2";
        plus2Count += 1;
      } else if (flag !== 0) {
        // An unrecognised flag is still a solve; keep the time, drop the claim.
        warnings.push(`Unknown penalty flag ${flag} treated as no penalty.`);
      }

      // csTimer timestamps are unix *seconds*.
      const seconds = typeof row[3] === "number" ? row[3] : null;
      const ms = seconds === null ? Date.now() : seconds * 1000;
      if (earliestMs === null || ms < earliestMs) earliestMs = ms;
      if (latestMs === null || ms > latestMs) latestMs = ms;

      solves.push({
        timeMs,
        penalty,
        scramble: typeof row[1] === "string" ? row[1] : "",
        notes: typeof row[2] === "string" && row[2].length > 0 ? row[2] : null,
        createdAt: new Date(ms).toISOString(),
      });
    }

    if (solves.length === 0) continue;

    // csTimer writes solves newest-last; our own ordering is by createdAt, so
    // sort rather than trust the file.
    solves.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
    sessions.push({ name: names.get(index) ?? `Session ${index}`, solves });
  }

  if (skipped > 0) {
    warnings.push(`${skipped} malformed row${skipped === 1 ? "" : "s"} skipped.`);
  }
  if (plus2Count > 0) {
    warnings.push(
      `${plus2Count} +2 solve${plus2Count === 1 ? "" : "s"} imported with the ` +
        `raw time plus a +2 penalty — check one against csTimer before relying on it.`,
    );
  }

  return {
    sessions,
    totalSolves: sessions.reduce((n, s) => n + s.solves.length, 0),
    plus2Count,
    dnfCount,
    earliest: earliestMs === null ? null : new Date(earliestMs).toISOString(),
    latest: latestMs === null ? null : new Date(latestMs).toISOString(),
    // De-duplicate — one unknown flag repeated 200 times is one message.
    warnings: [...new Set(warnings)],
  };
}

/**
 * A stable 128-bit hash, rendered as a UUID.
 *
 * Import ids are derived from the source data rather than generated, so
 * importing the same file twice is a no-op: the repositories upsert on id with
 * `ignoreDuplicates`, and identical input yields identical ids. Without this a
 * cuber who clicks import twice silently doubles their history.
 *
 * Not a cryptographic hash and does not need to be — the only requirement is
 * that two different solves do not collide, and a 128-bit space over one
 * person's solve history clears that comfortably.
 */
function deterministicUuid(key: string): string {
  let h1 = 0x9e3779b9 ^ key.length;
  let h2 = 0x85ebca6b ^ key.length;
  let h3 = 0xc2b2ae35 ^ key.length;
  let h4 = 0x27d4eb2f ^ key.length;

  for (let i = 0; i < key.length; i++) {
    const c = key.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
    h3 = Math.imul(h3 ^ c, 951274213);
    h4 = Math.imul(h4 ^ c, 2246822519);
    h1 = (h1 << 13) | (h1 >>> 19);
    h2 = (h2 << 7) | (h2 >>> 25);
    h3 = (h3 << 17) | (h3 >>> 15);
    h4 = (h4 << 11) | (h4 >>> 21);
  }

  const hex = [h1, h2, h3, h4]
    .map((h) => (h >>> 0).toString(16).padStart(8, "0"))
    .join("");

  // Stamp version 4 and the RFC 4122 variant so Postgres accepts it as a uuid.
  const v = `${hex.slice(0, 12)}4${hex.slice(13, 16)}`;
  const variant = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return [
    v.slice(0, 8),
    v.slice(8, 12),
    v.slice(12, 16),
    `${variant}${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join("-");
}

/**
 * Turn a parse into rows this app can store.
 *
 * The puzzle is chosen by the user at import time, not inferred: csTimer
 * sessions carry no reliable puzzle marker, and the sample export had a
 * Square-1 scramble sitting inside a 3x3 session.
 */
export function toSolves(
  parse: CsTimerParse,
  puzzle: TimerPuzzle,
  startOrderIndex = 0,
): { sessions: Session[]; solves: Solve[] } {
  const sessions: Session[] = [];
  const solves: Solve[] = [];

  parse.sessions.forEach((source, i) => {
    const sessionId = deterministicUuid(`cstimer|session|${puzzle}|${source.name}`);
    sessions.push({
      id: sessionId,
      puzzle,
      name: source.name.slice(0, 60), // DB check: name <= 60 chars
      isActive: false,
      orderIndex: startOrderIndex + i,
    });

    for (const solve of source.solves) {
      solves.push({
        id: deterministicUuid(
          `cstimer|solve|${sessionId}|${solve.createdAt}|${solve.timeMs}|${solve.scramble}`,
        ),
        sessionId,
        puzzle,
        timeMs: solve.timeMs,
        penalty: solve.penalty,
        // Cloud rows get the generated column back on read; local rows derive it.
        effectiveTimeMs: null,
        scramble: solve.scramble,
        notes: solve.notes,
        createdAt: solve.createdAt,
      });
    }
  });

  return { sessions, solves };
}
