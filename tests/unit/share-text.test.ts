import { describe, expect, it } from "vitest";

import { recordText } from "@/lib/timer/pb-detect";
import { formatAverageText, formatSingleText } from "@/lib/timer/share-text";
import type { Penalty, Solve } from "@/lib/timer/types";

const WHEN = new Date(Date.UTC(2026, 9, 11, 12));

let n = 0;
function solve(timeMs: number, penalty: Penalty = "none", scramble = `S${n + 1}`): Solve {
  n += 1;
  return {
    id: `s${n}`,
    sessionId: "x",
    puzzle: "333",
    timeMs,
    penalty,
    effectiveTimeMs: null,
    scramble,
    notes: null,
    createdAt: WHEN.toISOString(),
  };
}

describe("formatAverageText", () => {
  it("lists an Ao5 oldest first with trimmed solves in brackets", () => {
    // Newest first, as the session store keeps them.
    const solves = [
      solve(12700, "none", "R U"),
      solve(0, "dnf", "F2 D"),
      solve(13100, "none", "L B'"),
      solve(10900, "none", "U2 R'"),
      solve(11200, "none", "D F"),
    ];
    expect(formatAverageText(solves, 5, "333", WHEN)).toBe(
      [
        "3x3 Ao5: 12.33 · CubeHub · 11 Oct 2026",
        "",
        "1. 11.20   D F",
        "2. (10.90)   U2 R'",
        "3. 13.10   L B'",
        "4. (DNF)   F2 D",
        "5. 12.70   R U",
      ].join("\n"),
    );
  });

  it("uses only the newest n and trims nothing for Mo3", () => {
    const solves = [solve(3000), solve(4000), solve(5000), solve(99000)];
    const text = formatAverageText(solves, 3, "pyra", WHEN)!;
    expect(text.split("\n")[0]).toBe("Pyraminx Mo3: 4.00 · CubeHub · 11 Oct 2026");
    expect(text).not.toContain("(");
    expect(text).not.toContain("1:39");
  });

  it("shows +2 times and a DNF average", () => {
    const solves = [solve(10000, "dnf"), solve(10000, "dnf"), solve(10000, "plus2"), solve(10000), solve(10000)];
    const text = formatAverageText(solves, 5, "333", WHEN)!;
    expect(text.split("\n")[0]).toContain("Ao5: DNF");
    expect(text).toContain("12.00+");
  });

  it("keeps a Megaminx scramble on one line", () => {
    const solves = [solve(60000, "none", "R++ D--\nR-- D++ U"), solve(61000), solve(62000)];
    expect(formatAverageText(solves, 3, "mega", WHEN)).toContain("3. 1:00.00   R++ D-- R-- D++ U");
  });

  it("is null while the window is short", () => {
    expect(formatAverageText([solve(1000)], 5, "333", WHEN)).toBeNull();
  });
});

describe("single and record text", () => {
  it("formats a single with its scramble", () => {
    expect(formatSingleText(solve(9870, "none", "R U R'"), "333", WHEN)).toBe(
      "3x3 single: 9.87 · CubeHub · 11 Oct 2026\n\nR U R'",
    );
  });

  it("recordText picks single or average by category", () => {
    const s = solve(9870, "none", "R U R'");
    expect(recordText({ category: "single", scope: "allTime", timeMs: 9870, previousMs: 10000, solves: [s] }, "333", WHEN))
      .toContain("single: 9.87");
    const window = [solve(3000), solve(4000), solve(5000)];
    expect(recordText({ category: "mean3", scope: "allTime", timeMs: 4000, previousMs: 5000, solves: window }, "333", WHEN))
      .toContain("Mo3: 4.00");
  });
});
