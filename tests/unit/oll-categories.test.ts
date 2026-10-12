import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect, beforeAll } from "vitest";
import { Alg } from "cubing/alg";
import { cube3x3x3 } from "cubing/puzzles";

import { caseCategories, caseCategory } from "@/lib/learn/case-category";
import { OLL_CASES } from "@/scripts/data/oll-data";

/**
 * The OLL categories seed (supabase/DataSeeds/20261017000000_oll_shape_categories.sql)
 * writes "Group · note" descriptions. This checks the file itself: every case
 * gets a category, the groups are the standard 15, and every factual note
 * ("mirror of OLL n", "symmetric", corner counts) is true of the case's
 * algorithm on a real cube model.
 */
const SEED = readFileSync(
  join(process.cwd(), "supabase/DataSeeds/20261017000000_oll_shape_categories.sql"),
  "utf8",
);

const rows = [...SEED.matchAll(/^\s*\(\s*(\d+), '([^']*)', '([^']*)'\)/gm)].map((m) => ({
  n: Number(m[1]),
  target: m[3],
}));

const GROUPS: Record<string, number[]> = {
  Dot: [1, 2, 3, 4, 17, 18, 19, 20],
  Square: [5, 6],
  "Small Lightning": [7, 8, 11, 12],
  Fish: [9, 10, 35, 37],
  "Knight Move": [13, 14, 15, 16],
  OCLL: [21, 22, 23, 24, 25, 26, 27],
  "Corners Oriented": [28, 57],
  Awkward: [29, 30, 41, 42],
  P: [31, 32, 43, 44],
  T: [33, 45],
  C: [34, 46],
  W: [36, 38],
  "Big Lightning": [39, 40],
  "Small L": [47, 48, 49, 50, 53, 54],
  Line: [51, 52, 55, 56],
};

type Top = { e: number[]; c: number[] };

/** Orientation of the four top edges (UF UR UB UL) and corners (UFR URB UBL ULF). */
let tops: Map<number, Top>;

beforeAll(async () => {
  const kpuzzle = await cube3x3x3.kpuzzle();
  const solved = kpuzzle.defaultPattern();
  tops = new Map(
    OLL_CASES.map((c) => {
      const main = c.algorithms.find((a) => a.is_main) ?? c.algorithms[0];
      const data = solved.applyAlg(new Alg(main.moves).invert()).patternData;
      return [
        c.case_number,
        { e: data.EDGES.orientation.slice(0, 4), c: data.CORNERS.orientation.slice(0, 4) },
      ];
    }),
  );
});

/** The pattern up to a U turn (pre-AUF), as a comparable string. */
function key({ e, c }: Top): string {
  const turns = [0, 1, 2, 3].map((k) => [...e.slice(k), ...e.slice(0, k), ...c.slice(k), ...c.slice(0, k)].join(""));
  return turns.sort()[0];
}

/** Left-right mirror: UR↔UL, UFR↔ULF, URB↔UBL, and corner twists reverse. */
function mirror({ e, c }: Top): Top {
  const twist = (o: number) => (3 - o) % 3;
  return { e: [e[0], e[3], e[2], e[1]], c: [c[3], c[2], c[1], c[0]].map(twist) };
}

const oriented = (xs: number[]) => xs.filter((x) => x === 0).length;

describe("OLL categories seed", () => {
  it("has all 57 cases once", () => {
    expect(rows.map((r) => r.n)).toEqual(Array.from({ length: 57 }, (_, i) => i + 1));
  });

  it("gives every case a category, with one separator", () => {
    for (const { n, target } of rows) {
      expect(caseCategory(target), `OLL ${n}`).not.toBeNull();
      expect(target.split(" · "), `OLL ${n}`).toHaveLength(2);
    }
  });

  it("uses the 15 standard groups", () => {
    const byCase = new Map(rows.map((r) => [r.n, caseCategory(r.target)]));
    for (const [group, cases] of Object.entries(GROUPS)) {
      for (const n of cases) expect(byCase.get(n), `OLL ${n}`).toBe(group);
    }
    expect(caseCategories(rows.map((r) => ({ description: r.target })))).toHaveLength(15);
  });

  it("matches each group's shape on the cube", () => {
    for (const n of GROUPS.Dot) expect(oriented(tops.get(n)!.e), `OLL ${n}`).toBe(0);
    for (const n of GROUPS.OCLL) expect(oriented(tops.get(n)!.e), `OLL ${n}`).toBe(4);
    for (const n of GROUPS["Corners Oriented"]) expect(oriented(tops.get(n)!.c), `OLL ${n}`).toBe(4);
    for (const n of [...GROUPS["Small L"], ...GROUPS.Line]) {
      expect(oriented(tops.get(n)!.c), `OLL ${n}`).toBe(0);
      expect(oriented(tops.get(n)!.e), `OLL ${n}`).toBe(2);
    }
  });

  it("states only true facts in its notes", () => {
    const keys = new Map([...tops].map(([n, t]) => [n, key(t)]));
    expect(new Set(keys.values()).size).toBe(57);

    for (const { n, target } of rows) {
      const note = target.split(" · ")[1];
      const top = tops.get(n)!;
      const mirrored = key(mirror(top));

      const of = note.match(/mirror of OLL (\d+)/);
      if (of) expect(mirrored, `OLL ${n}: ${note}`).toBe(keys.get(Number(of[1])));
      if (note === "symmetric") expect(mirrored, `OLL ${n}`).toBe(keys.get(n));
      if (note === "all corners oriented") expect(oriented(top.c), `OLL ${n}`).toBe(4);
      if (note.startsWith("two ")) {
        const i = [0, 1, 2, 3].filter((k) => top.c[k] === 0);
        expect(i, `OLL ${n}`).toHaveLength(2);
        const diagonal = i[1] - i[0] === 2;
        expect(diagonal, `OLL ${n}: ${note}`).toBe(note.includes("diagonal"));
      }
      if (note === "opposite edges oriented") {
        const i = [0, 1, 2, 3].filter((k) => top.e[k] === 0);
        expect(i[1] - i[0], `OLL ${n}`).toBe(2);
      }
    }
  });

  it("pairs each nicknamed Sune with its mirror", () => {
    const mirrored = key(mirror(tops.get(27)!));
    expect(mirrored).toBe(key(tops.get(26)!));
  });
});
