import { describe, expect, it } from "vitest";

import { buildTrendPoints, nearestPoint, pbMarks } from "@/components/stats/chart/trend-data";
import type { SolveMetric } from "@/lib/timer/types";

const metric = (id: string, ms: number, minute: number, extra: Partial<SolveMetric> = {}): SolveMetric => ({
  id,
  sessionId: "s",
  timeMs: ms,
  penalty: "none",
  effectiveTimeMs: null,
  createdAt: new Date(Date.UTC(2026, 9, 1, 0, minute)).toISOString(),
  ...extra,
});

describe("trend points", () => {
  // Counted, newest first: five solves at minutes 1–5 and 7; a mis-stop at minute 6.
  const counted = [
    metric("c6", 26000, 7),
    metric("c5", 24000, 5),
    metric("c4", 23000, 4),
    metric("c3", 22000, 3),
    metric("c2", 21000, 2),
    metric("c1", 20000, 1),
  ];
  const flagged = [metric("m", 300, 6, { excluded: true, excludedReason: "auto_misstop" })];
  const points = buildTrendPoints(counted, flagged);

  it("puts mis-stops on the same time line, oldest first", () => {
    expect(points.map((p) => p.id)).toEqual(["c1", "c2", "c3", "c4", "c5", "m", "c6"]);
    expect(points.map((p) => p.idx)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("averages only the counted solves; a mis-stop has none", () => {
    expect(points.find((p) => p.id === "c5")?.ao5).toBe(22000); // 20–24: mean(21, 22, 23)
    expect(points.find((p) => p.id === "c6")?.ao5).toBe(23000); // 21–24, 26: mean(22, 23, 24)
    expect(points.find((p) => p.id === "m")).toMatchObject({ flagged: true, single: 300, ao5: null });
  });

  it("stars the PBs whose solve is on the chart", () => {
    const marks = pbMarks(points, [
      { category: "single", timeMs: 20000, solveId: "c1", achievedAt: "" },
      { category: "ao5", timeMs: 22000, solveId: "c5", achievedAt: "" },
      { category: "ao12", timeMs: 19000, solveId: "elsewhere", achievedAt: "" },
      { category: "mean3", timeMs: 21000, solveId: "c3", achievedAt: "" },
    ]);
    expect(marks).toEqual([
      { id: "c1", category: "single", ms: 20000 },
      { id: "c5", category: "ao5", ms: 22000 },
    ]);
  });

  it("finds the nearest point", () => {
    expect(nearestPoint(points, 2.4, (p) => p.idx)?.id).toBe("c3");
    expect(nearestPoint(points, 99, (p) => p.idx)?.id).toBe("c6");
    expect(nearestPoint([], 1, (p: { idx: number }) => p.idx)).toBeNull();
  });
});
