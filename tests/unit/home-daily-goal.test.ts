import { beforeEach, describe, expect, it } from "vitest";

import { DEFAULT_DAILY_GOAL, loadDailyGoal, parseDailyGoal, saveDailyGoal, subscribeDailyGoal } from "@/lib/home/daily-goal";

describe("daily goal", () => {
  beforeEach(() => localStorage.clear());

  it("defaults to 25 and rejects nonsense", () => {
    expect(loadDailyGoal()).toBe(DEFAULT_DAILY_GOAL);
    expect(parseDailyGoal("0")).toBe(25);
    expect(parseDailyGoal("-3")).toBe(25);
    expect(parseDailyGoal("abc")).toBe(25);
    expect(parseDailyGoal("9999")).toBe(25);
    expect(parseDailyGoal("40")).toBe(40);
  });

  it("saves, rounds and tells subscribers", () => {
    let calls = 0;
    const off = subscribeDailyGoal(() => calls++);
    expect(saveDailyGoal(49.6)).toBe(50);
    expect(loadDailyGoal()).toBe(50);
    expect(calls).toBe(1);
    off();
    saveDailyGoal(10);
    expect(calls).toBe(1);
  });
});
