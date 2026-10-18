import { describe, expect, it } from "vitest";

import { formatDuration, nextSolveNeeds, timeSpentMs } from "@/lib/timer/next-solve";
import { windowStat } from "@/lib/timer/stats";
import type { Penalty } from "@/lib/timer/types";

/** Session solves, newest first. */
const times = (...ms: number[]) =>
  ms.map((t) => ({ timeMs: t, penalty: "none" as Penalty, effectiveTimeMs: t }));
const dnf = { timeMs: 9000, penalty: "dnf" as Penalty, effectiveTimeMs: null };

describe("next solve needs", () => {
  it("single: under the PB, or anything when there's none", () => {
    expect(nextSolveNeeds("single", [], 12340)).toEqual({ kind: "below", ms: 12340 });
    expect(nextSolveNeeds("single", [], null)).toEqual({ kind: "any" });
  });

  it("an average needs n−1 solves in the session first", () => {
    expect(nextSolveNeeds("ao5", times(10000, 11000), 12000)).toEqual({ kind: "more", solves: 2 });
    expect(nextSolveNeeds("ao100", times(10000), null)).toEqual({ kind: "more", solves: 98 });
  });

  it("Ao5: the exact threshold, checked against the average itself", () => {
    // Previous four: 12, 13, 14, 15. PB Ao5 13.50.
    const session = times(12000, 13000, 14000, 15000);
    const need = nextSolveNeeds("ao5", session, 13500);
    expect(need.kind).toBe("below");
    const ms = (need as { ms: number }).ms;
    const avg = (x: number) => windowStat(times(x, 12000, 13000, 14000, 15000), 5);
    expect(avg(ms - 1)).toBeLessThan(13500);
    expect(avg(ms)).toBeGreaterThanOrEqual(13500);
  });

  it("∞ when the next solve would be trimmed as the worst anyway", () => {
    // 10, 10, 11, 10: a slow fifth is dropped as the worst, leaving 10.33 < PB 12.00.
    expect(nextSolveNeeds("ao5", times(10000, 10000, 11000, 10000), 12000)).toEqual({ kind: "any" });
  });

  it("N/A when even a 0.00 can't get under the PB", () => {
    // 20, 20, 20, 20: the best is trimmed, so the average stays 20.00.
    expect(nextSolveNeeds("ao5", times(20000, 20000, 20000, 20000), 15000)).toEqual({ kind: "none" });
  });

  it("two DNFs already in the window: N/A; with no PB yet a finite average is enough", () => {
    expect(nextSolveNeeds("ao5", [dnf, dnf, ...times(10000, 10000)], null)).toEqual({ kind: "none" });
    expect(nextSolveNeeds("ao5", [dnf, ...times(10000, 10000, 10000)], null)).toEqual({ kind: "any" });
  });

  it("Mo3 trims nothing, so a slow solve always matters", () => {
    const need = nextSolveNeeds("mean3", times(10000, 11000), 11000);
    // (x + 21) / 3 < 11 → x < 12.00 (rounded to centiseconds).
    expect(need).toEqual({ kind: "below", ms: 11985 });
  });
});

describe("time spent", () => {
  it("sums raw times and formats them", () => {
    expect(timeSpentMs(times(20000, 40000))).toBe(60000);
    expect(formatDuration(40_000)).toBe("40 s");
    expect(formatDuration(45 * 60_000)).toBe("45 min");
    expect(formatDuration(3 * 3_600_000)).toBe("3 h");
    expect(formatDuration(3 * 3_600_000 + 12 * 60_000)).toBe("3 h 12 min");
  });
});
