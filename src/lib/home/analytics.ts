import { track } from "@vercel/analytics";

import type { HomeLayout } from "@/lib/home/cards";

/**
 * Home's usage events (docs/home-plan.md → Analytics). They feed the Home
 * review after the beta: cards nobody clicks get cut or moved down.
 * `track()` only sends on Vercel; elsewhere it's a no-op. No personal data:
 * card ids, link paths and button labels only.
 */

/** The card and the action a click on Home landed on, or null when it wasn't a link or button in a card. */
export function homeCardClick(target: Element | null): { card: string; action: string } | null {
  const control = target?.closest("a[href], button");
  const card = control?.closest<HTMLElement>("[data-tour^='home-']");
  if (!control || !card) return null;
  const id = card.dataset.tour!.slice("home-".length);
  let action: string;
  if (control instanceof HTMLAnchorElement) {
    // The path only: query strings can hold a day or a username.
    action = new URL(control.href, "http://x").pathname;
  } else {
    action = (control.getAttribute("aria-label") ?? control.textContent ?? "").trim().replace(/\s+/g, " ");
  }
  return { card: id, action: action.slice(0, 60) || "button" };
}

export function trackHomeCardClick(target: Element | null): void {
  const click = homeCardClick(target);
  if (click) track("home_card_click", click);
}

/** The layout as event properties: comma lists, "default" for none. */
export function homeCustomizeProps(layout: HomeLayout | null): { hidden: string; shown: string } {
  if (!layout) return { hidden: "default", shown: "default" };
  return { hidden: layout.hidden.join(",") || "none", shown: layout.shown.join(",") || "none" };
}

export function trackHomeCustomize(layout: HomeLayout | null): void {
  track("home_customize", homeCustomizeProps(layout));
}

/** A finished daily attempt: "solve", "plus2" or "dnf". */
export function trackDailyAttempt(penalty: "none" | "plus2" | "dnf"): void {
  track("daily_attempt", { result: penalty === "none" ? "solve" : penalty });
}
