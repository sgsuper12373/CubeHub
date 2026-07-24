"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The rendered width of an element, for charts that draw in real pixels.
 *
 * `sparkline.tsx` deliberately avoids measuring: it letterboxes a fixed viewBox
 * so it needs no observer at all. That is right for a 240×56 spark with no text
 * in it. It is wrong here — a scaled viewBox scales its labels too, so the axis
 * on a phone would render at half the size of the axis on a desktop. Measuring
 * keeps every tick at the size it was designed at.
 *
 * Returns 0 until the first measurement, which is the caller's cue to render
 * nothing rather than a chart laid out against a guess.
 */
export function useMeasuredWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new ResizeObserver(([entry]) => {
      // contentRect excludes padding, which is what the drawing area is.
      setWidth(Math.round(entry.contentRect.width));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}
