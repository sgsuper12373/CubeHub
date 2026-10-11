import { create } from "zustand";

import {
  DEFAULT_TIMER_SETTINGS,
  type InspectionMode,
  type Penalty,
  type TimerPhase,
  type TimerPuzzle,
  type TimerSettings,
} from "@/lib/timer/types";

/** Hold this long before a press becomes "ready". Reads from settings so users can customize. */
export function getHoldMs(): number {
  return useTimerStore.getState().settings.holdMs;
}
/** Ignore presses this soon after a stop so the stopping tap can't re-arm. */
export const STOP_DEBOUNCE_MS = 200;
/** Inspection overrun beyond the +2 window becomes a DNF (WCA: 15s → +2, 17s → DNF). */
export const DNF_OVERRUN_MS = 2000;

export function inspectionDurationMs(mode: InspectionMode): number | null {
  if (mode === "off") return null;
  return mode === "8s" ? 8_000 : 15_000;
}

/**
 * The current scramble, the prefetched next one, and the one shown before the
 * current (so "previous" can bring it back). `custom` marks a scramble the
 * user pasted in, saved with `scramble_type = 'custom'`.
 */
export interface ScrambleSlots {
  alg: string | null;
  next: string | null;
  generating: boolean;
  custom: boolean;
  prev: { alg: string; custom: boolean } | null;
}

const EMPTY_SCRAMBLE: ScrambleSlots = {
  alg: null,
  next: null,
  generating: true,
  custom: false,
  prev: null,
};

/** Move on to the next scramble, remembering the current one as `prev`. */
function moveOn(s: ScrambleSlots): ScrambleSlots {
  return {
    alg: s.next,
    next: null,
    generating: s.next === null,
    custom: false,
    prev: s.alg !== null ? { alg: s.alg, custom: s.custom } : s.prev,
  };
}

interface TimerStore {
  phase: TimerPhase;
  puzzle: TimerPuzzle;
  settings: TimerSettings;
  // All timestamps are performance.now() readings — never Date.now().
  holdStartedAt: number | null;
  inspectionStartedAt: number | null;
  solveStartedAt: number | null;
  stoppedAt: number | null;
  /** Written exactly once per solve, on stop. Survives into idle as "last result". */
  finalElapsedMs: number | null;
  /** Accrued from inspection overrun; attached to the solve when it is recorded. */
  inspectionPenalty: Penalty;
  scramble: ScrambleSlots;

  /**
   * High-level machine input shared by both engines (keyboard and pointer).
   * The transition table lives here so touch-stage.tsx stays dumb.
   */
  press(now: number): void;
  release(now: number): void;

  // Granular transitions (guards inside; no-ops from a wrong phase)
  arm(now: number): void;
  disarm(): void;
  ready(): void;
  launch(now: number): void;
  stop(now: number): void;
  startInspection(now: number): void;
  markInspectionPenalty(p: Penalty): void;
  /**
   * Edit the displayed result's penalty while `stopped` (the +2/DNF toggles).
   * Unlike markInspectionPenalty this may downgrade — the recorded solve row
   * is updated separately by the session store.
   */
  setResultPenalty(p: Penalty): void;
  /** Blank the last-result display (after deleting the solve it showed). */
  clearResult(): void;
  cancel(): void;
  advanceScramble(): void;

  receiveScramble(alg: string): void;
  /** Discard the current scramble ("new scramble" button); idle only. */
  skipScramble(): void;
  /**
   * Bring back the scramble shown before this one (idle or stopped). An
   * unused random scramble goes back into the `next` slot, so it isn't lost.
   */
  previousScramble(): void;
  /** Use a scramble the user pasted in (idle or stopped). */
  setCustomScramble(alg: string): void;
  setScrambleGenerating(generating: boolean): void;
  setPuzzle(p: TimerPuzzle): void;
  applySettings(s: Partial<TimerSettings>): void;
}

export const useTimerStore = create<TimerStore>()((set, get) => ({
  phase: "idle",
  puzzle: "333",
  settings: DEFAULT_TIMER_SETTINGS,
  holdStartedAt: null,
  inspectionStartedAt: null,
  solveStartedAt: null,
  stoppedAt: null,
  finalElapsedMs: null,
  inspectionPenalty: "none",
  scramble: EMPTY_SCRAMBLE,

  press: (now) => {
    const s = get();
    switch (s.phase) {
      case "idle":
        if (inspectionDurationMs(s.settings.inspectionMode) !== null) {
          s.startInspection(now);
        } else {
          s.arm(now);
        }
        break;
      case "inspecting":
        s.arm(now);
        break;
      case "running":
        s.stop(now);
        break;
      case "stopped":
        if (s.stoppedAt !== null && now - s.stoppedAt < STOP_DEBOUNCE_MS) break;
        // Advance to idle and treat the same press as the next arm/inspection,
        // so holding right after a solve flows straight into the next one.
        s.advanceScramble();
        get().press(now);
        break;
      // holding / ready: a second pointer or key — ignore
    }
  },

  release: (now) => {
    const s = get();
    if (s.phase === "holding") s.disarm();
    else if (s.phase === "ready") s.launch(now);
  },

  arm: (now) => {
    const { phase } = get();
    if (phase !== "idle" && phase !== "inspecting") return;
    set({ phase: "holding", holdStartedAt: now });
  },

  disarm: () => {
    const s = get();
    if (s.phase !== "holding") return;
    // Released before HOLD_MS: fall back to inspection if it was running.
    set({
      phase: s.inspectionStartedAt !== null ? "inspecting" : "idle",
      holdStartedAt: null,
    });
  },

  ready: () => {
    if (get().phase !== "holding") return;
    set({ phase: "ready" });
  },

  launch: (now) => {
    if (get().phase !== "ready") return;
    set({
      phase: "running",
      solveStartedAt: now,
      holdStartedAt: null,
      inspectionStartedAt: null,
      finalElapsedMs: null,
    });
  },

  stop: (now) => {
    const s = get();
    if (s.phase !== "running" || s.solveStartedAt === null) return;
    set({
      phase: "stopped",
      finalElapsedMs: now - s.solveStartedAt,
      stoppedAt: now,
      solveStartedAt: null,
    });
  },

  startInspection: (now) => {
    if (get().phase !== "idle") return;
    set({
      phase: "inspecting",
      inspectionStartedAt: now,
      inspectionPenalty: "none",
    });
  },

  markInspectionPenalty: (p) => {
    const current = get().inspectionPenalty;
    // Only escalate: none → plus2 → dnf. The attempt always continues; the
    // penalty rides along and is applied to the recorded solve (which keeps
    // its real time — the DB requires time_ms > 0 even for a DNF).
    if (p === "plus2" && current === "none") set({ inspectionPenalty: p });
    else if (p === "dnf" && current !== "dnf") set({ inspectionPenalty: p });
  },

  setResultPenalty: (p) => {
    if (get().phase !== "stopped") return;
    set({ inspectionPenalty: p });
  },

  clearResult: () => {
    set({ finalElapsedMs: null, inspectionPenalty: "none" });
  },

  cancel: () => {
    set({
      phase: "idle",
      holdStartedAt: null,
      inspectionStartedAt: null,
      solveStartedAt: null,
      inspectionPenalty: "none",
    });
  },

  advanceScramble: () => {
    const s = get();
    if (s.phase !== "stopped") return;
    set({
      phase: "idle",
      holdStartedAt: null,
      inspectionStartedAt: null,
      inspectionPenalty: "none",
      scramble: moveOn(s.scramble),
    });
  },

  receiveScramble: (alg) => {
    const { scramble } = get();
    if (scramble.alg === null) {
      set({ scramble: { ...scramble, alg, generating: false, custom: false } });
    } else {
      set({ scramble: { ...scramble, next: alg, generating: false } });
    }
  },

  skipScramble: () => {
    const s = get();
    if (s.phase !== "idle") return;
    set({ scramble: moveOn(s.scramble) });
  },

  previousScramble: () => {
    // After a solve, "previous" means "this one again": move on first so the
    // scramble just solved becomes `prev`.
    if (get().phase === "stopped") get().advanceScramble();
    const s = get();
    if (s.phase !== "idle" || s.scramble.prev === null) return;
    const { alg, custom, next } = s.scramble;
    set({
      scramble: {
        alg: s.scramble.prev.alg,
        custom: s.scramble.prev.custom,
        // Keep an unused random scramble for later; a pasted one is dropped.
        next: alg !== null && !custom ? alg : next,
        generating: false,
        prev: null,
      },
    });
  },

  setCustomScramble: (custom) => {
    if (get().phase === "stopped") get().advanceScramble();
    const s = get();
    if (s.phase !== "idle") return;
    const { alg, next } = s.scramble;
    set({
      scramble: {
        alg: custom,
        custom: true,
        next: alg !== null && !s.scramble.custom ? alg : next,
        generating: false,
        prev: alg !== null ? { alg, custom: s.scramble.custom } : s.scramble.prev,
      },
    });
  },

  setScrambleGenerating: (generating) => {
    set({ scramble: { ...get().scramble, generating } });
  },

  setPuzzle: (p) => {
    if (get().puzzle === p) return;
    set({
      puzzle: p,
      scramble: EMPTY_SCRAMBLE,
    });
  },

  applySettings: (partial) => {
    set({ settings: { ...get().settings, ...partial } });
  },
}));
