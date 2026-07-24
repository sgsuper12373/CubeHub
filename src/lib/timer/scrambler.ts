import { loadScramble } from "@/lib/cubing/runtime";
import type { TimerPuzzle } from "./types";

/**
 * Lazy wrapper around cubing.js scramble generation.
 *
 * Loaded on first use, so the /timer page paints and the timer is interactive
 * before any of this downloads. It comes from `public/cubing/` rather than the
 * bundle — see `lib/cubing/runtime.ts` for why — which is also what lets
 * cubing find its own search worker. Generation runs in that worker; results
 * are WCA-compliant random-state scrambles.
 */
let scrambleModule: Promise<typeof import("cubing/scramble")> | null = null;

function loadScrambler() {
  scrambleModule ??= loadScramble();
  return scrambleModule;
}

/** TimerPuzzle values are WCA event IDs, which is what cubing.js expects. */
export async function generateScramble(puzzle: TimerPuzzle): Promise<string> {
  const { randomScrambleForEvent } = await loadScrambler();
  const alg = await randomScrambleForEvent(puzzle);
  return alg.toString();
}
