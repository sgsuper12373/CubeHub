import { describe, it, expect } from "vitest";

import { caseDiagram, mainAlgorithm } from "@/lib/learn/case-diagram";
import type { Algorithm } from "@/lib/learn/dal";

function alg(moves: string, is_main = false): Algorithm {
  return {
    id: moves,
    case_id: "c",
    moves,
    move_count: moves.split(" ").length,
    is_main,
    label: null,
    is_approved: true,
  };
}

const SOLVED_FACELETS = "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB";

describe("case card diagram", () => {
  it("draws the main algorithm even when cube_state disagrees with it", () => {
    // The Ortega seed bug: cube_state held the algorithm itself, not its inverse.
    const diagram = caseDiagram({
      cube_state: "R U R' U R U2 R'",
      algorithms: [alg("R U2 R' U' R U' R'"), alg("R U R' U R U2 R'", true)],
    });
    expect(diagram).toEqual({ kind: "algorithm", moves: "R U R' U R U2 R'" });
  });

  it("falls back to the first algorithm when none is marked main", () => {
    const algCase = { cube_state: "", algorithms: [alg("F R U R' U' F'"), alg("f R U R' U' f'")] };
    expect(mainAlgorithm(algCase)?.moves).toBe("F R U R' U' F'");
    expect(caseDiagram(algCase)).toEqual({ kind: "algorithm", moves: "F R U R' U' F'" });
  });

  it("uses cube_state only for a case with no algorithms", () => {
    expect(caseDiagram({ cube_state: SOLVED_FACELETS, algorithms: [] })).toEqual({
      kind: "facelets",
      state: SOLVED_FACELETS,
    });
    expect(caseDiagram({ cube_state: " R U R' ", algorithms: [] })).toEqual({
      kind: "setup",
      moves: "R U R'",
    });
    expect(caseDiagram({ cube_state: "", algorithms: [] })).toEqual({ kind: "none" });
  });
});
