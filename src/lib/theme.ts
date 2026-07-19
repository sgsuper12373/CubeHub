/**
 * Minimal cookie-based theme utility. Zero dependencies, no FOUC.
 *
 * Strategy:
 * - Server: read `cubehub-theme` cookie in layout.tsx → set class on <html>
 * - Client: toggle class + set cookie so next navigation is correct
 * - "system" preference resolved client-side via matchMedia
 */

export type Theme = "dark" | "light" | "system";

const COOKIE_NAME = "cubehub-theme";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/** Read theme from cookie (works server- and client-side). */
export function getThemeFromCookie(cookieHeader?: string): Theme {
  const raw = cookieHeader
    ?.split(";")
    .find((c) => c.trim().startsWith(`${COOKIE_NAME}=`))
    ?.split("=")[1]
    ?.trim();
  if (raw === "light" || raw === "dark" || raw === "system") return raw;
  return "dark"; // default
}

/** Set theme — updates the <html> class and cookie. Client-only. */
export function setTheme(theme: Theme): void {
  if (typeof document === "undefined") return;

  // Resolve "system" to actual preference
  const resolved =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;

  // Toggle class
  document.documentElement.classList.toggle("dark", resolved === "dark");

  // Persist in cookie
  document.cookie = `${COOKIE_NAME}=${theme}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

/**
 * Resolve a Theme to the effective dark/light value (for display purposes).
 * Client-only due to matchMedia dependency.
 */
export function resolveTheme(theme: Theme): "dark" | "light" {
  if (theme !== "system") return theme;
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}
