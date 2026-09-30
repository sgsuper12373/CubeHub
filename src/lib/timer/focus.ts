import type { TimerPhase } from "@/lib/timer/types";

/**
 * Focus Mode (csTimer-style): while a solve is under way, hide everything but
 * the digits. "Under way" starts once the timer is armed (ready) or
 * inspection begins, and ends when it stops. A plain press-and-hold from
 * idle doesn't count yet, so letting go early can't flash the UI away and
 * back; a hold *during* inspection does, so the UI can't reappear mid-solve.
 */
export function isFocusHidden(phase: TimerPhase, inInspection: boolean): boolean {
  return (
    phase === "ready" ||
    phase === "running" ||
    phase === "inspecting" ||
    (phase === "holding" && inInspection)
  );
}

/** <html> attribute that globals.css keys the hiding on. */
export const FOCUS_ATTR = "data-focus-solving";

const STORAGE_KEY = "cubehub-focus-mode";

export function loadFocusMode(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function saveFocusMode(on: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
  } catch {
    // Storage blocked: the mode still applies for this visit.
  }
}
