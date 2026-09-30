import { DEFAULT_THEME_ID, THEMES, type ThemeId } from "./index";
import type { ThemeMode } from "./types";

/**
 * The user's theme choice. The `cubehub-theme` cookie is the single source of
 * truth (docs/design-tokens.md): the server renders from it, and the inline
 * head script (./init-script.ts) only has work to do for "system".
 */
export type ThemePreference = ThemeId | "system";

export const THEME_COOKIE = "cubehub-theme";

/** Which theme "system" resolves to for each OS colour scheme. */
export const SYSTEM_THEMES: Record<ThemeMode, ThemeId> = {
  dark: "slate",
  light: "paper",
};

// Cookie values written before step 3.
const LEGACY: Record<string, ThemePreference> = { dark: "slate", light: "paper" };

function isThemeId(value: string): value is ThemeId {
  return THEMES.some((t) => t.id === value);
}

/** Parse a raw cookie value. Missing or unknown → the default theme. */
export function parseThemePreference(raw: string | null | undefined): ThemePreference {
  if (!raw) return DEFAULT_THEME_ID;
  if (raw === "system" || isThemeId(raw)) return raw;
  return LEGACY[raw] ?? DEFAULT_THEME_ID;
}

/**
 * Resolve a preference to a concrete theme. The server has no media query,
 * so it passes no `systemMode` and "system" falls back to the default; the
 * head script corrects that before first paint.
 */
export function resolveThemeId(pref: ThemePreference, systemMode?: ThemeMode): ThemeId {
  if (pref !== "system") return pref;
  return systemMode ? SYSTEM_THEMES[systemMode] : DEFAULT_THEME_ID;
}

export function themeMode(id: ThemeId): ThemeMode {
  return THEMES.find((t) => t.id === id)?.mode ?? "dark";
}
