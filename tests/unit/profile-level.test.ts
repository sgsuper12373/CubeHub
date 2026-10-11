import { describe, expect, it } from "vitest";

import { isMethod, LEVEL_LADDERS, levelFor, methodLabel, METHODS } from "@/lib/profile/level";
import { TIMER_EVENTS } from "@/lib/timer/events";

describe("levelFor", () => {
  it("is the tightest rung the Ao12 is strictly under", () => {
    expect(levelFor("333", 19_990)).toEqual({ label: "Sub-20", tier: 4, of: 8 });
    expect(levelFor("333", 20_000)).toEqual({ label: "Sub-30", tier: 3, of: 8 });
    expect(levelFor("333", 7_500)).toEqual({ label: "Sub-8", tier: 8, of: 8 });
  });

  it("writes rungs past a minute as minutes", () => {
    expect(levelFor("444", 100_000)?.label).toBe("Sub-2:00");
    expect(levelFor("mega", 85_000)?.label).toBe("Sub-1:30");
    expect(levelFor("555", 70_000)?.label).toBe("Sub-1:15");
  });

  it("is null with no Ao12, when slower than every rung, or for an unknown event", () => {
    expect(levelFor("333", null)).toBeNull();
    expect(levelFor("333", undefined)).toBeNull();
    expect(levelFor("333", 75_000)).toBeNull();
    expect(levelFor("sq1", 10_000)).toBeNull();
  });

  it("has a ladder, fastest last and strictly falling, for every timer event", () => {
    for (const { id } of TIMER_EVENTS) {
      const ladder = LEVEL_LADDERS[id];
      expect(ladder, id).toBeDefined();
      for (let i = 1; i < ladder.length; i++) expect(ladder[i], id).toBeLessThan(ladder[i - 1]);
    }
  });
});

describe("methods", () => {
  it("knows the six methods and their labels", () => {
    expect(METHODS.map((m) => m.value)).toEqual(["beginner", "cfop", "roux", "zz", "petrus", "other"]);
    expect(isMethod("roux")).toBe(true);
    expect(isMethod("magic")).toBe(false);
    expect(methodLabel("cfop")).toBe("CFOP");
    expect(methodLabel(null)).toBeNull();
  });
});
