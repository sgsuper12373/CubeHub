"use client";

import { useEffect, useRef } from "react";
import type { PuzzleID } from "cubing/twisty";

/**
 * Inner component that mounts a cubing.js TwistyPlayer showing a cube case.
 * Split into its own file so next/dynamic can tree-shake it.
 *
 * Unlike ScramblePreviewInner (which shows a scramble), this shows the
 * end state of a setup algorithm — what the cube looks like before you
 * apply the OLL/PLL/etc. algorithm.
 */
function mapPuzzleId(puzzle: string): PuzzleID {
  switch (puzzle) {
    case "333":
      return "3x3x3";
    case "222":
      return "2x2x2";
    case "444":
      return "4x4x4";
    default:
      return "3x3x3";
  }
}

export function CaseViewerInner({
  cubeState,
  puzzle = "333",
  size = 80,
  visualization = "2D",
}: {
  cubeState: string;
  puzzle?: string;
  size?: number;
  visualization?: "2D" | "3D" | "experimental-2D-LL";
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { TwistyPlayer } = await import("cubing/twisty");
      if (cancelled || !containerRef.current) return;

      // Clean up any previous player
      if (playerRef.current) {
        playerRef.current.remove();
        playerRef.current = null;
      }

      const algToApply = visualization === "experimental-2D-LL" 
        ? `x2 ${cubeState}` 
        : cubeState;

      const player = new TwistyPlayer({
        puzzle: mapPuzzleId(puzzle),
        alg: algToApply,
        visualization,
        background: "none",
        controlPanel: "none",
        hintFacelets: "none",
        // Jump to end state immediately — we want to show the case,
        // not animate from solved
        tempoScale: 100,
      });

      // Style the element
      player.style.width = `${size}px`;
      player.style.height = `${size}px`;

      containerRef.current.appendChild(player);
      playerRef.current = player;

      // Jump to the end of the algorithm so the case state is shown
      // immediately without animation
      player.controller?.jumpToEnd?.();
    })();

    return () => {
      cancelled = true;
      if (playerRef.current) {
        playerRef.current.remove();
        playerRef.current = null;
      }
    };
  }, [cubeState, puzzle, size, visualization]);

  return <div ref={containerRef} className="flex items-center justify-center" />;
}
