"use client";

import { useEffect } from "react";

import { TimeDisplay } from "@/components/timer/time-display";
import { TouchStage } from "@/components/timer/touch-stage";
import type { TimerPuzzle, TimerSettings } from "@/lib/timer/types";
import { useTimerStore } from "@/stores/timer-store";

/**
 * Placeholder scramble: random moves, no same-face repeats. Replaced by the
 * WCA random-state generator (cubing.js) in the scrambler step — nothing else
 * may depend on this.
 */
function placeholderScramble(puzzle: TimerPuzzle): string {
  const faces = puzzle === "222" ? ["U", "R", "F"] : ["U", "D", "L", "R", "F", "B"];
  const suffixes = ["", "'", "2"];
  const length = puzzle === "222" ? 9 : 20;
  const moves: string[] = [];
  let prev = "";
  while (moves.length < length) {
    const face = faces[Math.floor(Math.random() * faces.length)];
    if (face === prev) continue;
    prev = face;
    moves.push(face + suffixes[Math.floor(Math.random() * suffixes.length)]);
  }
  return moves.join(" ");
}

/**
 * Client container for /timer: wires the stores to the presentational
 * components. The only stateful component in the tree.
 */
export function TimerScreen(props: {
  isAuthed: boolean;
  userId: string | null;
  initialSettings: TimerSettings | null;
}) {
  const phase = useTimerStore((s) => s.phase);
  const scramble = useTimerStore((s) => s.scramble);
  const puzzle = useTimerStore((s) => s.puzzle);
  const hideWhileSolving = useTimerStore(
    (s) => s.settings.hideTimeWhileSolving,
  );
  const applySettings = useTimerStore((s) => s.applySettings);

  useEffect(() => {
    if (props.initialSettings) applySettings(props.initialSettings);
  }, [props.initialSettings, applySettings]);

  // Keep the current + next scramble slots filled (instant with placeholders;
  // the cubing.js scrambler will take this job over).
  useEffect(() => {
    if (scramble.alg === null || scramble.next === null) {
      useTimerStore.getState().receiveScramble(placeholderScramble(puzzle));
    }
  }, [scramble.alg, scramble.next, puzzle]);

  const solving =
    phase === "holding" || phase === "ready" || phase === "running";

  return (
    <div className="flex flex-1 flex-col">
      <div
        className={
          "flex min-h-16 items-center justify-center px-4 pt-6 transition-opacity duration-150 " +
          (solving ? "opacity-0" : "opacity-100")
        }
      >
        <p className="max-w-2xl text-center font-mono text-base text-muted-foreground md:text-lg">
          {scramble.alg ?? "generating scramble…"}
        </p>
      </div>

      <TouchStage>
        <TimeDisplay hideWhileSolving={hideWhileSolving} />
        <p
          className={
            "h-5 text-sm text-muted-foreground transition-opacity duration-150 " +
            (phase === "idle" || phase === "stopped"
              ? "opacity-100"
              : "opacity-0")
          }
        >
          {phase === "stopped"
            ? "tap or press space for the next scramble"
            : "hold, then release to start"}
        </p>
      </TouchStage>
    </div>
  );
}
