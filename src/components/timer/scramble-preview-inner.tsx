"use client";

import { useEffect, useRef } from "react";

import type { TimerPuzzle } from "@/lib/timer/types";

/**
 * The actual twisty-player element. Split into its own file so next/dynamic
 * can tree-shake it. cubing/twisty is imported here and nowhere else.
 */
function mapPuzzleToTwisty(puzzle: string): string {
  switch (puzzle) {
    case "333":
    case "333bf":
    case "333oh":
    case "333mbf":
      return "3x3x3";
    case "222":
      return "2x2x2";
    case "444":
    case "444bf":
      return "4x4x4";
    case "555":
    case "555bf":
      return "5x5x5";
    case "666":
      return "6x6x6";
    case "777":
      return "7x7x7";
    case "mega":
      return "megaminx";
    case "pyra":
      return "pyraminx";
    case "skewb":
      return "skewb";
    case "sq1":
      return "square1";
    case "clock":
      return "clock";
    default:
      return "3x3x3";
  }
}

export function ScramblePreviewInner({
  alg,
  puzzle,
}: {
  alg: string;
  puzzle: TimerPuzzle;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Dynamic import so cubing/twisty only loads when preview is shown
      const { TwistyPlayer } = await import("cubing/twisty");
      if (cancelled || !containerRef.current) return;

      // Clean up any previous player
      if (playerRef.current) {
        playerRef.current.remove();
        playerRef.current = null;
      }

      const player = new TwistyPlayer({
        puzzle: mapPuzzleToTwisty(puzzle),
        alg: alg,
        visualization: "2D",
        background: "none",
        controlPanel: "none",
        hintFacelets: "none",
        tempoScale: 4,
      });

      // Style the element
      player.style.width = "120px";
      player.style.height = "120px";

      containerRef.current.appendChild(player);
      playerRef.current = player;
    })();

    return () => {
      cancelled = true;
      if (playerRef.current) {
        playerRef.current.remove();
        playerRef.current = null;
      }
    };
  }, [alg, puzzle]);

  return <div ref={containerRef} className="flex items-center justify-center" />;
}
