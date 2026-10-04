import type { AlgorithmCase } from "@/lib/learn/dal";

/**
 * What a case card draws, in order of preference:
 *
 * 1. `algorithm`: the case's main algorithm. The viewer anchors it at the end
 *    (the cube is solved after it), so the picture is exactly the state the
 *    algorithm solves, the same primitive the Drill Lab uses (see
 *    `src/lib/drill/case-state.ts`). It can't drift out of sync with the
 *    algorithm the card lists, which is how hand-entered `cube_state` values
 *    ended up showing the wrong case.
 * 2. `facelets`: a 54-character facelet string painted in the admin editor.
 * 3. `setup`: a hand-entered setup algorithm in `cube_state`.
 *
 * Only a case with no algorithms at all falls through to 2 and 3.
 */
export type CaseDiagram =
  | { kind: "algorithm"; moves: string }
  | { kind: "facelets"; state: string }
  | { kind: "setup"; moves: string }
  | { kind: "none" };

export function mainAlgorithm(algCase: Pick<AlgorithmCase, "algorithms">) {
  return algCase.algorithms.find((a) => a.is_main) ?? algCase.algorithms[0];
}

export function caseDiagram(
  algCase: Pick<AlgorithmCase, "algorithms" | "cube_state">,
): CaseDiagram {
  const moves = mainAlgorithm(algCase)?.moves.trim();
  if (moves) return { kind: "algorithm", moves };

  const state = algCase.cube_state?.trim();
  if (!state) return { kind: "none" };
  if (state.length === 54 && !/\s/.test(state)) return { kind: "facelets", state };
  return { kind: "setup", moves: state };
}
