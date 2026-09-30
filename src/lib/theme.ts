/**
 * Cookie-based theme preference. Zero dependencies, no FOUC.
 *
 * Strategy (docs/design-tokens.md):
 * - The `cubehub-theme` cookie is the single source of truth. It holds a
 *   theme id from src/themes ("slate", "paper") or "system"; the legacy
 *   "dark"/"light" values are still read.
 * - Server: layout.tsx renders `data-theme` and `.dark` from the cookie.
 * - "system" is resolved before first paint by the inline head script
 *   (src/themes/init-script.ts) and here on the client via matchMedia.
 * - `.dark` is derived from the theme's `mode` so shadcn `dark:` variants
 *   keep working; token values are keyed on `data-theme`.
 */

import {
  parseThemePreference,
  resolveThemeId,
  THEME_COOKIE,
  themeMode,
  type ThemePreference,
} from "@/themes/preference";
import { DEFAULT_THEME_ID } from "@/themes";

export type { ThemePreference } from "@/themes/preference";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/** Read the preference from a cookie header (works server- and client-side). */
export function getThemeFromCookie(cookieHeader?: string): ThemePreference {
  const raw = cookieHeader
    ?.split(";")
    .find((c) => c.trim().startsWith(`${THEME_COOKIE}=`))
    ?.split("=")[1]
    ?.trim();
  return parseThemePreference(raw);
}

/**
 * Subscription plumbing so components can read the current theme through
 * `useSyncExternalStore` instead of copying it into state inside an effect.
 * The cookie is the source of truth; this just announces when it changes.
 */
const listeners = new Set<() => void>();

export function subscribeTheme(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

/** Client snapshot. Returns a string, so it is stable between reads. */
export function getThemeSnapshot(): ThemePreference {
  return getThemeFromCookie(
    typeof document === "undefined" ? undefined : document.cookie,
  );
}

/** Server snapshot — matches the default the root layout renders. */
export function getThemeServerSnapshot(): ThemePreference {
  return DEFAULT_THEME_ID;
}

/** Set the preference — applies it to <html> and writes the cookie. Client-only. */
export function setTheme(pref: ThemePreference): void {
  if (typeof document === "undefined") return;

  const id = resolveThemeId(
    pref,
    window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark",
  );

  const root = document.documentElement;
  root.dataset.theme = id;
  root.classList.toggle("dark", themeMode(id) === "dark");

  document.cookie = `${THEME_COOKIE}=${pref}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;

  for (const listener of listeners) listener();
}
