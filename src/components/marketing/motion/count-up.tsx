"use client";

import { animate, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

/**
 * Counts a number up once, when it first comes into view (docs/landing-plan.md
 * → Motion system). The HTML has the final number, so it reads right before
 * hydration, with scripts off, and for screen readers (which get the final
 * value from the start through `aria-label`). Reduced motion: no count.
 */
export function CountUp({
  value,
  durationMs = 1200,
  format = (n) => Math.round(n).toLocaleString("en-IN"),
  className,
}: {
  value: number;
  durationMs?: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduced = useReducedMotion();
  const [shown, setShown] = useState<number | null>(null);

  useEffect(() => {
    if (!inView || reduced) return;
    const controls = animate(0, value, {
      duration: durationMs / 1000,
      ease: "easeOut",
      onUpdate: (n) => setShown(n),
      onComplete: () => setShown(null),
    });
    return () => controls.stop();
  }, [inView, reduced, value, durationMs]);

  return (
    <span ref={ref} aria-label={format(value)} className={className}>
      <span aria-hidden>{format(shown ?? value)}</span>
    </span>
  );
}
