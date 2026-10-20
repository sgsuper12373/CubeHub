"use client";

import dynamic from "next/dynamic";

import { CubeLoader } from "@/components/ui/cube-loader";
import { useNearViewport } from "@/hooks/use-near-viewport";
import type { TimerPuzzle } from "@/lib/timer/types";

/**
 * Lazy-loaded scramble preview using cubing.js's <twisty-player>.
 * Rendered only when settings.showScramblePreview is on and a scramble
 * is available. Uses next/dynamic with ssr: false because <twisty-player>
 * is a web component that requires browser APIs.
 *
 * cubing itself is not bundled: it loads at runtime from public/cubing/
 * (see lib/cubing/runtime.ts), so it never enters the initial /timer bundle.
 */

const TwistyPlayer = dynamic(
  () =>
    import("./scramble-preview-inner").then((mod) => mod.ScramblePreviewInner),
  {
    ssr: false,
    loading: () => <PreviewLoading />,
  },
);

function PreviewLoading() {
  return (
    <div className="flex h-32 w-32 items-center justify-center">
      <CubeLoader size={40} label="Loading cube preview" />
    </div>
  );
}

export function ScramblePreview({
  alg,
  puzzle,
  size,
  visualization,
  className,
  deferUntilNear = false,
}: {
  alg: string;
  puzzle: TimerPuzzle;
  size?: number;
  visualization?: "2D" | "3D";
  /** Overrides the default inline spacing so a floating shell can own layout. */
  className?: string;
  /**
   * Show the loading state until the preview is near the viewport, so a
   * below-the-fold preview (the landing page's) doesn't fetch cubing.js on
   * page load.
   */
  deferUntilNear?: boolean;
}) {
  // A tight margin: the landing bento's cube starts right under the hero on
  // desktop, and cubing.js shouldn't load until someone scrolls to it.
  const [ref, near] = useNearViewport<HTMLDivElement>("200px");
  return (
    <div ref={deferUntilNear ? ref : undefined} className={className ?? "flex justify-center py-2"}>
      {deferUntilNear && !near ? (
        <PreviewLoading />
      ) : (
        <TwistyPlayer
          alg={alg}
          puzzle={puzzle}
          size={size}
          visualization={visualization}
        />
      )}
    </div>
  );
}
