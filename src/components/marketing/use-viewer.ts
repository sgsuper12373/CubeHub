"use client";

import { useSyncExternalStore } from "react";

import { createClient } from "@/lib/supabase/client";
import { AUTH_COOKIE_PATTERN, SIGNED_OUT_VIEWER, type Viewer } from "@/lib/auth/viewer";

/**
 * The visitor's signed-in state on the static landing page, fetched once from
 * GET /api/viewer and kept for the tab's lifetime. Visitors without an auth
 * cookie are signed out without a request. Refetched when someone signs in or
 * out (here or in another tab): AuthListener's router.refresh() can't update
 * a static page.
 */

let viewer: Viewer | undefined;
let started = false;
let requestId = 0;
const listeners = new Set<() => void>();

function hasAuthCookie(): boolean {
  return AUTH_COOKIE_PATTERN.test(document.cookie);
}

async function load(): Promise<void> {
  const id = ++requestId;
  let next = SIGNED_OUT_VIEWER;
  if (hasAuthCookie()) {
    try {
      const res = await fetch("/api/viewer", { cache: "no-store" });
      if (res.ok) next = (await res.json()) as Viewer;
    } catch {
      // Offline or failed: show the signed-out chrome, as the server did when
      // getUser() failed.
    }
  }
  if (id !== requestId) return;
  viewer = next;
  for (const listener of listeners) listener();
}

function start(): void {
  if (started) return;
  started = true;
  void load();
  let lastUserId: string | null | undefined;
  createClient().auth.onAuthStateChange((_event, session) => {
    const userId = session?.user.id ?? null;
    // The first event reports the current session; load() already covers it.
    if (lastUserId === undefined) {
      lastUserId = userId;
      return;
    }
    if (userId !== lastUserId) {
      lastUserId = userId;
      void load();
    }
  });
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  start();
  return () => {
    listeners.delete(onChange);
  };
}

/** Re-read the viewer, e.g. after notifications were marked read. */
export function refreshViewer(): void {
  void load();
}

/**
 * `viewer` is undefined until GET /api/viewer answers. Until then,
 * `likelySignedIn` guesses from the auth cookie, and is null while rendering
 * on the server or hydrating: markup must then cover both cases, toggled by
 * SIGNED_IN_HINT_ATTR on <html> (see SIGNED_IN_HINT_SCRIPT).
 */
export function useViewer(): { viewer: Viewer | undefined; likelySignedIn: boolean | null } {
  const current = useSyncExternalStore(subscribe, () => viewer, () => undefined);
  const likelySignedIn = useSyncExternalStore(subscribe, hasAuthCookie, () => null);
  return { viewer: current, likelySignedIn };
}
