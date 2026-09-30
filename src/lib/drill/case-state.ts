import type { Alg } from "cubing/alg";

import { loadAlg } from "@/lib/cubing/runtime";

/**
 * How the Drill Lab shows a case: the inverse of the algorithm, applied to a
 * solved cube.
 *
 * We never search for a scramble that produces a case. twisty-player is given
 * the real algorithm with `experimentalSetupAnchor: "end"`, which means "the
 * cube is solved at the END of this alg". So the state it shows at the start is
 * exactly the inverse of the algorithm, and pressing play executes the real
 * algorithm forward to solved. It is deterministic, needs no solver, and works
 * for every case in the database, including ones added later, because it
 * derives from the algorithm rather than a hand-entered `setup_moves`.
 *
 * "Show me the case" and "time my execution" are the same primitive.
 */

/** Cases are shown yellow-on-top, the convention everywhere else in the app. */
export const CASE_ORIENTATION = "z2";

/**
 * Pre-AUF: a random U turn before the algorithm, so a case is not always seen
 * from the same angle. Without it, users learn to recognise one picture rather
 * than the case.
 */
export const AUF_MOVES = ["", "U", "U'", "U2"] as const;
export type Auf = (typeof AUF_MOVES)[number];

export function randomAuf(random: () => number = Math.random): Auf {
  return AUF_MOVES[Math.floor(random() * AUF_MOVES.length)];
}

/** The moves the user executes for this rep: the AUF, then the algorithm. */
export function drillAlg(moves: string, auf: Auf): string {
  return `${auf} ${moves}`.trim();
}

/** twisty-player options that display the case and play the algorithm forward. */
export function drillPlayerConfig(moves: string, auf: Auf) {
  return {
    alg: drillAlg(moves, auf),
    experimentalSetupAlg: CASE_ORIENTATION,
    experimentalSetupAnchor: "end" as const,
  };
}

/**
 * Moves that set the case up on a physical cube, held yellow-on-top: the
 * inverse of what the user will execute. Takes the Alg class so it can be
 * tested against cubing directly. The app goes through `physicalSetup`.
 */
export function physicalSetupWith(AlgClass: typeof Alg, moves: string, auf: Auf): string {
  return new AlgClass(drillAlg(moves, auf)).invert().toString();
}

export async function physicalSetup(moves: string, auf: Auf): Promise<string> {
  const { Alg } = await loadAlg();
  return physicalSetupWith(Alg, moves, auf);
}
