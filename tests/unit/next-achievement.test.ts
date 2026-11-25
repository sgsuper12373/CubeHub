import { describe, expect, it } from "vitest";

import { nextAchievement, type BadgeForProgress, type ProgressInputs } from "@/lib/home/next-achievement";

const badge = (slug: string, type: string, value: Record<string, unknown>, extra: Partial<BadgeForProgress> = {}): BadgeForProgress => ({
  slug,
  title: slug,
  description: "",
  hidden: false,
  unlockedAt: null,
  condition: { type, value },
  ...extra,
});

const inputs: ProgressInputs = {
  totalSolves: 73,
  byEvent: { "333": 60, "222": 13 },
  currentStreak: 3,
  learning: [{ puzzle: "333", slug: "pll", learned: 20, total: 21 }],
  bests: { "333:single": 16_420, "333:ao12": 15_080 },
};

describe("next achievement", () => {
  it("picks the closest unearned badge", () => {
    const next = nextAchievement(
      [
        badge("solves-100", "solve_count", { n: 100 }),
        badge("pll-done", "set_learned", { puzzle: "333", slug: "pll" }),
        badge("streak-7", "streak", { days: 7 }),
      ],
      inputs,
    );
    expect(next).toMatchObject({ slug: "pll-done", detail: "20 of 21 cases learned" });
  });

  it("says how far a time is from the target, rounding up to the next centisecond", () => {
    const next = nextAchievement([badge("333-ao12-sub-15", "average_under", { puzzle: "333", n: 12, ms: 15_000 })], inputs);
    expect(next?.detail).toBe("Best 15.08, 0.09 to go");
    expect(next!.progress).toBeCloseTo(1 - (2 * 80) / 15_000, 5);
    // 25 s against sub-20 is half way, not 80%.
    const far = nextAchievement([badge("333-sub-20", "single_under", { puzzle: "333", ms: 20_000 })], { ...inputs, bests: { "333:single": 25_000 } });
    expect(far!.progress).toBeCloseTo(0.5, 5);
  });

  it("skips earned, hidden, met and unmeasurable badges", () => {
    expect(
      nextAchievement(
        [
          badge("first-solve", "solve_count", { n: 1 }),
          badge("solves-100", "solve_count", { n: 100 }, { unlockedAt: "2026-11-01" }),
          badge("night-owl", "night_solve", {}, { hidden: true }),
          badge("333-sub-20", "single_under", { puzzle: "333", ms: 20_000 }),
          badge("marathon", "solves_in_day", { n: 100 }),
        ],
        inputs,
      ),
    ).toBeNull();
  });

  it("counts events and reports a missing PB as no progress", () => {
    expect(nextAchievement([badge("events-4", "events_count", { n: 4 })], inputs)).toMatchObject({ detail: "2 of 4 events", progress: 0.5 });
    expect(nextAchievement([badge("222-sub", "single_under", { puzzle: "222", ms: 5_000 })], inputs)).toMatchObject({ progress: 0, detail: "No single yet" });
  });
});
