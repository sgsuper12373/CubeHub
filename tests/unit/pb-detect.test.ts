import { describe, expect, it } from "vitest";

import { detectRecords, knownBestsFrom, type KnownBests } from "@/lib/timer/pb-detect";
import { headlineHit, windowTimes } from "@/lib/timer/share-card";
import { trimmedIndices } from "@/lib/timer/stats";
import type { Penalty, Solve } from "@/lib/timer/types";

let clock = 0;
function solve(timeMs: number, penalty: Penalty = "none"): Solve {
  clock += 1;
  return {
    id: `s${clock}`,
    sessionId: "session",
    puzzle: "333",
    timeMs,
    penalty,
    effectiveTimeMs: null,
    scramble: "R U",
    notes: null,
    createdAt: new Date(Date.UTC(2026, 9, 11, 0, 0, clock)).toISOString(),
  };
}

/** Feed solves one at a time (oldest first), like the timer does. */
function run(times: Solve[], known: KnownBests = {}) {
  let session: Solve[] = [];
  let bests = known;
  let last: ReturnType<typeof detectRecords> | null = null;
  for (const s of times) {
    last = detectRecords(session, s, bests);
    bests = last.known;
    session = [s, ...session];
  }
  return last!;
}

describe("detectRecords", () => {
  it("never celebrates the very first solve", () => {
    expect(detectRecords([], solve(10000), {}).hits).toEqual([]);
  });

  it("calls a faster second solve a session best when there is no history", () => {
    const { hits } = run([solve(12000), solve(11000)]);
    expect(hits).toEqual([
      expect.objectContaining({ category: "single", scope: "session", timeMs: 11000, previousMs: 12000 }),
    ]);
  });

  it("is an all-time PB only against a confirmed (loaded) best", () => {
    const known = knownBestsFrom([
      { category: "single", timeMs: 10500, solveId: null, achievedAt: "2026-01-01T00:00:00Z" },
    ]);
    const { hits } = run([solve(12000), solve(10000)], known);
    expect(hits).toEqual([
      expect.objectContaining({ category: "single", scope: "allTime", timeMs: 10000, previousMs: 10500 }),
    ]);
  });

  it("falls back to a session best when the all-time best still stands", () => {
    const known = knownBestsFrom([
      { category: "single", timeMs: 9000, solveId: null, achievedAt: "2026-01-01T00:00:00Z" },
    ]);
    const { hits } = run([solve(12000), solve(11000)], known);
    expect(hits).toEqual([expect.objectContaining({ category: "single", scope: "session" })]);
  });

  it("learns a best during the visit without confirming it", () => {
    const { known } = run([solve(12000), solve(11000)]);
    expect(known.single).toEqual({ timeMs: 11000, confirmed: false });
  });

  it("detects Mo3 and Ao5 records ending at the new solve", () => {
    const known = knownBestsFrom([
      { category: "mean3", timeMs: 20000, solveId: null, achievedAt: "2026-01-01T00:00:00Z" },
      { category: "ao5", timeMs: 20000, solveId: null, achievedAt: "2026-01-01T00:00:00Z" },
    ]);
    const { hits } = run([solve(15000), solve(14000), solve(13000), solve(12000), solve(11000)], known);
    const byCat = Object.fromEntries(hits.map((h) => [h.category, h]));
    expect(byCat.mean3).toMatchObject({ scope: "allTime", timeMs: 12000 });
    expect(byCat.ao5).toMatchObject({ scope: "allTime", timeMs: 13000 });
    expect(byCat.ao5.solves).toHaveLength(5);
  });

  it("ignores a DNF single and a DNF window", () => {
    const { hits } = run([solve(12000), solve(11000), solve(10000), solve(9000, "dnf")]);
    expect(hits).toEqual([]);
  });

  it("counts a +2 at its penalised time", () => {
    const { hits } = run([solve(12000), solve(9500, "plus2")]);
    // 9500 + 2000 = 11500, still faster than 12000.
    expect(hits[0]).toMatchObject({ category: "single", timeMs: 11500 });
  });
});

describe("trimmedIndices and share text", () => {
  it("trims the best and worst, with a DNF as the worst", () => {
    const w = [solve(11200), solve(10900), solve(13100), solve(0, "dnf"), solve(12700)];
    expect([...trimmedIndices(w)].sort()).toEqual([1, 3]);
  });

  it("trims two different solves when times tie", () => {
    expect(trimmedIndices([solve(10000), solve(10000), solve(10000), solve(10000), solve(10000)]).size).toBe(2);
  });

  it("trims nothing for a mean of 3", () => {
    expect(trimmedIndices([solve(1), solve(2), solve(3)]).size).toBe(0);
  });

  it("lists a window oldest first with trimmed solves in brackets", () => {
    const solves = [solve(12700), solve(0, "dnf"), solve(13100), solve(10900), solve(11200)];
    const hit = { category: "ao5" as const, scope: "allTime" as const, timeMs: 12330, previousMs: 13000, solves };
    expect(windowTimes(hit)).toEqual(["11.20", "(10.90)", "13.10", "(DNF)", "12.70"]);
  });

  it("headlines the longest average", () => {
    const base = { scope: "allTime" as const, timeMs: 1, previousMs: 2, solves: [] };
    expect(
      headlineHit([
        { ...base, category: "single" },
        { ...base, category: "ao5" },
        { ...base, category: "mean3" },
      ]).category,
    ).toBe("ao5");
  });
});
