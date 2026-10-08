import { isRotation, moveCount } from "./history";

/**
 * Practice mode: a timed virtual solve. Scramble → optional inspection → the
 * clock starts on the first turn (rotations to look around don't count) →
 * stops when the cube is solved. Nothing is stored; the result lives in the
 * page until the next scramble.
 *
 * Pure transitions, so the screen drives them from its turn handler and the
 * tests can step through a solve without a browser.
 */

export const INSPECTION_MS = 15_000;

export interface PracticeResult {
  ms: number;
  moves: number;
  /** Turns per second; 0 when the time is too small to divide by. */
  tps: number;
}

/** Every phase but idle belongs to one scramble; a new one makes it stale. */
export type PracticePhase =
  | { kind: "idle" }
  | { kind: "inspecting"; scramble: string; since: number }
  | { kind: "ready"; scramble: string }
  | { kind: "running"; scramble: string; start: number }
  | { kind: "done"; scramble: string; result: PracticeResult };

export const IDLE: PracticePhase = { kind: "idle" };

export function armPractice(scramble: string, inspection: boolean, now: number): PracticePhase {
  return inspection ? { kind: "inspecting", scramble, since: now } : { kind: "ready", scramble };
}

/**
 * When the clock starts for a turn at `t`. Inspection that runs past 15s
 * starts the clock at the 15s mark, so waiting longer doesn't help.
 */
function startTime(phase: PracticePhase, t: number): number {
  if (phase.kind === "inspecting") return Math.min(t, phase.since + INSPECTION_MS);
  return t;
}

/**
 * The phase after a turn. `movesAfter` is the whole attempt including this
 * turn; `solvedAfter` is whether the cube is solved once it lands.
 */
export function practiceAfterTurn(
  phase: PracticePhase,
  move: string,
  t: number,
  movesAfter: readonly string[],
  solvedAfter: boolean,
): PracticePhase {
  if (phase.kind === "inspecting" || phase.kind === "ready") {
    if (isRotation(move)) return phase;
    const start = startTime(phase, t);
    if (solvedAfter) return finish(phase.scramble, start, t, movesAfter);
    return { kind: "running", scramble: phase.scramble, start };
  }
  if (phase.kind === "running" && solvedAfter) return finish(phase.scramble, phase.start, t, movesAfter);
  return phase;
}

function finish(scramble: string, start: number, end: number, moves: readonly string[]): PracticePhase {
  const ms = Math.max(0, end - start);
  const count = moveCount(moves);
  return { kind: "done", scramble, result: { ms, moves: count, tps: ms >= 100 ? count / (ms / 1000) : 0 } };
}

/** The phase as it applies to the cube now: stale phases read as idle. */
export function currentPractice(phase: PracticePhase, scramble: string): PracticePhase {
  return phase.kind !== "idle" && phase.scramble !== scramble ? IDLE : phase;
}
