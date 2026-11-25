"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { ask, startPageTour, timerState } from "@/components/cubby/companion-actions";
import { CubbyDock } from "@/components/cubby/dock";
import { getCubbyRenderer } from "@/components/cubby/renderer-instance";
import { SpeechBubble } from "@/components/cubby/speech-bubble";
import { TourOverlay } from "@/components/cubby/tour-overlay";
import { useCompanionReactions } from "@/components/cubby/use-reactions";
import { contentFor } from "@/content/cubby";
import { fillLine, pickGreeting } from "@/lib/companion/content";
import { isQuietPhase } from "@/lib/companion/director";
import { noteVisit } from "@/lib/companion/memory";
import { companionPageFor, type CompanionPage } from "@/lib/companion/pages";
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
  useCompanionReactions();

  useEffect(() => {
    useCompanionStore.getState().hydrate(loadLocalRecord() ?? parseRecord(null));
  }, []);

  // Page entry: remember the visit, then (after a second, so the page settles)
  // start the page's tour if it's new to this cuber.
  const visit = useRef<{ pathname: string; previous: number | null } | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    const page = companionPageFor(pathname);
    useCompanionStore.getState().setPage(page, contentFor(page));
    if (!page) return;
    // StrictMode runs this twice in development: keep the first reading of the previous visit.
    if (visit.current?.pathname !== pathname) visit.current = { pathname, previous: noteVisit(page, Date.now()) };
    const previous = visit.current.previous;
    const id = window.setTimeout(() => onPageEntry(page, previous), 1000);
    return () => window.clearTimeout(id);
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

  return (
    <>
      <CubbyDock placement="floating" />
      <SpeechBubble />
      <TourOverlay />
    </>
  );
}

/**
 * What Cubby does on arriving at a page: a tour the cuber hasn't had yet,
 * otherwise (at most) one greeting, picked by the visit's conditions.
 */
function onPageEntry(page: CompanionPage, previousVisit: number | null): void {
  const { page: current, content, record, say } = useCompanionStore.getState();
  if (current !== page || !content) return;
  if (startPageTour(false)) return;
  const now = Date.now();
  const greeting = pickGreeting(content.greetings, {
    firstVisit: previousVisit === null,
    daysAway: previousVisit === null ? null : Math.floor((now - previousVisit) / 86_400_000),
    hour: new Date(now).getHours(),
  });
  if (!greeting) return;
  if (!ask({ kind: "greeting", page }, previousVisit).show) return;
  getCubbyRenderer().fire("wave");
  say({ text: fillLine(greeting.line, { name: record.settings.name }), actions: greeting.actions ?? [], ttlMs: 4000 });
}
