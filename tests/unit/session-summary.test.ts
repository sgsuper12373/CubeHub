import { describe, expect, it } from "vitest";

import { sortSessions, summarizeSessions } from "@/lib/timer/session-summary";
import type { Session, SolveMetric } from "@/lib/timer/types";

const session = (id: string, name: string, isActive = false): Session => ({
  id,
  puzzle: "333",
  name,
  isActive,
  orderIndex: 0,
});

/** Newest first, minute by minute back from `start`. */
function solves(sessionId: string, start: number, ...ms: number[]): SolveMetric[] {
  return ms.map((t, i) => ({
    id: `${sessionId}-${i}`,
    sessionId,
    timeMs: t,
    penalty: "none",
    effectiveTimeMs: null,
    createdAt: new Date(Date.UTC(2026, 9, 1, 0, start - i)).toISOString(),
  }));
}

describe("session summaries", () => {
  const sessions = [session("a", "Session 1"), session("b", "Session 2", true), session("c", "Empty")];
  const counted = [
    ...solves("b", 100, 20000, 21000, 22000, 23000, 24000),
    ...solves("a", 50, 30000, 26000, 28000),
  ];
  const rows = summarizeSessions(sessions, counted);

  it("one row per session with solves in view", () => {
    expect(rows.map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("per-session numbers", () => {
    const b = rows.find((r) => r.id === "b")!;
    expect(b).toMatchObject({
      solves: 5,
      mean: 22000,
      median: 22000,
      best: 20000,
      bestAo5: 22000,
      bestAo12: null,
      timeMs: 110000,
      isActive: true,
    });
    expect(b.firstAt < b.lastAt).toBe(true);
    expect(rows.find((r) => r.id === "a")!.bestAo5).toBeNull();
  });

  it("sorts by any column, missing values last either way", () => {
    expect(sortSessions(rows, "bestAo5", "asc").map((r) => r.id)).toEqual(["b", "a"]);
    expect(sortSessions(rows, "bestAo5", "desc").map((r) => r.id)).toEqual(["b", "a"]);
    expect(sortSessions(rows, "best", "desc").map((r) => r.id)).toEqual(["a", "b"]);
    expect(sortSessions(rows, "lastAt", "desc").map((r) => r.id)).toEqual(["b", "a"]);
    // Names compare naturally: "Session 10" after "Session 9".
    const named = [
      { ...rows[0], id: "x", name: "Session 10" },
      { ...rows[0], id: "y", name: "Session 9" },
    ];
    expect(sortSessions(named, "name", "asc").map((r) => r.id)).toEqual(["y", "x"]);
  });
});
