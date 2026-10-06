import type { PuzzleID } from "cubing/twisty";

import type { TimerPuzzle } from "@/lib/timer/types";

/**
 * Puzzles the playground can show. The same WCA ids the timer uses, so
 * `generateScramble()` works for them unchanged.
 */
export type PlaygroundPuzzle = TimerPuzzle;

export const PLAYGROUND_PUZZLES: readonly { id: PlaygroundPuzzle; label: string }[] = [
  { id: "333", label: "3x3" },
  { id: "222", label: "2x2" },
];

export const DEFAULT_PLAYGROUND_PUZZLE: PlaygroundPuzzle = "333";

export function isPlaygroundPuzzle(value: unknown): value is PlaygroundPuzzle {
  return PLAYGROUND_PUZZLES.some((p) => p.id === value);
}

/** cubing.js puzzle id for a WCA event id. */
export function twistyPuzzleId(puzzle: PlaygroundPuzzle): PuzzleID {
  return puzzle === "222" ? "2x2x2" : "3x3x3";
}
