import { describe, it, expect } from "vitest";
import { Alg } from "cubing/alg";
import { cube2x2x2, cube3x3x3 } from "cubing/puzzles";

import { AUF_MOVES, drillAlg, drillPlayerConfig, physicalSetupWith } from "@/lib/drill/case-state";
import { OLL_CASES } from "@/scripts/data/oll-data";
import { ORTEGA_CASES } from "@/scripts/data/ortega-data";
import { PLL_CASES } from "@/scripts/data/pll-data";

/**
 * The Drill Lab's core claim: for ANY algorithm, applying the derived setup to
 * a solved cube and then executing the algorithm returns to solved. If this
 * holds for every seeded algorithm, with every pre-AUF, then every case in the
 * database displays correctly without a solver or a hand-entered setup.
 */
const SETS = [
  { name: "PLL", cases: PLL_CASES, puzzle: cube3x3x3 },
  { name: "OLL", cases: OLL_CASES, puzzle: cube3x3x3 },
  { name: "Ortega", cases: ORTEGA_CASES, puzzle: cube2x2x2 },
];

describe("drill case state: setup is the inverse of the algorithm", () => {
  for (const { name, cases, puzzle } of SETS) {
    it(`${name}: every algorithm, every AUF, returns to solved`, async () => {
      const kpuzzle = await puzzle.kpuzzle();
      const solved = kpuzzle.defaultPattern();
      let checked = 0;

      for (const c of cases) {
        for (const a of c.algorithms) {
          for (const auf of AUF_MOVES) {
            const setup = physicalSetupWith(Alg, a.moves, auf);
            const end = solved.applyAlg(setup).applyAlg(drillAlg(a.moves, auf));
            expect(
              end.experimentalIsSolved({ ignorePuzzleOrientation: true, ignoreCenterOrientation: true }),
              `${name} case ${c.case_number} (${a.moves}) with AUF "${auf}"`,
            ).toBe(true);
            checked++;
          }
        }
      }
      expect(checked).toBeGreaterThan(0);
    });
  }

  it("the setup is a real, non-trivial state (not solved)", async () => {
    const kpuzzle = await cube3x3x3.kpuzzle();
    const tPerm = PLL_CASES.find((c) => c.name.startsWith("T"))!.algorithms[0].moves;
    const state = kpuzzle.defaultPattern().applyAlg(physicalSetupWith(Alg, tPerm, ""));
    expect(state.experimentalIsSolved({ ignorePuzzleOrientation: true, ignoreCenterOrientation: true })).toBe(false);
  });

  it("player config anchors the alg at the end, yellow on top", () => {
    expect(drillPlayerConfig("R U R' U'", "U2")).toEqual({
      alg: "U2 R U R' U'",
      experimentalSetupAlg: "z2",
      experimentalSetupAnchor: "end",
    });
    expect(drillAlg("R U", "")).toBe("R U");
  });
});
