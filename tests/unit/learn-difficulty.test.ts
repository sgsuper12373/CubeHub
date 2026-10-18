import { describe, expect, it } from "vitest";

import { difficultyRange, difficultyRank, toDifficulty } from "@/lib/learn/difficulty";

describe("learn difficulty", () => {
  it("accepts only the enum's values", () => {
    expect(toDifficulty("advanced")).toBe("advanced");
    expect(toDifficulty("hard")).toBeUndefined();
    expect(toDifficulty(null)).toBeUndefined();
  });

  it("ranks beginner 1 to expert 4", () => {
    expect(difficultyRank("beginner")).toBe(1);
    expect(difficultyRank("expert")).toBe(4);
  });

  it("spans a puzzle's series and skips ones without a difficulty", () => {
    expect(difficultyRange([{ difficulty: "intermediate" }, {}, { difficulty: "beginner" }])).toBe(
      "Beginner to Intermediate",
    );
    expect(difficultyRange([{ difficulty: "advanced" }, { difficulty: "advanced" }])).toBe("Advanced");
    expect(difficultyRange([{}, {}])).toBeNull();
  });
});
