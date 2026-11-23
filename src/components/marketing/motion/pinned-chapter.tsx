"use client";

import { motionValue, useReducedMotion, useScroll, type MotionValue } from "motion/react";
import { useRef } from "react";

import { cn } from "@/lib/utils";

const DONE = motionValue(1);

/**
 * A feature chapter whose visual pins while its text scrolls past
 * (docs/landing-plan.md → Feature chapters, Motion system). From lg up the
 * section is taller than the screen and the visual is `sticky`; `progress`
 * (0 → 1 across the section, from `useScroll`) drives the visual's state.
 * Scroll-linked, never scroll-jacked: the page scrolls at the user's speed.
 *
 * Below lg, and for reduced motion, it's a plain stacked section and
 * `progress` holds at 1, so every visual shows its finished state. Nothing
 * focusable is trapped in the sticky part: it's ordinary flow.
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
  const progress = reduced ? DONE : scrollYProgress;

  return (
    <section
      ref={ref}
      id={id}
      data-pinned={reduced ? "off" : "on"}
      className={cn(
        "relative mx-auto w-full max-w-6xl scroll-mt-16 px-4",
        !reduced && "lg:min-h-[170svh]",
        className,
      )}
    >
      <div className={cn("grid gap-8 py-16 lg:grid-cols-2 lg:gap-16 lg:py-0", reverse && "lg:[&>*:first-child]:order-2")}>
        <div className={cn("flex items-center", !reduced && "lg:sticky lg:top-0 lg:h-[100svh]")}>
          <div className="w-full">{visual(progress)}</div>
        </div>
        <div className={cn("flex flex-col justify-center", !reduced && "lg:min-h-[100svh]")}>{children}</div>
      </div>
    </section>
  );
}
