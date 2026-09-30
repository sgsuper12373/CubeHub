import { create } from "zustand";

import { STOP_DEBOUNCE_MS } from "@/stores/timer-store";

/**
 * The Drill Lab's timer. Deliberately separate from `timer-store`: the drill
 * has no inspection, no hold-to-arm and no scramble, and the main timer should
 * never have to know the drill exists.
 *
 * Phases, one tap (Space or pointer down) each:
 *
 *   normal:       idle ─tap→ running ─tap→ stopped ─tap→ (next case) idle
 *   recognition:  hidden ─tap→ recognising ─tap→ running ─tap→ stopped ─tap→ hidden
 *
 * The timer starts on the tap itself, with no hold, because the user is
 * already holding a physical cube. In recognition mode the case stays hidden
 * until the first tap; the second tap means "recognised, executing", which
 * splits recognition from execution.
 *
 * All timestamps are performance.now() readings.
 */
export type DrillPhase = "idle" | "hidden" | "recognising" | "running" | "stopped";

/** What a tap did, so the component can run the side effects. */
export type PressOutcome =
  | { type: "stopped"; timeMs: number; recognitionMs: number | null }
  | { type: "advance" }
  | { type: "none" };

interface DrillStore {
  phase: DrillPhase;
  recognitionMode: boolean;
  revealedAt: number | null;
  startedAt: number | null;
  stoppedAt: number | null;
  recognitionMs: number | null;
  /** The last rep's execution time, kept for display until the next rep starts. */
  lastTimeMs: number | null;

  press(now: number): PressOutcome;
  /** Esc: abandon the rep in progress without recording it. */
  cancel(): void;
  /** Back to the start of a rep (new case, or mode change). */
  reset(): void;
  setRecognitionMode(on: boolean): void;
}

function restPhase(recognitionMode: boolean): DrillPhase {
  return recognitionMode ? "hidden" : "idle";
}

export const useDrillStore = create<DrillStore>()((set, get) => ({
  phase: "idle",
  recognitionMode: false,
  revealedAt: null,
  startedAt: null,
  stoppedAt: null,
  recognitionMs: null,
  lastTimeMs: null,

  press(now) {
    const s = get();
    switch (s.phase) {
      case "idle":
        set({ phase: "running", startedAt: now, recognitionMs: null, lastTimeMs: null });
        return { type: "none" };
      case "hidden":
        set({ phase: "recognising", revealedAt: now, recognitionMs: null, lastTimeMs: null });
        return { type: "none" };
      case "recognising":
        set({
          phase: "running",
          startedAt: now,
          recognitionMs: Math.round(now - (s.revealedAt ?? now)),
        });
        return { type: "none" };
      case "running": {
        const timeMs = Math.max(1, Math.round(now - (s.startedAt ?? now)));
        set({ phase: "stopped", stoppedAt: now, lastTimeMs: timeMs });
        return { type: "stopped", timeMs, recognitionMs: s.recognitionMs };
      }
      case "stopped":
        // The stopping tap must not also skip the next case.
        if (s.stoppedAt !== null && now - s.stoppedAt < STOP_DEBOUNCE_MS) return { type: "none" };
        set({ phase: restPhase(s.recognitionMode), revealedAt: null, startedAt: null });
        return { type: "advance" };
    }
  },

  cancel() {
    const s = get();
    if (s.phase === "running" || s.phase === "recognising") {
      set({ phase: restPhase(s.recognitionMode), revealedAt: null, startedAt: null, recognitionMs: null });
    }
  },

  reset() {
    set((s) => ({
      phase: restPhase(s.recognitionMode),
      revealedAt: null,
      startedAt: null,
      stoppedAt: null,
      recognitionMs: null,
    }));
  },

  setRecognitionMode(on) {
    set({
      recognitionMode: on,
      phase: restPhase(on),
      revealedAt: null,
      startedAt: null,
      stoppedAt: null,
      recognitionMs: null,
    });
  },
}));
