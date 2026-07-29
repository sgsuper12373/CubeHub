"use client";

import dynamic from "next/dynamic";

import { CubeLoader } from "@/components/ui/cube-loader";

/**
 * Lazy-loaded case viewer using cubing.js's <twisty-player>.
 * Renders a 2D top-down view of a cube case (OLL, PLL, etc.) from its
 * setup algorithm.
 *
 * Uses next/dynamic with ssr: false because <twisty-player> is a web
 * component that requires browser APIs.
 */

const CaseViewerInner = dynamic(
  () =>
    import("./case-viewer-inner").then((mod) => mod.CaseViewerInner),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center" style={{ width: 80, height: 80 }}>
        <CubeLoader size={24} label="Loading cube" />
      </div>
    ),
  },
);

export function CaseViewer({
  cubeState,
  puzzle = "333",
  size = 80,
  visualization = "2D",
  className,
}: {
  /** Setup algorithm that produces the case state from solved */
  cubeState: string;
  /** Puzzle type — defaults to 3x3 */
  puzzle?: string;
  /** Pixel size — defaults to 80px for cards */
  size?: number;
  /** 2D top-down or 3D isometric */
  visualization?: "2D" | "3D" | "experimental-2D-LL";
  className?: string;
}) {
  return (
    <div className={className ?? "flex items-center justify-center"}>
      <CaseViewerInner
        cubeState={cubeState}
        puzzle={puzzle}
        size={size}
        visualization={visualization}
      />
    </div>
  );
}
