import { describe, expect, it } from "vitest";

import { addDays, dayStatus, formatCountdown, isDay, istDay, msUntilNextDay } from "@/lib/daily/day";
import {
  allowedPenalties,
  dailyResultProblem,
  effectiveMs,
  KEEP_DAYS,
  parseStoredAttempts,
  withAttempt,
} from "@/lib/daily/result";

describe("daily scramble: the IST day", () => {
  it("turns over at midnight IST, not UTC", () => {
    // 18:29:59 UTC is 23:59:59 IST; 18:30 UTC is midnight IST.
    expect(istDay(new Date("2026-12-04T18:29:59Z"))).toBe("2026-12-04");
    expect(istDay(new Date("2026-12-04T18:30:00Z"))).toBe("2026-12-05");
    // Early UTC morning is already the same IST date.
    expect(istDay(new Date("2026-12-05T00:00:00Z"))).toBe("2026-12-05");
  });

  it("counts down to the next midnight IST", () => {
    expect(msUntilNextDay(new Date("2026-12-04T18:29:00Z"))).toBe(60_000);
    expect(msUntilNextDay(new Date("2026-12-04T18:30:00Z"))).toBe(24 * 60 * 60_000);
    expect(formatCountdown(4 * 3600_000 + 12 * 60_000 + 30_000)).toBe("4h 12m");
    expect(formatCountdown(12 * 60_000)).toBe("12m");
    expect(formatCountdown(30_000)).toBe("under a minute");
  });

  it("reads only real dates", () => {
    expect(isDay("2026-12-05")).toBe(true);
    for (const bad of ["2026-02-30", "2026-12-5", "today", "", null, 20261205]) expect(isDay(bad)).toBe(false);
  });

  it("knows past, today and future, across months", () => {
    expect(dayStatus("2026-12-04", "2026-12-05")).toBe("past");
    expect(dayStatus("2026-12-05", "2026-12-05")).toBe("today");
    expect(dayStatus("2027-01-01", "2026-12-31")).toBe("future");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("daily scramble: results", () => {
  it("refuses mis-stops and absurd times, but a DNF always posts", () => {
    expect(dailyResultProblem(1999, "none")).toMatch(/mis-stop/);
    expect(dailyResultProblem(2000, "none")).toBeNull();
    expect(dailyResultProblem(61 * 60_000, "plus2")).toMatch(/hour/);
    expect(dailyResultProblem(500, "dnf")).toBeNull();
  });

  it("ranks +2 with the penalty and leaves DNFs unranked", () => {
    expect(effectiveMs(12_340, "none")).toBe(12_340);
    expect(effectiveMs(12_340, "plus2")).toBe(14_340);
    expect(effectiveMs(12_340, "dnf")).toBeNull();
  });

  it("never lets a cuber pick a penalty below what inspection gave", () => {
    expect(allowedPenalties("none")).toEqual(["none", "plus2", "dnf"]);
    expect(allowedPenalties("plus2")).toEqual(["plus2", "dnf"]);
    expect(allowedPenalties("dnf")).toEqual(["dnf"]);
  });

  it("keeps the newest KEEP_DAYS attempts and drops anything malformed", () => {
    let stored = parseStoredAttempts(
      JSON.stringify({ "2026-12-01": { timeMs: 9000, penalty: "none" }, bad: { timeMs: 1, penalty: "none" }, "2026-12-02": { timeMs: -1 } }),
    );
    expect(stored).toEqual({ "2026-12-01": { timeMs: 9000, penalty: "none", posted: false } });
    for (let d = 2; d <= KEEP_DAYS + 2; d++) stored = withAttempt(stored, addDays("2026-12-01", d - 1), { timeMs: 10_000, penalty: "plus2", posted: true });
    const kept = Object.keys(stored).sort();
    expect(kept).toHaveLength(KEEP_DAYS);
    expect(kept[0]).toBe(addDays("2026-12-01", 2));
    expect(parseStoredAttempts("not json")).toEqual({});
  });
});
