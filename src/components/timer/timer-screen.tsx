"use client";

import { useEffect, useRef } from "react";

import { PenaltyBar } from "@/components/timer/penalty-bar";
import { ScrambleBar } from "@/components/timer/scramble-bar";
import { SessionSwitcher } from "@/components/timer/session-switcher";
import { TimeDisplay } from "@/components/timer/time-display";
import { TouchStage } from "@/components/timer/touch-stage";
import { generateScramble } from "@/lib/timer/scrambler";
import type { Penalty, TimerSettings } from "@/lib/timer/types";
import { useSessionStore } from "@/stores/session-store";
import { useTimerStore } from "@/stores/timer-store";

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
  const settings = useTimerStore((s) => s.settings);
  const applySettings = useTimerStore((s) => s.applySettings);
  const resultPenalty = useTimerStore((s) => s.inspectionPenalty);

  const sessions = useSessionStore((s) => s.sessions);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);

  const lastRecordedStopRef = useRef<number | null>(null);

  useEffect(() => {
    if (props.initialSettings) applySettings(props.initialSettings);
  }, [props.initialSettings, applySettings]);

  useEffect(() => {
    void useSessionStore.getState().hydrate(props.userId);
  }, [props.userId]);

  // Keep both scramble slots (current + prefetched next) filled. Runs after
  // paint, so cubing.js — a separate lazy chunk — never blocks first render.
  // Re-runs whenever a slot empties (solve advanced, skip, puzzle switch);
  // the cancellation flag plus the puzzle guard drop stale results.
  useEffect(() => {
    if (scramble.alg !== null && scramble.next !== null) return;
    let cancelled = false;
    (async () => {
      try {
        const alg = await generateScramble(puzzle);
        const store = useTimerStore.getState();
        if (!cancelled && store.puzzle === puzzle) store.receiveScramble(alg);
      } catch (err) {
        console.error("scramble generation failed", err);
        if (!cancelled) useTimerStore.getState().setScrambleGenerating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scramble.alg, scramble.next, puzzle]);

  // Record the solve exactly once per stop. `stoppedAt` is unique per solve,
  // which makes this idempotent across re-renders and dev double-effects.
  useEffect(() => {
    if (phase !== "stopped") return;
    const t = useTimerStore.getState();
    if (
      t.stoppedAt === null ||
      t.finalElapsedMs === null ||
      lastRecordedStopRef.current === t.stoppedAt
    )
      return;
    lastRecordedStopRef.current = t.stoppedAt;
    void useSessionStore.getState().addSolve({
      id: crypto.randomUUID(),
      puzzle: t.puzzle,
      timeMs: Math.max(1, Math.round(t.finalElapsedMs)), // DB check: time_ms > 0
      penalty: t.inspectionPenalty,
      scramble: t.scramble.alg ?? "",
      createdAt: new Date().toISOString(),
    });
  }, [phase]);

  const togglePenalty = (p: Exclude<Penalty, "none">) => {
    const last = useSessionStore.getState().solves[0];
    if (!last) return;
    const next: Penalty = last.penalty === p ? "none" : p;
    void useSessionStore.getState().setPenalty(last.id, next);
    useTimerStore.getState().setResultPenalty(next);
  };

  const deleteLast = () => {
    const timer = useTimerStore.getState();
    const last = useSessionStore.getState().solves[0];
    if (last) void useSessionStore.getState().deleteSolve(last.id);
    timer.advanceScramble(); // a deleted scramble is spent — fresh one next
    timer.clearResult();
  };

  const changePuzzle = (p: typeof puzzle) => {
    useTimerStore.getState().setPuzzle(p);
    void useSessionStore.getState().setPuzzle(p);
  };

  const solving =
    phase === "holding" || phase === "ready" || phase === "running";

  return (
    <div className="flex flex-1 flex-col">
      <div
        className={
          "transition-opacity duration-150 " +
          (solving ? "pointer-events-none opacity-0" : "opacity-100")
        }
      >
        <ScrambleBar
          alg={scramble.alg}
          generating={scramble.generating}
          puzzle={puzzle}
          onNext={() => useTimerStore.getState().skipScramble()}
          onCopy={() => {
            const { alg } = useTimerStore.getState().scramble;
            if (alg) void navigator.clipboard.writeText(alg);
          }}
          onTogglePreview={() =>
            applySettings({ showScramblePreview: !settings.showScramblePreview })
          }
          previewOn={settings.showScramblePreview}
        />
        <SessionSwitcher
          sessions={sessions}
          activeId={activeSessionId}
          puzzle={puzzle}
          onSelect={(id) => void useSessionStore.getState().switchSession(id)}
          onCreate={(name) => void useSessionStore.getState().createSession(name)}
          onRename={(id, name) =>
            void useSessionStore.getState().renameSession(id, name)
          }
          onReset={() => {
            // The undo handle feeds the toast system in the stats step;
            // until then a confirm guards the destructive action.
            if (window.confirm("Clear all solves in this session?")) {
              void useSessionStore.getState().resetSession();
            }
          }}
          onPuzzleChange={changePuzzle}
        />
      </div>

      <TouchStage>
        <TimeDisplay hideWhileSolving={settings.hideTimeWhileSolving} />
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

      {phase === "stopped" && (
        <PenaltyBar
          penalty={resultPenalty}
          onPlus2={() => togglePenalty("plus2")}
          onDnf={() => togglePenalty("dnf")}
          onDelete={deleteLast}
        />
      )}
    </div>
  );
}
