import { describe, expect, it } from "vitest";

import {
  countedSolves,
  countsForRecords,
  drillMisfireLimitMs,
  flagMisstops,
  isFlaggedMisstop,
  median,
  MISSTOP_LIMIT_MS,
  MISSTOP_MIN_SOLVES,
  MISSTOP_RATIO,
  MISSTOP_WINDOW,
  misstopMedian,
  suspectedMisstop,
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

/** n recent counted times around 22 s, newest first. */
const history = (n: number, ms = 22000) => Array.from({ length: n }, () => ms);

describe("mis-stop rules", () => {
  it("has the agreed constants", () => {
    expect([MISSTOP_RATIO, MISSTOP_WINDOW, MISSTOP_MIN_SOLVES]).toEqual([0.5, 50, 12]);
  });

  it("has an implausible limit for every timer event, well under each world record", () => {
    for (const e of TIMER_EVENTS) expect(MISSTOP_LIMIT_MS[e.id]).toBeGreaterThan(0);
    expect(MISSTOP_LIMIT_MS).toMatchObject({
      "333": 2000, "222": 300, "333oh": 4000, "444": 12000, "555": 25000,
      pyra: 500, skewb: 500, mega: 18000,
    });
  });

  it("implausible: under the limit flags from the very first solve; the limit itself doesn't", () => {
    expect(suspectedMisstop("333", 1999, [])).toBe("implausible");
    expect(suspectedMisstop("333", 2000, [])).toBeNull();
    expect(suspectedMisstop("222", 299, [])).toBe("implausible");
    expect(suspectedMisstop("222", 300, [])).toBeNull();
  });

  it("relative: under half the median, only with at least 12 counted solves", () => {
    expect(suspectedMisstop("333", 10999, history(MISSTOP_MIN_SOLVES - 1))).toBeNull();
    expect(suspectedMisstop("333", 10999, history(MISSTOP_MIN_SOLVES))).toBe("relative");
    expect(suspectedMisstop("333", 11000, history(MISSTOP_MIN_SOLVES))).toBeNull();
  });

  it("the implausible rule wins when both apply", () => {
    expect(suspectedMisstop("333", 1500, history(20))).toBe("implausible");
  });

  it("uses only the newest 50 times", () => {
    // 50 recent ~10 s solves, then 100 older ~40 s ones: the median is 10 s.
    const times = [...history(50, 10000), ...history(100, 40000)];
    expect(misstopMedian(times)).toBe(10000);
    expect(suspectedMisstop("333", 6000, times)).toBeNull();
  });

  it("median matches percentile_cont: the middle two averaged for an even count", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBeNull();
  });
});

describe("which solves count", () => {
  it("only exclusion decides, never the time", () => {
    expect(countsForRecords({ excluded: false })).toBe(true);
    expect(countsForRecords({})).toBe(true);
    expect(countsForRecords({ excluded: true })).toBe(false);
    expect(countedSolves([solve(12000), solve(150), solve(13000, { excluded: true })])).toHaveLength(2);
  });

  it("tags only solves the timer flagged and nobody marked real", () => {
    expect(isFlaggedMisstop({ excluded: true, excludedReason: "auto_misstop" })).toBe(true);
    expect(isFlaggedMisstop({ excluded: true, excludedReason: "user" })).toBe(false);
    expect(isFlaggedMisstop({ excluded: false })).toBe(false);
  });

  it("drill reps faster than 60 ms a move are misfires, with a 0.30 floor", () => {
    expect(drillMisfireLimitMs(10)).toBe(600);
    expect(drillMisfireLimitMs(3)).toBe(300);
  });
});

describe("flagging an import, like the database backfill", () => {
  it("applies both rules in time order, each on the counted solves before it", () => {
    const solves = [
      solve(1500), // implausible
      ...[20, 21, 22, 23, 24, 25, 20, 21, 22, 23, 24].map((s) => solve(s * 1000)),
      solve(9000), // only 11 counted before it
      solve(10500), // median 22 s: under 11 s
      solve(10000, { misstopConfirmed: true }),
      solve(1000, { penalty: "dnf" }),
      solve(11500), // median 21 s: 10.5 s cut-off
    ];
    // Shuffled input order is kept in the output; time order decides.
    const shuffled = [...solves].reverse();
    const flagged = flagMisstops(shuffled)
      .filter((s) => s.excludedReason === "auto_misstop")
      .map((s) => s.timeMs);
    expect(flagged.sort()).toEqual([10500, 1500].sort());
  });

  it("keeps solves that were already left out", () => {
    const [out] = flagMisstops([solve(500, { excluded: true, excludedReason: "user" })]);
    expect(out.excludedReason).toBe("user");
  });
});

describe("records skip excluded solves", () => {
  it("a flagged solve is never a PB, even against a slower all-time best", () => {
    const known = knownBestsFrom([{ category: "single", timeMs: 9000, solveId: null, achievedAt: "" }]);
    const flagged = solve(20, { excluded: true, excludedReason: "auto_misstop" });
    expect(detectRecords([], flagged, known)).toEqual({ hits: [], known });
  });

  it("marked real, the same time is a PB", () => {
    const known = knownBestsFrom([{ category: "single", timeMs: 9000, solveId: null, achievedAt: "" }]);
    const real = solve(1500, { misstopConfirmed: true });
    expect(detectRecords([], real, known).hits.map((h) => h.category)).toContain("single");
  });

  it("averages close over the solves around an excluded one, like the database", () => {
    const session = [
      solve(24000), solve(23000), solve(22000), solve(21000),
      solve(150, { excluded: true, excludedReason: "auto_misstop" }), solve(20000),
    ].reverse();
    const newestFirst = [...session].reverse();
    expect(wcaAverage(countedSolves(newestFirst), 5)).toBe(22000);
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
