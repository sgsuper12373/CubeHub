import { describe, expect, it } from "vitest";

import { homeSnapshot } from "@/lib/home/snapshot";
import type { SolveMetric } from "@/lib/timer/types";

const NOW = new Date(2026, 10, 25, 18, 0); // Wednesday 25 Nov 2026, local time

let n = 0;
function solve(daysAgo: number, timeMs: number, sessionId = "s1", over: Partial<SolveMetric> = {}): SolveMetric {
  const d = new Date(NOW);
  d.setDate(d.getDate() - daysAgo);
  d.setMinutes(d.getMinutes() - n++);
  return { id: `x${n}`, sessionId, timeMs, penalty: "none", effectiveTimeMs: null, createdAt: d.toISOString(), ...over };
}

describe("homeSnapshot", () => {
  it("averages only the newest session, newest first", () => {
    n = 0;
    const metrics = [
      ...Array.from({ length: 5 }, () => solve(0, 10_000, "new")),
      ...Array.from({ length: 12 }, () => solve(1, 20_000, "old")),
    ];
    const s = homeSnapshot(metrics, [{ category: "single", timeMs: 9_000, solveId: null, achievedAt: "" }], NOW);
    expect(s.ao5).toBe(10_000);
    expect(s.ao12).toBeNull();
    expect(s.pbSingle).toBe(9_000);
    expect(s.total).toBe(17);
  });

  it("counts this week, the streak, today and the last 14 days", () => {
    n = 0;
    const metrics = [solve(0, 12_000), solve(0, 12_000), solve(1, 12_000), solve(2, 12_000), solve(9, 12_000)];
    const s = homeSnapshot(metrics, [], NOW);
    expect(s.today).toBe(2);
    expect(s.streak).toBe(3);
    // Monday 23 to Wednesday 25: 4 solves on 3 days.
    expect(s.weekSolves).toBe(4);
    expect(s.weekDays).toBe(3);
    expect(s.last14).toHaveLength(14);
    expect(s.last14.at(-1)).toEqual({ day: "2026-11-25", count: 2 });
    expect(s.last14.filter((d) => d.count > 0)).toHaveLength(4);
  });

  it("calls the trend improving when the newer half is faster, and skips excluded solves", () => {
    n = 0;
    const newer = Array.from({ length: 10 }, () => solve(0, 10_000));
    const older = Array.from({ length: 10 }, () => solve(1, 14_000));
    const misstop = solve(0, 900, "s1", { excluded: true });
    const s = homeSnapshot([misstop, ...newer, ...older], [], NOW);
    expect(s.trendWord).toBe("improving");
    expect(s.trend).toHaveLength(20);
    expect(s.trend[0]).toBe(14_000);
    expect(s.trend.at(-1)).toBe(10_000);
  });

  it("is empty with no solves", () => {
    const s = homeSnapshot([], [], NOW);
    expect(s).toMatchObject({ pbSingle: null, ao5: null, ao12: null, trend: [], trendWord: null, streak: 0, total: 0 });
  });
});
