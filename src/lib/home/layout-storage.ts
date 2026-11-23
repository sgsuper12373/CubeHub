import { parseHomeLayout, type HomeLayout } from "./cards";

/**
 * A guest's Home layout (and a signed-in cuber's until it's copied to their
 * account): the `cubehub.home.v1` localStorage key, read through
 * useSyncExternalStore.
 */
export const HOME_LAYOUT_KEY = "cubehub.home.v1";

const listeners = new Set<() => void>();

export function subscribeHomeLayout(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** The raw string, so the snapshot is stable between reads. */
export function homeLayoutSnapshot(): string | null {
  try {
    return localStorage.getItem(HOME_LAYOUT_KEY);
  } catch {
    return null;
  }
}

export function readLocalHomeLayout(): HomeLayout | null {
  return parseHomeLayout(homeLayoutSnapshot());
}

export function writeLocalHomeLayout(layout: HomeLayout | null): void {
  try {
    if (layout) localStorage.setItem(HOME_LAYOUT_KEY, JSON.stringify(layout));
    else localStorage.removeItem(HOME_LAYOUT_KEY);
  } catch {
    // Blocked storage: the change holds for this page view only.
  }
  listeners.forEach((l) => l());
}
