import { describe, expect, it } from "vitest";

import { nextSetLine, suggestNextSet, type SetProgress } from "@/lib/learn/next-set";

const names = {
  "333/pll": "PLL",
  "333/oll": "OLL",
  "222/beginner": "Beginner",
  "222/ortega": "Ortega",
  "222/cll": "CLL",
  "222/eg1": "EG-1",
  "222/eg2": "EG-2",
};
const set = (puzzle: string, slug: string, learned: number, total: number): SetProgress => ({
  puzzle,
  slug,
  name: names[`${puzzle}/${slug}` as keyof typeof names],
  learned,
  total,
});

describe("what to learn next", () => {
  it("starts a new cuber on PLL", () => {
    const s = suggestNextSet([], names)!;
    expect(s).toMatchObject({ puzzle: "333", slug: "pll", kind: "start" });
    expect(nextSetLine(s)).toBe("Start with PLL: the biggest jump for most cubers.");
  });

  it("finishes the set furthest along first", () => {
    const s = suggestNextSet([set("333", "oll", 10, 57), set("222", "ortega", 10, 12)], names)!;
    expect(s).toMatchObject({ slug: "ortega", kind: "continue" });
    expect(nextSetLine(s)).toBe("2 cases left in Ortega.");
  });

  it("moves on along the path once a set is done", () => {
    const s = suggestNextSet([set("333", "pll", 21, 21)], names)!;
    expect(s).toMatchObject({ slug: "oll", kind: "next", after: "PLL" });
    expect(nextSetLine(s)).toBe("You know all of PLL. Next up: OLL.");
    expect(suggestNextSet([set("222", "beginner", 6, 6), set("222", "ortega", 12, 12)], names)).toMatchObject({
      puzzle: "222",
      slug: "cll",
      after: "Ortega",
    });
  });

  it("suggests the other puzzle when one path is done, and nothing when all are", () => {
    expect(suggestNextSet([set("333", "pll", 21, 21), set("333", "oll", 57, 57)], names)).toMatchObject({
      puzzle: "222",
      slug: "beginner",
      kind: "next",
    });
    const all = Object.keys(names).map((k) => {
      const [p, s] = k.split("/");
      return set(p, s, 5, 5);
    });
    expect(suggestNextSet(all, names)).toBeNull();
  });

  it("skips sets the Learn index doesn't list", () => {
    expect(suggestNextSet([], { "222/beginner": "Beginner" })).toMatchObject({ puzzle: "222", slug: "beginner" });
  });
});
