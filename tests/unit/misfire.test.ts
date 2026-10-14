import { describe, expect, it } from "vitest";

import {
  countedSessionSolves,
  countsForRecords,
  drillMisfireLimitMs,
  isMisfire,
  MISFIRE_LIMIT_MS,
} from "@/lib/timer/misfire";
import { detectRecords, knownBestsFrom } from "@/lib/timer/pb-detect";
import { slowOutlierCeiling, wcaAverage } from "@/lib/timer/stats";
import { TIMER_EVENTS } from "@/lib/timer/events";
import type { Solve } from "@/lib/timer/types";

let clock = 0;
function solve(timeMs: number, extra: Partial<Solve> = {}): Solve {
  clock += 1;
  return {
    id: `m${clock}`,
    sessionId: "session",
    puzzle: "333",
    timeMs,
    penalty: "none",
    effectiveTimeMs: null,
    scramble: "R U",
    notes: null,
    createdAt: new Date(Date.UTC(2026, 9, 15, 0, 0, clock)).toISOString(),
    ...extra,
  };
}

describe("misfires", () => {
  it("has a limit for every timer event, under each world record", () => {
    for (const e of TIMER_EVENTS) expect(MISFIRE_LIMIT_MS[e.id]).toBeGreaterThan(0);
    // 3x3 WR is 3.05, 2x2 0.43, Pyraminx 0.73.
    expect(MISFIRE_LIMIT_MS["333"]).toBeLessThan(3050);
    expect(MISFIRE_LIMIT_MS["222"]).toBeLessThan(430);
    expect(MISFIRE_LIMIT_MS.pyra).toBeLessThan(730);
  });

  it("judges the raw time, so a +2 doesn't rescue a misfire", () => {
    expect(isMisfire("333", 150)).toBe(true);
    expect(isMisfire("333", 3000)).toBe(false);
    expect(isMisfire("222", 150)).toBe(true);
    expect(isMisfire("222", 600)).toBe(false);
    expect(countsForRecords("333", { timeMs: 150 })).toBe(false);
  });

  it("an excluded solve never counts", () => {
    expect(countsForRecords("333", { timeMs: 12000, excluded: true })).toBe(false);
    expect(countedSessionSolves([solve(12000), solve(150), solve(13000, { excluded: true })])).toHaveLength(1);
  });

  it("drill reps faster than 60 ms a move are misfires, with a 0.30 floor", () => {
    expect(drillMisfireLimitMs(10)).toBe(600);
    expect(drillMisfireLimitMs(3)).toBe(300);
  });
});

describe("records skip misfires", () => {
  it("a misfire is never a PB, even against a slower all-time best", () => {
    const known = knownBestsFrom([{ category: "single", timeMs: 9000, solveId: null, achievedAt: "" }]);
    expect(detectRecords([], solve(20), known)).toEqual({ hits: [], known });
  });

  it("averages close over the solves around a misfire, like the database", () => {
    const session = [solve(24000), solve(23000), solve(22000), solve(21000), solve(150), solve(20000)].reverse();
    // Newest first, as the store holds them; the misfire is the second-oldest.
    const newestFirst = [...session].reverse();
    const counted = countedSessionSolves(newestFirst);
    expect(wcaAverage(counted, 5)).toBe(22000);
  });
});

describe("chart outlier ceiling", () => {
  const times = (ms: number[]) => ms.map((t) => solve(t));

  it("fences off one very slow solve", () => {
    const cap = slowOutlierCeiling(times([18000, 19000, 20000, 21000, 22000, 20500, 19500, 390000]));
    expect(cap).not.toBeNull();
    expect(cap!).toBeLessThan(60000);
    expect(cap!).toBeGreaterThan(22000);
  });

  it("leaves an ordinary spread alone, and doesn't judge under five solves", () => {
    expect(slowOutlierCeiling(times([18000, 19000, 20000, 25000, 30000]))).toBeNull();
    expect(slowOutlierCeiling(times([10000, 390000]))).toBeNull();
  });
});
