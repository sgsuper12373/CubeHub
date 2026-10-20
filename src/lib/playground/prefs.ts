import { useSyncExternalStore } from "react";

import { DEFAULT_BINDINGS, sanitizeBindings, type KeyBindings } from "./keymap";

/**
 * Playground settings, kept in localStorage on this device. These are
 * preferences, not solves: the playground still stores no solve anywhere.
 *
 * Every read and write tolerates a missing or blocked store (private windows,
 * cleared site data) by falling back to the defaults.
 */
export interface PlaygroundPrefs {
  /** Key chord → move. Starts as notation keys; the user can rebind any of it. */
  keyBindings: KeyBindings;
  /** cubing's `tempoScale`: how fast a turn animates. */
  animationSpeed: number;
  /** Show the hidden faces as floating stickers beside the cube. */
  hintStickers: boolean;
  /** Practice mode: 15 seconds to look at the scramble before the clock runs. */
  inspection: boolean;
  /** 3D 3x3/2x2: swipe a row to turn it, instead of clicking a face. */
  swipeToTurn: boolean;
  /** With swipe on, what a drag that starts off the cube does: move the camera, or turn the cube (x/y/z). */
  dragOffCube: DragOffCube;
  /** The one-time "swipe a row" hint on touch screens has been closed. */
  swipeHintDismissed: boolean;
}

export type DragOffCube = "orbit" | "rotate";

export const ANIMATION_SPEEDS = [1, 2, 3, 5, 8] as const;

export const DEFAULT_PREFS: PlaygroundPrefs = {
  keyBindings: DEFAULT_BINDINGS,
  animationSpeed: 3,
  hintStickers: false,
  inspection: true,
  swipeToTurn: true,
  dragOffCube: "orbit",
  swipeHintDismissed: false,
};

const KEY = "cubehub-playground-prefs";

/** Keep only well-formed fields; anything else falls back to its default. */
export function sanitizePrefs(raw: unknown): PlaygroundPrefs {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    keyBindings: sanitizeBindings(r.keyBindings) ?? DEFAULT_PREFS.keyBindings,
    animationSpeed: ANIMATION_SPEEDS.includes(r.animationSpeed as (typeof ANIMATION_SPEEDS)[number])
      ? (r.animationSpeed as number)
      : DEFAULT_PREFS.animationSpeed,
    hintStickers: typeof r.hintStickers === "boolean" ? r.hintStickers : DEFAULT_PREFS.hintStickers,
    inspection: typeof r.inspection === "boolean" ? r.inspection : DEFAULT_PREFS.inspection,
    swipeToTurn: typeof r.swipeToTurn === "boolean" ? r.swipeToTurn : DEFAULT_PREFS.swipeToTurn,
    dragOffCube: r.dragOffCube === "orbit" || r.dragOffCube === "rotate" ? r.dragOffCube : DEFAULT_PREFS.dragOffCube,
    swipeHintDismissed:
      typeof r.swipeHintDismissed === "boolean" ? r.swipeHintDismissed : DEFAULT_PREFS.swipeHintDismissed,
  };
}

export function loadPrefs(): PlaygroundPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    return sanitizePrefs(raw ? JSON.parse(raw) : null);
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(prefs: PlaygroundPrefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // Storage blocked: the settings still apply for this visit.
  }
}

/*
 * A tiny external store over loadPrefs/savePrefs, so every reader shares one
 * copy and the server render (no localStorage) uses the defaults without a
 * hydration mismatch. Read it with usePlaygroundPrefs().
 */
let cached: PlaygroundPrefs | null = null;
const listeners = new Set<() => void>();

function getSnapshot(): PlaygroundPrefs {
  cached ??= loadPrefs();
  return cached;
}

function getServerSnapshot(): PlaygroundPrefs {
  return DEFAULT_PREFS;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function updatePrefs(patch: Partial<PlaygroundPrefs>): void {
  cached = sanitizePrefs({ ...getSnapshot(), ...patch });
  savePrefs(cached);
  for (const listener of listeners) listener();
}

export function usePlaygroundPrefs(): PlaygroundPrefs {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
