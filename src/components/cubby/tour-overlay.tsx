"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { timerState, useSolveBusy } from "@/components/cubby/companion-actions";
import { getCubbyRenderer } from "@/components/cubby/renderer-instance";
import { useCubbyReducedMotion } from "@/components/cubby/use-cubby-motion";
import { Button } from "@/components/ui/button";
import { onCompanion } from "@/lib/companion/bus";
import { fillLine } from "@/lib/companion/content";
import { isQuietPhase } from "@/lib/companion/director";
import { placeCard, spotlightRect, type Rect } from "@/lib/companion/placement";
import { nextAvailableStep } from "@/lib/companion/tours";
import { cn } from "@/lib/utils";
import { useCompanionStore } from "@/stores/companion-store";
import { useOverlayLock } from "@/stores/overlay-store";

/**
 * The tour engine's overlay (docs/cubby-cubing-companion.md → Page tours):
 * dims the page, cuts a rounded spotlight around the step's `data-tour`
 * target and puts Cubby's card beside it. Interactive steps (`waitFor`) leave
 * the target clickable and the keyboard free, and advance on the real event.
 * Hidden while the timer is busy; paused while the cuber types elsewhere.
 */

function findTarget(target: string): HTMLElement | null {
  const all = document.querySelectorAll<HTMLElement>(`[data-tour="${CSS.escape(target)}"]`);
  for (const el of all) {
    if (el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden") return el;
  }
  return null;
}

function isEditable(el: Element | null): boolean {
  return el instanceof HTMLElement && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
}

/** The target's viewport rect as a string snapshot (stable for useSyncExternalStore), "" when absent. */
function useTargetRect(target: string | null): string {
  const subscribe = useCallback(
    (notify: () => void) => {
      if (!target) return () => {};
      const ro = new ResizeObserver(notify);
      const el = findTarget(target);
      if (el) ro.observe(el);
      window.addEventListener("resize", notify);
      window.addEventListener("scroll", notify, true);
      // Layout can shift without a resize (panels streaming in): poll gently.
      const id = window.setInterval(notify, 400);
      return () => {
        ro.disconnect();
        window.removeEventListener("resize", notify);
        window.removeEventListener("scroll", notify, true);
        window.clearInterval(id);
      };
    },
    [target],
  );
  const snapshot = useCallback(() => {
    if (!target) return "";
    const el = findTarget(target);
    if (!el) return "";
    const r = el.getBoundingClientRect();
    return `${Math.round(r.x)},${Math.round(r.y)},${Math.round(r.width)},${Math.round(r.height)}`;
  }, [target]);
  return useSyncExternalStore(subscribe, snapshot, () => "");
}

function parseRect(s: string): Rect | null {
  if (!s) return null;
  const [x, y, width, height] = s.split(",").map(Number);
  return { x, y, width, height };
}

export function TourOverlay() {
  const tour = useCompanionStore((s) => s.tour);
  const name = useCompanionStore((s) => s.record.settings.name);
  const reduced = useCubbyReducedMotion();
  const [paused, setPaused] = useState(false);
  const [direction, setDirection] = useState<1 | -1>(1);
  const cardRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const bodyId = useId();

  const step = tour ? tour.steps[tour.index] : null;
  const busy = useSolveBusy();
  const interactive = step?.waitFor !== undefined;
  const rectString = useTargetRect(step?.target ?? null);
  const rect = parseRect(rectString);
  const visible = tour !== null && step !== null && !busy && !paused;

  // Space must not start the timer behind a normal step; an interactive step needs the keyboard.
  useOverlayLock(visible && !interactive);

  const go = useCallback(
    (to: number, dir: 1 | -1) => {
      const t = useCompanionStore.getState().tour;
      if (!t) return;
      const next = nextAvailableStep(t.steps, to, (target) => findTarget(target) !== null, dir);
      if (next === -1) {
        if (dir === 1) {
          useCompanionStore.getState().endTour("done");
          getCubbyRenderer().fire("thumbsUp");
        }
        return;
      }
      setDirection(dir);
      useCompanionStore.getState().goToStep(next);
    },
    [],
  );

  const skip = useCallback(() => useCompanionStore.getState().endTour("skipped"), []);

  // A step whose target isn't on the page (hidden on phones, not rendered yet) is skipped.
  useEffect(() => {
    if (!tour || !step || step.target === null || busy) return;
    const id = window.setTimeout(() => {
      if (!findTarget(step.target!)) go(tour.index + direction, direction);
    }, 600);
    return () => window.clearTimeout(id);
  }, [tour, step, busy, direction, go]);

  // Bring the target into view.
  useEffect(() => {
    if (!step?.target || !visible) return;
    const el = findTarget(step.target);
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.top < 0 || r.bottom > window.innerHeight) el.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
  }, [step, visible, reduced]);

  // Interactive steps advance on the real event.
  useEffect(() => {
    if (!tour || !step?.waitFor) return;
    return onCompanion(step.waitFor, () => go(tour.index + 1, 1));
  }, [tour, step, go]);

  // Remember where focus was; give it back when the tour ends.
  useEffect(() => {
    if (!tour) return;
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => {
      const el = returnFocus.current;
      if (el && el.isConnected) el.focus();
    };
  }, [tour === null]); // eslint-disable-line react-hooks/exhaustive-deps

  // Move focus to the card on each step, so screen readers read it and the keys work.
  useEffect(() => {
    if (visible) headingRef.current?.focus({ preventScroll: true });
  }, [visible, step]);

  // Cubby points at the target and talks while the card is new.
  useLayoutEffect(() => {
    const card = cardRef.current;
    const r = getCubbyRenderer();
    if (!card || !visible) {
      r.setInput("pointAt", null);
      r.setInput("isTalking", false);
      return;
    }
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const hole = rect ? spotlightRect(rect, viewport) : null;
    const place = placeCard(hole, { width: card.offsetWidth, height: card.offsetHeight }, viewport);
    card.style.transform = `translate(${Math.round(place.x)}px, ${Math.round(place.y)}px)`;
    r.setInput("pointAt", place.pointAt);
    r.setInput("mood", step?.mood ?? "happy");
  }, [visible, rectString, step]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!visible) return;
    const r = getCubbyRenderer();
    r.setInput("isTalking", true);
    const id = window.setTimeout(() => r.setInput("isTalking", false), reduced ? 0 : 1400);
    return () => {
      window.clearTimeout(id);
      r.setInput("isTalking", false);
    };
  }, [visible, step, reduced]);

  useEffect(() => {
    if (tour) return;
    const r = getCubbyRenderer();
    r.setInput("pointAt", null);
    r.setInput("mood", "idle");
  }, [tour]);

  // Pause while the cuber types somewhere else; Esc skips, arrows and Enter move.
  useEffect(() => {
    if (!tour) return;
    const onFocusIn = (e: FocusEvent) => {
      const el = e.target as Element | null;
      if (isEditable(el) && !cardRef.current?.contains(el)) setPaused(true);
    };
    const onKey = (e: KeyboardEvent) => {
      if (paused || isQuietPhase(timerState().phase, timerState().inInspection)) return;
      const target = e.target as Element | null;
      const inCard = cardRef.current?.contains(target) ?? false;
      if (isEditable(target) && !inCard) return;
      const t = useCompanionStore.getState().tour;
      if (!t) return;
      const s = t.steps[t.index];
      if (e.key === "Escape") {
        e.preventDefault();
        skip();
      } else if (e.key === "ArrowRight" || (e.key === "Enter" && inCard && target === headingRef.current)) {
        if (s.waitFor && e.key === "Enter") return;
        e.preventDefault();
        go(t.index + 1, 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(t.index - 1, -1);
      }
    };
    document.addEventListener("focusin", onFocusIn);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      window.removeEventListener("keydown", onKey);
    };
  }, [tour, paused, go, skip]);

  if (!tour || !step || busy) return null;

  if (paused) {
    return createPortal(
      <div data-focus-hide className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 md:bottom-6">
        <div role="status" className="flex items-center gap-3 rounded-full border border-border bg-card px-4 py-2 text-sm text-card-foreground shadow-lg">
          <span>Tour paused</span>
          <Button size="sm" variant="outline" onClick={() => setPaused(false)}>
            Resume
          </Button>
          <Button size="sm" variant="ghost" onClick={skip}>
            End tour
          </Button>
        </div>
      </div>,
      document.body,
    );
  }

  const viewport = typeof window === "undefined" ? { width: 0, height: 0 } : { width: window.innerWidth, height: window.innerHeight };
  const hole = rect ? spotlightRect(rect, viewport) : null;
  const count = tour.steps.length;
  const last = tour.index === count - 1;
  const View = getCubbyRenderer().View;

  return createPortal(
    <div data-cubby-tour data-focus-hide className="fixed inset-0 z-[60]">
      {/* The dim with a rounded hole. Purely visual. */}
      <svg className="pointer-events-none absolute inset-0 size-full" aria-hidden>
        <defs>
          <mask id="cubby-tour-mask">
            <rect width="100%" height="100%" fill="white" />
            {hole && <rect x={hole.x} y={hole.y} width={hole.width} height={hole.height} rx={12} fill="black" />}
          </mask>
        </defs>
        <rect width="100%" height="100%" className="fill-background opacity-70" mask="url(#cubby-tour-mask)" />
        {hole && <rect x={hole.x} y={hole.y} width={hole.width} height={hole.height} rx={12} className="fill-none stroke-primary" strokeWidth={2} />}
      </svg>

      {/* Click blockers: everything on a normal step; around the hole on an interactive one. */}
      {interactive && hole ? (
        <>
          <div className="absolute inset-x-0 top-0" style={{ height: hole.y }} />
          <div className="absolute inset-x-0 bottom-0" style={{ top: hole.y + hole.height }} />
          <div className="absolute left-0" style={{ top: hole.y, height: hole.height, width: hole.x }} />
          <div className="absolute right-0" style={{ top: hole.y, height: hole.height, left: hole.x + hole.width }} />
        </>
      ) : (
        <div className="absolute inset-0" />
      )}

      <div
        ref={cardRef}
        role="dialog"
        aria-modal={!interactive}
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className={cn(
          "absolute top-0 left-0 w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-2xl",
          !reduced && "transition-transform duration-300 ease-out",
        )}
      >
        <div className="flex gap-3">
          <div className="shrink-0 self-end" aria-hidden>
            <View size={72} reduced={reduced} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground">
              {tour.kind === "whatsNew" ? "What's new" : `${name}'s tour`} · {tour.index + 1} of {count}
            </p>
            <h2 ref={headingRef} id={titleId} tabIndex={-1} className="mt-0.5 text-base font-semibold outline-none">
              {fillLine(step.title, { name })}
            </h2>
            <p id={bodyId} className="mt-1 text-sm text-muted-foreground">
              {fillLine(step.body, { name })}
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-1" aria-hidden>
          {tour.steps.map((s, i) => (
            <span key={s.id} className={cn("h-1.5 rounded-full transition-all", i === tour.index ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/40")} />
          ))}
        </div>

        {interactive && <p className="mt-3 text-sm font-medium text-primary">Go ahead, I&apos;ll wait.</p>}

        <div className="mt-3 flex items-center justify-between gap-2">
          <Button size="sm" variant="outline" onClick={skip}>
            Skip tour
          </Button>
          <div className="flex gap-2">
            {tour.index > 0 && (
              <Button size="sm" variant="ghost" onClick={() => go(tour.index - 1, -1)}>
                Back
              </Button>
            )}
            <Button size="sm" variant={interactive ? "outline" : "default"} onClick={() => go(tour.index + 1, 1)}>
              {last ? "Done" : interactive ? "Skip step" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
