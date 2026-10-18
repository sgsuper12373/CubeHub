import { bestAverageOfN, bestSingle, medianMs, sessionMean, stdDevMs } from "./stats";
import type { Session, SolveMetric } from "./types";

/**
 * One row of the Stats sessions table: what a session looks like over the
 * solves in view. Averages are per session, like personal bests, so this is
 * also where per-session bests live.
 */
export type SessionSummary = {
  id: string;
  name: string;
  isActive: boolean;
  solves: number;
  /** Oldest and newest solve in view (ISO). */
  firstAt: string;
  lastAt: string;
  mean: number | null;
  median: number | null;
  best: number | null;
  bestAo5: number | null;
  bestAo12: number | null;
  /** Spread over the session's solves in view. */
  stdDev: number | null;
  /** Raw solving time. */
  timeMs: number;
};

/**
 * @param sessions the event's sessions
 * @param counted  counted solves in view, newest first (any sessions)
 * @returns one row per session with solves in view; sessions without any are left out
 */
export function summarizeSessions(sessions: Session[], counted: SolveMetric[]): SessionSummary[] {
  const bySession = new Map<string, SolveMetric[]>();
  for (const m of counted) {
    const list = bySession.get(m.sessionId);
    if (list) list.push(m);
    else bySession.set(m.sessionId, [m]);
  }

  const rows: SessionSummary[] = [];
  for (const session of sessions) {
    const list = bySession.get(session.id);
    if (!list || list.length === 0) continue;
    rows.push({
      id: session.id,
      name: session.name,
      isActive: session.isActive,
      solves: list.length,
      firstAt: list[list.length - 1].createdAt,
      lastAt: list[0].createdAt,
      mean: sessionMean(list),
      median: medianMs(list),
      best: bestSingle(list),
      bestAo5: bestAverageOfN(list, 5)?.timeMs ?? null,
      bestAo12: bestAverageOfN(list, 12)?.timeMs ?? null,
      stdDev: stdDevMs(list, list.length),
      timeMs: list.reduce((sum, m) => sum + m.timeMs, 0),
    });
  }
  return rows;
}

export type SessionSortKey = "name" | "lastAt" | "solves" | "mean" | "best" | "bestAo5" | "bestAo12";

/**
 * Sort rows by a column. Missing values (no Ao12 yet) always go last, in
 * either direction, so "fastest first" never opens on a row of dashes.
 */
export function sortSessions(
  rows: SessionSummary[],
  key: SessionSortKey,
  direction: "asc" | "desc",
): SessionSummary[] {
  const sign = direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = a[key];
    const vb = b[key];
    if (va === null && vb === null) return 0;
    if (va === null) return 1;
    if (vb === null) return -1;
    if (typeof va === "string" && typeof vb === "string") {
      return sign * va.localeCompare(vb, undefined, { numeric: true, sensitivity: "base" });
    }
    return sign * ((va as number) - (vb as number));
  });
}
