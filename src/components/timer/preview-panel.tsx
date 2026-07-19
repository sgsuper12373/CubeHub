"use client";

import { useEffect, useRef, useState } from "react";

import { ScramblePreview } from "@/components/timer/scramble-preview";
import type { TimerPuzzle } from "@/lib/timer/types";
import { cn } from "@/lib/utils";

/**
 * The scramble preview, sized to whatever panel it has been given.
 *
 * The cube used to live in a separate floating window that carried its own
 * position and resize handles. Now that the panel grid owns placement and
 * sizing for everything, that was a second, conflicting way to do the same
 * job — so the cube is a normal panel and simply fills it.
 *
 * `size` is committed on a settle rather than on every observer callback:
 * changing it re-runs the effect in <ScramblePreviewInner/>, which tears down
 * and rebuilds the TwistyPlayer — and in 3D a WebGL context with it. Resizing
 * a grid panel fires a continuous stream of resize events, so without the
 * settle every frame of a drag would rebuild the player.
 */

const SETTLE_MS = 120;
const MIN_SIZE = 64;

export function PreviewPanel({
  alg,
  puzzle,
  dimension,
  className,
}: {
  alg: string;
  puzzle: TimerPuzzle;
  dimension: "2D" | "3D";
  className?: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(0);
  const settleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;

    let first = true;
    const measure = (rect: { width: number; height: number }) => {
      // Square, so the cube fits the panel's narrower axis with a little air.
      const next = Math.max(
        MIN_SIZE,
        Math.floor(Math.min(rect.width, rect.height)) - 16,
      );
      // The initial measurement lands immediately — debouncing it would leave
      // the panel visibly empty on load. Only later changes settle.
      if (first) {
        first = false;
        setSize(next);
        return;
      }
      if (settleRef.current) clearTimeout(settleRef.current);
      settleRef.current = setTimeout(() => setSize(next), SETTLE_MS);
    };

    const ro = new ResizeObserver(([entry]) => measure(entry.contentRect));
    ro.observe(el);
    return () => {
      ro.disconnect();
      if (settleRef.current) clearTimeout(settleRef.current);
    };
  }, []);

  return (
    <div
      ref={boxRef}
      className={cn("flex min-h-0 min-w-0 flex-1 items-center justify-center", className)}
    >
      {size > 0 && (
        <ScramblePreview
          alg={alg}
          puzzle={puzzle}
          size={size}
          visualization={dimension}
          className="flex items-center justify-center"
        />
      )}
    </div>
  );
}
