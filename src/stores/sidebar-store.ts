import { create } from "zustand";

import {
  serializeSidebarCookie,
  SIDEBAR_COOKIE,
  SIDEBAR_COOKIE_MAX_AGE,
  type SidebarGroup,
  type SidebarPrefs,
  type SidebarState,
} from "@/lib/sidebar";
import { COOKIE_DOMAIN } from "@/lib/site-url";

/**
 * The sidebar's per-group choice (lib/sidebar.ts), seeded from the
 * `cubehub-sidebar` cookie the (app) layout reads, and written back to it on
 * every change so the next server render paints the right width. No
 * localStorage: the server has to know.
 */
interface SidebarStore {
  prefs: SidebarPrefs;
  /** What each group showed before it was hidden, for Ctrl+B and the show button. */
  lastVisible: Partial<Record<SidebarGroup, SidebarState>>;
  /**
   * Set by the timer while a solve is under way, so the shortcuts can't
   * change the layout mid-solve. The sidebar never reads the timer store
   * itself (docs/app-shell-plan.md → Keyboard and accessibility).
   */
  shortcutsLocked: boolean;
  seeded: boolean;
  seed(prefs: SidebarPrefs): void;
  set(group: SidebarGroup, state: SidebarState, visibleBefore?: SidebarState): void;
  setShortcutsLocked(locked: boolean): void;
}

function writeCookie(prefs: SidebarPrefs): void {
  if (typeof document === "undefined") return;
  const domain = COOKIE_DOMAIN ? `; domain=${COOKIE_DOMAIN}` : "";
  document.cookie = `${SIDEBAR_COOKIE}=${serializeSidebarCookie(prefs)}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}; SameSite=Lax${domain}`;
}

export const useSidebarStore = create<SidebarStore>()((set, get) => ({
  prefs: {},
  lastVisible: {},
  shortcutsLocked: false,
  seeded: false,

  seed: (prefs) => {
    if (get().seeded) return;
    set({ prefs, seeded: true });
  },

  set: (group, state, visibleBefore) => {
    const prefs = { ...get().prefs, [group]: state };
    const lastVisible =
      state === "hidden"
        ? visibleBefore
          ? { ...get().lastVisible, [group]: visibleBefore }
          : get().lastVisible
        : { ...get().lastVisible, [group]: state };
    set({ prefs, lastVisible });
    writeCookie(prefs);
  },

  setShortcutsLocked: (shortcutsLocked) => set({ shortcutsLocked }),
}));
