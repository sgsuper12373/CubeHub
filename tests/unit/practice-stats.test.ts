import { describe, expect, it } from "vitest";

import {
  barrierLabel,
  defaultGoalMs,
  fastestHours,
  goalOptions,
  hourRangeLabel,
  practiceStreaks,
  spreadTrend,
  subXByPeriod,
  subXRate,
} from "@/lib/timer/practice-stats";
import type { Penalty } from "@/lib/timer/types";

const solve = (ms: number, createdAt = "2026-10-01T10:00:00", penalty: Penalty = "none") => ({
  timeMs: ms,
  penalty,
  effectiveTimeMs: penalty === "dnf" ? null : ms,
  createdAt,
});

describe("sub-X", () => {
  it("labels barriers and suggests the next one under the average", () => {
    expect(barrierLabel(20000)).toBe("sub-20");
    expect(barrierLabel(90000)).toBe("sub-1:30");
    expect(defaultGoalMs(21430)).toBe(20000);
    expect(defaultGoalMs(20000)).toBe(17000); // already at 20: the one under it
    expect(defaultGoalMs(2000)).toBe(3000);
    expect(goalOptions(21430, 2)).toEqual([15000, 17000, 20000, 25000, 30000]);
  });

  it("rate: a DNF is never under, +2 counts", () => {
    expect(subXRate([solve(19000), solve(21000), solve(15000, undefined, "dnf"), solve(18500)], 20000)).toBe(0.5);
    expect(subXRate([], 20000)).toBeNull();
  });

  it("rate by 30-day period, oldest first, from the first period with solves", () => {
    const now = Date.parse("2026-10-31T12:00:00Z");
    const day = (n: number) => new Date(now - n * 86_400_000).toISOString();
    const solves = [solve(19000, day(5)), solve(21000, day(10)), solve(22000, day(40)), solve(23000, day(45))];
    const periods = subXByPeriod(solves, 20000, now, 6);
    expect(periods.map((p) => p.rate)).toEqual([0, 0.5]);
    expect(periods.map((p) => p.solves)).toEqual([2, 2]);
  });
});

describe("streaks", () => {
  const now = new Date("2026-10-15T20:00:00"); // a Thursday
  const days = (...list: [string, number][]) => list.map(([day, count]) => ({ day, count }));

  it("current streak counts yesterday while today is still open", () => {
    const d = days(["2026-10-12", 3], ["2026-10-13", 5], ["2026-10-14", 2]);
    expect(practiceStreaks(d, now)).toEqual({ current: 3, longest: 3, thisWeek: 10 });
  });

  it("a gap breaks the current streak; the longest is remembered", () => {
    const d = days(["2026-10-01", 1], ["2026-10-02", 1], ["2026-10-03", 1], ["2026-10-04", 1], ["2026-10-15", 4]);
    expect(practiceStreaks(d, now)).toEqual({ current: 1, longest: 4, thisWeek: 4 });
  });

  it("no practice: zeros", () => {
    expect(practiceStreaks([], now)).toEqual({ current: 0, longest: 0, thisWeek: 0 });
  });
});

describe("time of day", () => {
  it("picks the fastest two-hour block once two blocks have enough solves", () => {
    const at = (h: number) => `2026-10-01T${String(h).padStart(2, "0")}:30:00`;
    const evening = Array.from({ length: 20 }, () => solve(18000, at(21)));
    const morning = Array.from({ length: 20 }, () => solve(22000, at(9)));
    expect(fastestHours([...evening, ...morning])).toEqual({ fromHour: 20, medianMs: 18000, overallMs: 20000 });
    expect(fastestHours(evening)).toBeNull();
    expect(hourRangeLabel(20)).toBe("8 pm and 10 pm");
    expect(hourRangeLabel(22)).toBe("10 pm and midnight");
    expect(hourRangeLabel(10)).toBe("10 am and noon");
  });
});

describe("spread trend", () => {
  it("σ per chunk, oldest first; needs two full chunks", () => {
    // Newest first: 25 steady solves, then (older) 25 spread ones.
    const steady = Array.from({ length: 25 }, () => solve(20000));
    const spread = Array.from({ length: 25 }, (_, i) => solve(i % 2 ? 16000 : 24000));
    const trend = spreadTrend([...steady, ...spread], 25);
    // 13 × 24.00 and 12 × 16.00 (not an even split): σ just under 4.00.
    expect(trend).toHaveLength(2);
    expect(trend[0]).toBe(3997);
    expect(trend[1]).toBe(0);
    expect(spreadTrend(steady, 25)).toEqual([]);
  });
});
