import type { KPuzzle } from "cubing/kpuzzle";

import { loadPuzzles } from "@/lib/cubing/runtime";

import type { PlaygroundPuzzle } from "./puzzles";

/**
 * Puzzle-state checks, done on cubing's KPuzzle model rather than by asking the
 * <twisty-player>. They are plain synchronous calls once the model is loaded,
 * and the functions take the KPuzzle as an argument so tests can pass one in
 * directly (the app never value-imports cubing; see lib/cubing/runtime.ts).
 */

export async function loadKPuzzle(puzzle: PlaygroundPuzzle): Promise<KPuzzle> {
  const { cube2x2x2, cube3x3x3 } = await loadPuzzles();
  return (puzzle === "222" ? cube2x2x2 : cube3x3x3).kpuzzle();
}

/**
 * Whether `move` is a legal move on this puzzle. Clicking the 3D cube can
 * produce moves the keyboard never does (shift-click gives a `2R` slice), and
 * a 2x2 has no slices at all, so every incoming move is checked here first.
 */
export function isValidMoveWith(kpuzzle: KPuzzle, move: string): boolean {
  try {
    kpuzzle.algToTransformation(move);
    return true;
  } catch {
    return false;
  }
}

/**
 * Solved, however the cube is held: after a `y` the stickers are all still in
 * place, and so is a 3x3 whose centres have been turned (a plain cube has no
 * marked centres to tell).
 */
export function isSolvedWith(kpuzzle: KPuzzle, scramble: string, moves: readonly string[]): boolean {
  const alg = [scramble, ...moves].join(" ").trim();
  return kpuzzle
    .defaultPattern()
    .applyAlg(alg)
    .experimentalIsSolved({ ignorePuzzleOrientation: true, ignoreCenterOrientation: true });
}
