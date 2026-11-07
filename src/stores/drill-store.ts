import { create } from "zustand";

import { STOP_DEBOUNCE_MS } from "@/stores/timer-store";

/**
 * The Drill Lab's timer. Deliberately separate from `timer-store`: the drill
 * has no inspection, no hold-to-arm and no scramble, and the main timer should
 * never have to know the drill exists.
 *
 * Phases, one tap (Space or the start pad) each:
 *
 *   idle ─tap→ running ─tap→ stopped ─tap→ (next case) idle
 *
 * The timer starts on the tap itself, with no hold, because the user is
 * already holding a physical cube that they set up while the case was shown.
 *
 * (There used to be a recognition split: the case stayed hidden until a tap.
 * It was removed in Nov 2026 because the reveal left no untimed moment to set
 * the physical cube up, so the "recognition" time was mostly setup time.)
 *
 * All timestamps are performance.now() readings.
 */
export type DrillPhase = "idle" | "running" | "stopped";

/** What a tap did, so the component can run the side effects. */
export type PressOutcome =
  | { type: "stopped"; timeMs: number }
  | { type: "advance" }
  | { type: "none" };

interface DrillStore {
  phase: DrillPhase;
  startedAt: number | null;
  stoppedAt: number | null;
  /** The last rep's execution time, kept for display until the next rep starts. */
  lastTimeMs: number | null;

  press(now: number): PressOutcome;
  /** Esc: abandon the rep in progress without recording it. */
  cancel(): void;
  /** Back to the start of a rep (new case or new set). */
  reset(): void;
}

export const useDrillStore = create<DrillStore>()((set, get) => ({
  phase: "idle",
  startedAt: null,
  stoppedAt: null,
  lastTimeMs: null,

  press(now) {
    const s = get();
    switch (s.phase) {
      case "idle":
        set({ phase: "running", startedAt: now, lastTimeMs: null });
        return { type: "none" };
      case "running": {
        const timeMs = Math.max(1, Math.round(now - (s.startedAt ?? now)));
        set({ phase: "stopped", stoppedAt: now, lastTimeMs: timeMs });
        return { type: "stopped", timeMs };
      }
      case "stopped":
        // The stopping tap must not also skip the next case.
        if (s.stoppedAt !== null && now - s.stoppedAt < STOP_DEBOUNCE_MS) return { type: "none" };
        set({ phase: "idle", startedAt: null });
        return { type: "advance" };
    }
  },

  cancel() {
    if (get().phase === "running") set({ phase: "idle", startedAt: null });
  },

  reset() {
    set({ phase: "idle", startedAt: null, stoppedAt: null });
  },
}));
