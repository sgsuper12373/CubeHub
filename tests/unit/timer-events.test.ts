import { afterEach, describe, expect, it } from "vitest";

import {
  DEFAULT_EVENT,
  eventLabel,
  isCubeEvent,
  isTimerEvent,
  loadLastEvent,
  saveLastEvent,
  TIMER_EVENTS,
  timerEvent,
} from "@/lib/timer/events";
import { exportFilename } from "@/lib/timer/export";
import { parseCsTimer } from "@/lib/timer/import-cstimer";
import { bestAverageOfN, meanOfN, windowStat } from "@/lib/timer/stats";
import type { Penalty, SolveMetric } from "@/lib/timer/types";

describe("timer events", () => {
  it("offers the eight popular events, 3x3 first", () => {
    expect(TIMER_EVENTS.map((e) => e.id)).toEqual([
      "333", "222", "444", "555", "333oh", "pyra", "skewb", "mega",
    ]);
    expect(DEFAULT_EVENT).toBe("333");
  });

  it("maps our ids to cubing.js event ids where they differ", () => {
    expect(timerEvent("mega").cubingEvent).toBe("minx");
    expect(timerEvent("pyra").cubingEvent).toBe("pyram");
    expect(timerEvent("333oh").cubingEvent).toBe("333oh");
    expect(timerEvent("333oh").twisty).toBe("3x3x3");
  });

  it("labels events and falls back for unknown ids", () => {
    expect(eventLabel("pyra")).toBe("Pyraminx");
    expect(eventLabel("sq1")).toBe("sq1");
    expect(timerEvent("nonsense").id).toBe("333");
    expect(isTimerEvent("skewb")).toBe(true);
    expect(isTimerEvent("pyram")).toBe(false);
  });

  it("knows which events are NxN cubes", () => {
    expect(isCubeEvent("555")).toBe(true);
    expect(isCubeEvent("333oh")).toBe(true);
    expect(isCubeEvent("skewb")).toBe(false);
    expect(isCubeEvent("mega")).toBe(false);
  });

  it("names export files after the event", () => {
    expect(exportFilename("333oh", "csv")).toMatch(/^cubehub-3x3-oh-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(exportFilename("pyra", "json")).toMatch(/^cubehub-pyraminx-/);
  });
});

describe("last-used event", () => {
  afterEach(() => localStorage.clear());

  it("remembers a valid event and ignores junk", () => {
    expect(loadLastEvent()).toBe("333");
    saveLastEvent("skewb");
    expect(loadLastEvent()).toBe("skewb");
    localStorage.setItem("cubehub.timer.event", "sq1");
    expect(loadLastEvent()).toBe("333");
  });
});

const solve = (timeMs: number, penalty: Penalty = "none") => ({
  timeMs,
  penalty,
  effectiveTimeMs: null,
});

describe("meanOfN (Mo3)", () => {
  it("is the plain mean rounded to centiseconds, newest first", () => {
    // Same numbers as supabase/tests/timer_round_test.sql.
    expect(meanOfN([solve(12500), solve(11000), solve(10000)], 3)).toBe(11170);
    expect(meanOfN([solve(12500), solve(11000), solve(10000, "plus2")], 3)).toBe(11830);
  });

  it("is DNF with any DNF and null while short", () => {
    expect(meanOfN([solve(9000, "dnf"), solve(12500), solve(11000)], 3)).toBe("DNF");
    expect(meanOfN([solve(12500), solve(11000)], 3)).toBeNull();
  });

  it("only looks at the newest three", () => {
    expect(meanOfN([solve(3000), solve(3000), solve(3000), solve(1, "dnf")], 3)).toBe(3000);
  });

  it("windowStat dispatches 3 to the mean and the rest to trimmed averages", () => {
    const five = [solve(10000), solve(11000), solve(12000), solve(13000), solve(30000)];
    expect(windowStat(five, 3)).toBe(11000);
    expect(windowStat(five, 5)).toBe(12000);
  });
});

describe("bestAverageOfN with Mo3", () => {
  const metric = (id: string, sessionId: string, timeMs: number, second: number, penalty: Penalty = "none"): SolveMetric => ({
    id,
    sessionId,
    timeMs,
    penalty,
    effectiveTimeMs: null,
    createdAt: new Date(Date.UTC(2026, 9, 11, 0, 0, second)).toISOString(),
  });

  it("finds the best mean of 3 and skips windows with a DNF", () => {
    // Newest first, as the repo returns them.
    const solves = [
      metric("d", "s1", 9000, 4, "dnf"),
      metric("c", "s1", 12500, 3),
      metric("b", "s1", 11000, 2),
      metric("a", "s1", 10000, 1),
    ];
    expect(bestAverageOfN(solves, 3)).toEqual({
      timeMs: 11170,
      solveId: "c",
      achievedAt: solves[1].createdAt,
    });
  });

  it("never spans two sessions", () => {
    const solves = [
      metric("c", "s2", 10000, 3),
      metric("b", "s1", 10000, 2),
      metric("a", "s1", 10000, 1),
    ];
    expect(bestAverageOfN(solves, 3)).toBeNull();
  });
});

describe("imports with the new events", () => {
  it("accepts a CubeHub backup for Pyraminx", () => {
    const backup = {
      version: 1,
      puzzle: "pyra",
      sessions: [{ id: "6f1c4a8e-1b2c-4d3e-8f9a-0b1c2d3e4f5a", puzzle: "pyra", name: "Pyra" }],
      solves: [
        {
          id: "7a2b3c4d-5e6f-4a1b-9c2d-3e4f5a6b7c8d",
          sessionId: "6f1c4a8e-1b2c-4d3e-8f9a-0b1c2d3e4f5a",
          puzzle: "pyra",
          timeMs: 4321,
          penalty: "none",
          scramble: "R U L' b",
          notes: null,
          createdAt: "2026-10-11T00:00:00.000Z",
        },
      ],
    };
    const parse = parseCsTimer(JSON.stringify(backup), "pyra");
    expect(parse.warnings).toEqual([]);
    expect(parse.totalSolves).toBe(1);
    expect(parse.sessions[0].puzzle).toBe("pyra");
  });
});
