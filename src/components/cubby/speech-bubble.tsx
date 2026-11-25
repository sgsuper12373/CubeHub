"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { useSolveBusy } from "@/components/cubby/companion-actions";
import { getCubbyRenderer } from "@/components/cubby/renderer-instance";
import { useCubbyReducedMotion } from "@/components/cubby/use-cubby-motion";
import { cn } from "@/lib/utils";
import { useCompanionStore, type Bubble } from "@/stores/companion-store";

/** ~30 ms per character (docs/cubby-cubing-companion.md → Visual rules). */
const TYPE_MS = 30;

/** Where the visible dock is, so the bubble sits beside it. */
function dockAnchor(): { left: number; right: number; top: number; bottom: number } | null {
  const all = document.querySelectorAll<HTMLElement>("[data-cubby-dock-trigger]");
  for (const el of all) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
  }
  return null;
}

const noop = () => () => {};

/**
 * Cubby's speech card: a glassy card beside the dock, typed out quickly
 * (click to finish), then gone after its time. Real DOM text in a polite
 * live region, so screen readers hear the whole line once; the typing is
 * only visual. Never shown while a solve is running.
 */
export function SpeechBubble() {
  const bubble = useCompanionStore((s) => s.bubble);
  const busy = useSolveBusy();
  // Mounted only on the client (the companion has no server render).
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  if (!mounted || !bubble || busy) return null;
  return createPortal(<BubbleCard key={bubble.id} bubble={bubble} />, document.body);
}

function BubbleCard({ bubble }: { bubble: Bubble }) {
  const reduced = useCubbyReducedMotion();
  const [typed, setTyped] = useState(reduced ? bubble.text.length : 0);
  const done = typed >= bubble.text.length;
  const cardRef = useRef<HTMLDivElement>(null);

  // Type the line out; Cubby's mouth moves while it does.
  useEffect(() => {
    if (done) return;
    const r = getCubbyRenderer();
    r.setInput("isTalking", true);
    const id = window.setInterval(() => setTyped((n) => n + 1), TYPE_MS);
    return () => {
      window.clearInterval(id);
      r.setInput("isTalking", false);
    };
  }, [done]);

  // Then fade after its time.
  useEffect(() => {
    if (!done || bubble.ttlMs === null) return;
    const id = window.setTimeout(() => useCompanionStore.getState().dismissBubble(bubble.id), bubble.ttlMs);
    return () => window.clearTimeout(id);
  }, [done, bubble]);

  // Sit beside the dock: right of the sidebar's, above the phone's floating one.
  useEffect(() => {
    const place = () => {
      const card = cardRef.current;
      const a = dockAnchor();
      if (!card) return;
      if (!a) {
        card.style.cssText = "right: 1rem; bottom: 5.5rem;";
        return;
      }
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (a.right < vw / 2) {
        // Desktop sidebar (or the floating dock bottom-left).
        card.style.cssText = `left: ${Math.round(a.right + 10)}px; bottom: ${Math.round(Math.max(12, vh - a.bottom))}px;`;
      } else {
        card.style.cssText = `right: ${Math.round(Math.max(12, vw - a.right))}px; bottom: ${Math.round(vh - a.top + 10)}px;`;
      }
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, []);

  return (
    <div
      ref={cardRef}
      data-cubby-bubble
      data-focus-hide
      role="status"
      aria-live="polite"
      className={cn(
        "fixed z-50 w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl border border-border bg-card/95 p-3 pr-9 text-sm text-card-foreground shadow-xl backdrop-blur-md",
        !reduced && "animate-in fade-in slide-in-from-bottom-2 duration-200",
      )}
      onClick={() => setTyped(bubble.text.length)}
    >
      <p className="sr-only">{bubble.text}</p>
      <p aria-hidden className="min-h-5">
        {bubble.text.slice(0, typed)}
      </p>
      {bubble.actions.length > 0 && done && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {bubble.actions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              onClick={() => useCompanionStore.getState().dismissBubble(bubble.id)}
              className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {a.label}
            </Link>
          ))}
        </div>
      )}
      <button
        type="button"
        aria-label="Dismiss"
        onClick={(e) => {
          e.stopPropagation();
          useCompanionStore.getState().dismissBubble(bubble.id);
        }}
        className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}
