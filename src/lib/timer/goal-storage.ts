"use client";

import { useSyncExternalStore } from "react";

import type { TimerPuzzle } from "./types";

/**
 * The Stats sub-X goal, per event, on this device only (docs/stats-plan.md:
 * no migration; syncing it is a later option). Unset means "suggest one".
 * Storage can be missing or blocked (private mode), so every access is
 * guarded and the page works without it.
 */

const KEY = "cubehub.stats.goals.v1";
const listeners = new Set<() => void>();
/** Used instead of storage once a write to it has failed. */
let memory: string | null = null;

function snapshot(): string {
  if (memory !== null) return memory;
  try {
    return localStorage.getItem(KEY) ?? "{}";
  } catch {
    return "{}";
  }
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function parse(raw: string): Partial<Record<TimerPuzzle, number>> {
  try {
    const value = JSON.parse(raw);
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

/** The goal the cuber picked for an event, or null. */
export function useStoredGoal(puzzle: TimerPuzzle): number | null {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "{}");
  const ms = parse(raw)[puzzle];
  return typeof ms === "number" && ms > 0 ? ms : null;
}

/** Save (or with null, forget) the goal for an event. */
export function storeGoal(puzzle: TimerPuzzle, ms: number | null): void {
  const goals = parse(snapshot());
  if (ms === null) delete goals[puzzle];
  else goals[puzzle] = ms;
  const raw = JSON.stringify(goals);
  try {
    localStorage.setItem(KEY, raw);
  } catch {
    // Blocked storage: the goal lasts until the page closes.
    memory = raw;
  }
  for (const l of listeners) l();
}
