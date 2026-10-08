import type { Alg } from "cubing/alg";
import type { KPuzzle } from "cubing/kpuzzle";

import { CASE_ORIENTATION } from "@/lib/drill/case-state";

import { isValidMoveWith } from "./solved";

/**
 * Typed or linked algs, turned into the playground's plain move list. Pure
 * functions that take cubing's Alg class and the KPuzzle as arguments, so the
 * tests can pass them in directly (the app never value-imports cubing; see
 * lib/cubing/runtime.ts).
 */

/** Longest alg text accepted, from the box or a URL. */
export const MAX_ALG_CHARS = 300;

/**
 * Most moves one alg may expand to. `(R U)1000000` is short text but would
 * flood the history, so stop counting there rather than expanding it all.
 */
export const MAX_ALG_MOVES = 300;

export type ParsedAlg = { ok: true; moves: string[] } | { ok: false; error: string };

export function parseAlgWith(AlgClass: typeof Alg, kpuzzle: KPuzzle, text: string): ParsedAlg {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: "Type an algorithm first." };
  if (trimmed.length > MAX_ALG_CHARS) return { ok: false, error: "That algorithm is too long." };

  let alg: Alg;
  try {
    alg = new AlgClass(trimmed);
  } catch {
    return { ok: false, error: `Couldn't read "${trimmed}".` };
  }

  const moves: string[] = [];
  // Leaf moves come out lazily, with commutators and repeats unrolled.
  for (const move of alg.experimentalLeafMoves()) {
    if (moves.length >= MAX_ALG_MOVES) return { ok: false, error: "That algorithm is too long." };
    const s = move.toString();
    if (!isValidMoveWith(kpuzzle, s)) return { ok: false, error: `"${s}" isn't a move on this puzzle.` };
    moves.push(s);
  }
  if (moves.length === 0) return { ok: false, error: "That algorithm has no moves." };
  return { ok: true, moves };
}

/**
 * The cube state an alg solves, held the way Learn shows cases (yellow on top):
 * the inverse of the alg after the case orientation. Doing the alg from here
 * ends solved. Same idea as the Drill Lab (lib/drill/case-state.ts).
 */
export function caseSetupFor(AlgClass: typeof Alg, moves: readonly string[]): string {
  return `${CASE_ORIENTATION} ${new AlgClass(moves.join(" ")).invert().toString()}`.trim();
}

/**
 * `R R U U'` → `R2`, for the "Simplified" line under the history. The raw
 * history and its move count stay as typed, as in csTimer.
 */
export function simplifyWith(AlgClass: typeof Alg, moves: readonly string[]): string {
  if (moves.length === 0) return "";
  return new AlgClass(moves.join(" ")).experimentalSimplify({ cancel: true }).toString();
}
