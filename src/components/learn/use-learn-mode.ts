"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Learn mode: after marking a case learned, go straight to the next unlearned
 * one. A per-device preference, so it lives in localStorage; every case page
 * and panel reads the same value and updates together.
 */
const KEY = "cubehub.learnMode";
const listeners = new Set<() => void>();
// Used when storage is blocked, so the toggle still works for this visit.
let fallback = false;

function read(): boolean {
  try {
    const stored = localStorage.getItem(KEY);
    return stored === null ? fallback : stored === "true";
  } catch {
    return fallback;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => e.key === KEY && listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useLearnMode(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(subscribe, read, () => false);
  const set = useCallback((next: boolean) => {
    fallback = next;
    try {
      localStorage.setItem(KEY, String(next));
    } catch {
      // Storage blocked: the toggle just won't be remembered.
    }
    listeners.forEach((l) => l());
  }, []);
  return [on, set];
}
