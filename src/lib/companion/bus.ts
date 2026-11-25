import type { BldPhase } from "@/lib/companion/renderer";

/**
 * The companion's event bus (docs/cubby-cubing-companion.md → Build notes).
 * App code emits facts ("a PB happened", "the timer started"); only the
 * companion listens. Emitters import this file and nothing else from the
 * companion, so the timer never depends on companion UI. With the companion
 * off nobody subscribes and an emit is an empty loop.
 */
export interface CompanionEvents {
  "timer:started": Record<string, never>;
  "timer:stopped": Record<string, never>;
  "inspection:started": Record<string, never>;
  "puzzle:changed": { puzzle: string };
  /** A new all-time record. `time` and `delta` are formatted ("12.84", "0.60"). */
  pb: { time: string; delta: string | null; label: string };
  penalty: { penalty: "plus2" | "dnf" };
  /** Every recorded solve, for the 60-minute stretch reminder. */
  solve: { at: number };
  misstop: Record<string, never>;
  "drill:started": Record<string, never>;
  "drill:mastered": { name: string | null };
  "playground:turned": Record<string, never>;
  "playground:rotated": Record<string, never>;
  "playground:solved": Record<string, never>;
  "learn:opened-case": Record<string, never>;
  error: { message: string };
  "bld:phase": { phase: BldPhase; result?: "ok" | "dnf" };
}

export type CompanionEventName = keyof CompanionEvents;

export const COMPANION_EVENT_NAMES: readonly CompanionEventName[] = [
  "timer:started",
  "timer:stopped",
  "inspection:started",
  "puzzle:changed",
  "pb",
  "penalty",
  "solve",
  "misstop",
  "drill:started",
  "drill:mastered",
  "playground:turned",
  "playground:rotated",
  "playground:solved",
  "learn:opened-case",
  "error",
  "bld:phase",
];

type Listener<K extends CompanionEventName> = (payload: CompanionEvents[K]) => void;

const listeners = new Map<CompanionEventName, Set<Listener<CompanionEventName>>>();

export function emitCompanion<K extends CompanionEventName>(name: K, payload: CompanionEvents[K]): void {
  const set = listeners.get(name);
  if (!set) return;
  for (const l of [...set]) {
    try {
      (l as Listener<K>)(payload);
    } catch (err) {
      // A companion bug must never break the code that emitted the event.
      console.error("companion listener failed", name, err);
    }
  }
}

export function onCompanion<K extends CompanionEventName>(name: K, listener: Listener<K>): () => void {
  let set = listeners.get(name);
  if (!set) {
    set = new Set();
    listeners.set(name, set);
  }
  set.add(listener as Listener<CompanionEventName>);
  return () => {
    set.delete(listener as Listener<CompanionEventName>);
  };
}

export function isCompanionEventName(value: unknown): value is CompanionEventName {
  return typeof value === "string" && (COMPANION_EVENT_NAMES as readonly string[]).includes(value);
}
