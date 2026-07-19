"use client";

import dynamic from "next/dynamic";

import type { TimerPuzzle } from "@/lib/timer/types";

/**
 * Lazy-loaded scramble preview using cubing.js's <twisty-player>.
 * Rendered only when settings.showScramblePreview is on and a scramble
 * is available. Uses next/dynamic with ssr: false because <twisty-player>
 * is a web component that requires browser APIs.
 *
 * cubing/twisty lands in its own chunk, separate from cubing/scramble,
 * so it never enters the initial /timer bundle.
 */

const TwistyPlayer = dynamic(
  () =>
    import("./scramble-preview-inner").then((mod) => mod.ScramblePreviewInner),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-32 w-32 items-center justify-center">
        <div className="h-20 w-20 animate-pulse rounded-lg bg-muted" />
      </div>
    ),
  },
);

export function ScramblePreview({
  alg,
  puzzle,
  size,
  visualization,
  className,
}: {
  alg: string;
  puzzle: TimerPuzzle;
  size?: number;
  visualization?: "2D" | "3D";
  /** Overrides the default inline spacing so a floating shell can own layout. */
  className?: string;
}) {
  return (
    <div className={className ?? "flex justify-center py-2"}>
      <TwistyPlayer
        alg={alg}
        puzzle={puzzle}
        size={size}
        visualization={visualization}
      />
    </div>
  );
}
