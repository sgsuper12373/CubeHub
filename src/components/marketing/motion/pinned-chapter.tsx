"use client";

import { motionValue, useReducedMotion, useScroll, type MotionValue } from "motion/react";
import { useRef, useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

const DONE = motionValue(1);
const LG = "(min-width: 1024px)";

function subscribeLg(onChange: () => void) {
  const q = window.matchMedia(LG);
  q.addEventListener("change", onChange);
  return () => q.removeEventListener("change", onChange);
}

/**
 * A feature chapter whose visual pins while its text scrolls past
 * (docs/landing-plan.md → Feature chapters, Motion system). From lg up the
 * section is taller than the screen and the visual is `sticky`; `progress`
 * (0 → 1 across the section, from `useScroll`) drives the visual's state.
 * Scroll-linked, never scroll-jacked: the page scrolls at the user's speed.
 *
 * From md the text and visual sit side by side, unpinned. Below md it's one
 * column: eyebrow, heading and text first, then the visual. That's also the
 * DOM order, so screen readers and keyboard users meet the heading before the
 * picture; side by side, CSS `order` puts the visual on the left (or the
 * right, with `reverse`). Below lg, and for reduced motion, `progress` holds
 * at 1, so every visual shows its finished state. Nothing focusable is
 * trapped in the sticky part: it's ordinary flow. `overflow-x: clip` keeps a
 * visual's glow from widening the page on phones without becoming a scroll
 * container, which would break the sticky pin.
 */
export function PinnedChapter({
  id,
  visual,
  children,
  reverse = false,
  className,
}: {
  id?: string;
  visual: (progress: MotionValue<number>) => React.ReactNode;
  children: React.ReactNode;
  reverse?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  // Below lg the visual shows its finished state. The server assumes a
  // narrow screen, so the first paint never shows a half-built visual.
  const isLg = useSyncExternalStore(subscribeLg, () => window.matchMedia(LG).matches, () => false);
  const progress = reduced || !isLg ? DONE : scrollYProgress;

  return (
    <section ref={ref} id={id} data-pinned={reduced ? "off" : "on"} className={cn("relative mx-auto w-full max-w-6xl overflow-x-clip px-4", className)}>
      {/* From lg the row is taller than the screen, so the sticky visual has room to stay put while the text passes. */}
      <div
        className={cn(
          "grid items-center gap-8 py-16 md:grid-cols-2 md:gap-10 md:py-20 lg:items-stretch lg:gap-16 lg:py-0",
          !reduced && "lg:min-h-[140svh]",
        )}
      >
        <div className={cn("flex flex-col justify-center lg:py-24", !reverse && "md:order-2")}>{children}</div>
        <div className={cn("flex items-center", !reverse && "md:order-1", !reduced && "lg:sticky lg:top-0 lg:h-[100svh]")}>
          <div className="w-full">{visual(progress)}</div>
        </div>
      </div>
    </section>
  );
}
