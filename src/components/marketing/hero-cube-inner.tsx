"use client";

import { useEffect, useRef } from "react";
import type { TwistyPlayerConfig } from "cubing/twisty";

/**
 * The hero's live <twisty-player>. Split out so next/dynamic can keep
 * cubing/twisty (a heavy WebGL chunk) out of everything but this lazy import —
 * the same discipline as `scramble-preview-inner.tsx`.
 *
 * Two modes, decided once per visit and never changed (so the player is built
 * once — a `mode` flip would tear down and rebuild the WebGL context):
 *   - "solve" — first-time cinematic: start from a fixed scramble and auto-play
 *     its inverse, so the cube fluidly solves itself (~1.9s), then rests solved.
 *   - "idle"  — returning visitors: a slow, continuous whole-cube Y turntable
 *     (a run of `y` rotations), which keeps the cube looking solved as it spins.
 *
 * `onSolved` fires after the solve's choreographed duration. It's held in a ref
 * so a new callback identity from the parent never rebuilds the player.
 */

/** Predefined scramble (design brief: "a predefined CFOP algorithm string"). */
const HERO_SCRAMBLE = "R U R' U' F' U F R2 U' R' U R U' R' F R F'";
/** Roughly how long the solve takes at the tempo below; drives the hand-off. */
export const HERO_SOLVE_MS = 1900;

export function HeroCubeInner({
  mode,
  size = 260,
  onReady,
  onSolved,
}: {
  mode: "solve" | "idle";
  size?: number;
  onReady?: () => void;
  onSolved?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLElement | null>(null);

  // Callbacks via refs so their identity never re-runs the build effect.
  const onReadyRef = useRef(onReady);
  const onSolvedRef = useRef(onSolved);
  useEffect(() => {
    onReadyRef.current = onReady;
    onSolvedRef.current = onSolved;
  }, [onReady, onSolved]);

  useEffect(() => {
    let cancelled = false;
    let solvedTimer: ReturnType<typeof setTimeout> | undefined;

    (async () => {
      const [{ TwistyPlayer }, { Alg }] = await Promise.all([
        import("cubing/twisty"),
        import("cubing/alg"),
      ]);
      if (cancelled || !containerRef.current) return;

      if (playerRef.current) {
        playerRef.current.remove();
        playerRef.current = null;
      }

      const config: TwistyPlayerConfig =
        mode === "solve"
          ? {
              puzzle: "3x3x3",
              experimentalSetupAlg: HERO_SCRAMBLE,
              experimentalSetupAnchor: "start",
              alg: new Alg(HERO_SCRAMBLE).invert().toString(),
              background: "none",
              controlPanel: "none",
              hintFacelets: "none",
              tempoScale: 3,
            }
          : {
              puzzle: "3x3x3",
              alg: "y ".repeat(60).trim(),
              background: "none",
              controlPanel: "none",
              hintFacelets: "none",
              tempoScale: 0.4,
            };

      const player = new TwistyPlayer(config);
      player.style.width = `${size}px`;
      player.style.height = `${size}px`;
      containerRef.current.appendChild(player);
      playerRef.current = player;
      onReadyRef.current?.();

      // Begin from the timeline start, then play forward on the next frame so
      // the puzzle has a tick to finish loading before animating.
      try {
        player.jumpToStart();
        requestAnimationFrame(() => {
          if (!cancelled) player.play();
        });
      } catch {
        // A hero without an animated cube is still a hero.
      }

      if (mode === "solve") {
        solvedTimer = setTimeout(() => {
          if (!cancelled) onSolvedRef.current?.();
        }, HERO_SOLVE_MS);
      }
    })();

    return () => {
      cancelled = true;
      if (solvedTimer) clearTimeout(solvedTimer);
      if (playerRef.current) {
        playerRef.current.remove();
        playerRef.current = null;
      }
    };
  }, [mode, size]);

  return <div ref={containerRef} className="flex items-center justify-center" />;
}
