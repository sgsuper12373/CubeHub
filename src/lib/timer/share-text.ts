import { eventLabel } from "./events";
import { formatAverage, formatResult } from "./format";
import { trimmedIndices, windowStat, type WindowSize } from "./stats";
import type { Solve, TimerPuzzle } from "./types";

/**
 * An average as plain text, in the shape cubers already paste from csTimer:
 *
 *   3x3 Ao5: 12.34 · CubeHub · 11 Oct 2026
 *
 *   1. 11.20   R U R' …
 *   2. (10.90)   F2 D …
 *
 * Solves are numbered oldest first, and the ones the average throws away are
 * in brackets. Pure, so the exact text is unit-tested.
 */

export const WINDOW_LABEL: Record<WindowSize, string> = {
  3: "Mo3",
  5: "Ao5",
  12: "Ao12",
  50: "Ao50",
  100: "Ao100",
};

function dateLine(when: Date): string {
  return when.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * @param solves newest first; the window is the newest `n`
 * @returns null while there are fewer than `n` solves
 */
export function formatAverageText(
  solves: Solve[],
  n: WindowSize,
  puzzle: TimerPuzzle,
  when: Date = new Date(),
): string | null {
  if (solves.length < n) return null;
  const window = solves.slice(0, n);
  const trimmed = trimmedIndices(window);
  const value = formatAverage(windowStat(window, n));

  const lines = window
    .map((s, i) => {
      const t = formatResult(s.timeMs, s.penalty);
      return { time: trimmed.has(i) ? `(${t})` : t, scramble: s.scramble };
    })
    .reverse()
    .map((row, i) => `${i + 1}. ${row.time}${row.scramble ? `   ${row.scramble.replace(/\s*\n\s*/g, " ")}` : ""}`);

  return [
    `${eventLabel(puzzle)} ${WINDOW_LABEL[n]}: ${value} · CubeHub · ${dateLine(when)}`,
    "",
    ...lines,
  ].join("\n");
}

/** A single as text: the time and its scramble. */
export function formatSingleText(solve: Solve, puzzle: TimerPuzzle, when: Date = new Date()): string {
  return [
    `${eventLabel(puzzle)} single: ${formatResult(solve.timeMs, solve.penalty)} · CubeHub · ${dateLine(when)}`,
    "",
    solve.scramble.replace(/\s*\n\s*/g, " "),
  ].join("\n");
}
