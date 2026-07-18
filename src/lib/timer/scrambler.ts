import type { TimerPuzzle } from "./types";

/**
 * Lazy wrapper around cubing.js scramble generation.
 *
 * `cubing/scramble` is imported dynamically on first use so it lands in its
 * own chunk and never enters the initial /timer bundle — the page paints and
 * the timer is interactive before this module even starts downloading.
 * Generation itself runs in a worker cubing.js manages; results are
 * WCA-compliant random-state scrambles.
 */
let scrambleModule: Promise<typeof import("cubing/scramble")> | null = null;

function loadScrambler() {
  scrambleModule ??= import("cubing/scramble");
  return scrambleModule;
}

/** TimerPuzzle values are WCA event IDs, which is what cubing.js expects. */
export async function generateScramble(puzzle: TimerPuzzle): Promise<string> {
  const { randomScrambleForEvent } = await loadScrambler();
  const alg = await randomScrambleForEvent(puzzle);
  return alg.toString();
}
