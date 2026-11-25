"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { timerState } from "@/components/cubby/companion-actions";
import { CubbyDock } from "@/components/cubby/dock";
import { getCubbyRenderer } from "@/components/cubby/renderer-instance";
import { contentFor } from "@/content/cubby";
import { isQuietPhase } from "@/lib/companion/director";
import { companionPageFor } from "@/lib/companion/pages";
import { loadLocalRecord, parseRecord } from "@/lib/companion/record";
import { useCompanionStore } from "@/stores/companion-store";
import { isOverlayOpen } from "@/stores/overlay-store";

/** Pages whose own `?` opens their shortcut list; Cubby's `?` stands down there. */
const OWN_QUESTION_MARK = new Set(["/timer", "/playground"]);

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/** The visible dock button (the sidebar's or the floating one, whichever is on screen). */
function visibleDockTrigger(): HTMLElement | null {
  const all = document.querySelectorAll<HTMLElement>("[data-cubby-dock-trigger]");
  for (const el of all) if (el.getClientRects().length > 0) return el;
  return null;
}

/**
 * Cubby's root (docs/companion-plan.md): mounted once in the (app) layout,
 * client-only and loaded after the page is interactive, so the timer's first
 * paint never waits for it. Owns the store's hydration, the current page,
 * the keyboard shortcuts and the phone dock.
 */
export default function CompanionRoot() {
  const pathname = usePathname();
  const hydrated = useCompanionStore((s) => s.hydrated);

  useEffect(() => {
    useCompanionStore.getState().hydrate(loadLocalRecord() ?? parseRecord(null));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const page = companionPageFor(pathname);
    useCompanionStore.getState().setPage(page, contentFor(page));
  }, [hydrated, pathname]);

  // The theme input (the SVG reads its colours from tokens; a Rive file would use this).
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => getCubbyRenderer().setInput("theme", root.dataset.theme || "slate");
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  // `?` opens the dock menu; Esc closes a bubble (tours handle their own Esc).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || isEditable(e.target)) return;
      const { phase, inInspection } = timerState();
      if (isQuietPhase(phase, inInspection)) return;
      if (e.key === "Escape") {
        if (useCompanionStore.getState().bubble) useCompanionStore.getState().dismissBubble();
        return;
      }
      if (e.key !== "?" || OWN_QUESTION_MARK.has(window.location.pathname) || isOverlayOpen()) return;
      const trigger = visibleDockTrigger();
      if (!trigger) return;
      e.preventDefault();
      trigger.focus();
      trigger.click();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return <CubbyDock placement="floating" />;
}
