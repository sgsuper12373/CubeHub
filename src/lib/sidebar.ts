/**
 * The app sidebar's state, per page group (docs/app-shell-plan.md → The
 * sidebar). Pure, so the cookie format and defaults are unit-tested; the
 * zustand store is src/stores/sidebar-store.ts.
 */

export type SidebarState = "expanded" | "rail" | "hidden";
export type SidebarGroup = "timer" | "practice" | "browse";
/** The user's explicit choices; a group with no entry uses its default. */
export type SidebarPrefs = Partial<Record<SidebarGroup, SidebarState>>;
/**
 * What the sidebar renders. "auto" is the browse default: Rail between md and
 * lg, Expanded from lg, done in CSS so the server can render it without
 * knowing the width and the first paint is already right.
 */
export type SidebarMode = SidebarState | "auto";

export const SIDEBAR_COOKIE = "cubehub-sidebar";
export const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const STATES: readonly SidebarState[] = ["expanded", "rail", "hidden"];
const GROUPS: readonly SidebarGroup[] = ["timer", "practice", "browse"];

/** Timer, and the drill and playground (practice); everything else is browse. */
export function sidebarGroupFor(pathname: string): SidebarGroup {
  if (pathname === "/timer" || pathname.startsWith("/timer/")) return "timer";
  if (/^\/learn\/[^/]+\/drill(\/|$)/.test(pathname)) return "practice";
  if (pathname === "/playground" || pathname.startsWith("/playground/")) return "practice";
  return "browse";
}

export const SIDEBAR_DEFAULTS: Record<SidebarGroup, SidebarMode> = {
  timer: "rail",
  practice: "rail",
  browse: "auto",
};

export function sidebarMode(prefs: SidebarPrefs, group: SidebarGroup): SidebarMode {
  return prefs[group] ?? SIDEBAR_DEFAULTS[group];
}

/** The cookie's value: JSON, URI-encoded so it survives cookie syntax. Junk reads as no choices. */
export function parseSidebarCookie(raw: string | undefined | null): SidebarPrefs {
  if (!raw) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(decodeURIComponent(raw));
  } catch {
    return {};
  }
  if (typeof parsed !== "object" || parsed === null) return {};
  const prefs: SidebarPrefs = {};
  for (const group of GROUPS) {
    const value = (parsed as Record<string, unknown>)[group];
    if (typeof value === "string" && (STATES as readonly string[]).includes(value)) {
      prefs[group] = value as SidebarState;
    }
  }
  return prefs;
}

export function serializeSidebarCookie(prefs: SidebarPrefs): string {
  return encodeURIComponent(JSON.stringify(prefs));
}

/** Ctrl+B: hide, or bring back what was showing before it was hidden. */
export function toggleHidden(current: SidebarMode, lastVisible: SidebarState): SidebarState {
  return current === "hidden" ? lastVisible : "hidden";
}

/** Ctrl+\: switch between Expanded and Rail (from Hidden, show it Expanded). */
export function toggleRail(visible: SidebarState | "hidden"): SidebarState {
  return visible === "expanded" ? "rail" : "expanded";
}
