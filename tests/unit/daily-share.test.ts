import { describe, expect, it } from "vitest";

import { dailyShareText, dailyStreak } from "@/lib/daily/share";

describe("daily streak", () => {
  it("counts consecutive days ending today or yesterday", () => {
    expect(dailyStreak(["2026-11-23", "2026-11-24", "2026-11-25"], "2026-11-25")).toBe(3);
    // Today not played yet: the streak still stands.
    expect(dailyStreak(["2026-11-23", "2026-11-24"], "2026-11-25")).toBe(2);
    // A missed day breaks it.
    expect(dailyStreak(["2026-11-22", "2026-11-25"], "2026-11-25")).toBe(1);
    expect(dailyStreak(["2026-11-20"], "2026-11-25")).toBe(0);
    expect(dailyStreak(["2026-12-31", "2027-01-01"], "2027-01-01")).toBe(2);
  });
});

describe("daily share text", () => {
  it("has the day, result, place, streak and the link", () => {
    expect(
      dailyShareText({
        day: "2026-11-25",
        timeMs: 12_345,
        penalty: "none",
        rank: 3,
        solved: 41,
        streak: 5,
        url: "https://www.cuberhub.me/timer?daily=2026-11-25",
      }),
    ).toBe("CuberHub daily scramble · Wed, 25 Nov\n12.34 · #3 of 41 · 5-day streak\nhttps://www.cuberhub.me/timer?daily=2026-11-25");
  });

  it("leaves out a missing place and a one-day streak; shows +2 and DNF", () => {
    const base = { day: "2026-11-25", timeMs: 12_345, rank: null, solved: null, streak: 1, url: "u" };
    expect(dailyShareText({ ...base, penalty: "plus2" }).split("\n")[1]).toBe("14.34+");
    expect(dailyShareText({ ...base, penalty: "dnf" }).split("\n")[1]).toBe("DNF");
  });
});
