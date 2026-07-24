"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The hero's cube — a pre-rendered video, not a live cube engine.
 *
 * It used to be a real `<twisty-player>` from cubing.js. That put a WebGL
 * context, a web worker and ~1 MB of JavaScript on the landing page's critical
 * path purely for decoration, and it is what took the front page down when a
 * webpack chunk-naming quirk 404'd the `cubing/twisty` import — the hero and
 * the scramble preview both spun on their loading state for weeks in
 * production. See `docs/roadmap.md`.
 *
 * A video renders the identical animation at a fraction of the weight, works
 * offline, and cannot be broken by a bundler. cubing.js is still used where
 * cube *state* has to be real — the timer's scramble preview, and the Phase 3
 * case viewer — where a failure is behind an interaction and visible, rather
 * than being the first thing every visitor sees.
 *
 * The hand-off contract is unchanged, so `hero-section.tsx` did not have to
 * change: same `mode`, `size` and `onSolved`.
 *
 * **Decoration must never gate the UI.** `onSolved` fires on a timer, not on a
 * media event, so a missing or unplayable file still hands off on schedule and
 * the page reveals itself. If the assets are absent the cube is simply absent —
 * which is exactly what the old implementation failed to do.
 */

/** Assets live in `public/hero/` — see the README there for the spec. */
const VIDEO_WEBM = "/hero/cube-solve.webm";
const VIDEO_MP4 = "/hero/cube-solve.mp4";
const STILL = "/hero/cube-still.png";

/**
 * How long the solve runs before the hand-off begins. Kept as the source of
 * truth rather than reading the video's duration, so the choreography is
 * identical whatever file is dropped in — and still correct if none is.
 */
export const HERO_SOLVE_MS = 1900;

export function HeroCube({
  mode,
  size = 260,
  onSolved,
}: {
  /** "solve" plays the animation once; "idle" is the resting still. */
  mode: "solve" | "idle";
  size?: number;
  onSolved?: () => void;
}) {
  const [videoFailed, setVideoFailed] = useState(false);
  const [stillFailed, setStillFailed] = useState(false);

  // Held in a ref so a new callback identity never restarts the timer.
  const onSolvedRef = useRef(onSolved);
  useEffect(() => {
    onSolvedRef.current = onSolved;
  }, [onSolved]);

  useEffect(() => {
    if (mode !== "solve") return;
    const t = setTimeout(() => onSolvedRef.current?.(), HERO_SOLVE_MS);
    return () => clearTimeout(t);
  }, [mode]);

  const box = { width: size, height: size } as const;

  // Idle (mobile, reduced motion) rests on a still. Nothing animates, nothing
  // decodes, and reduced-motion users are not handed a looping video.
  if (mode === "idle" || videoFailed) {
    if (stillFailed) return <div style={box} aria-hidden />;
    return (
      // A fixed-size decorative asset that is already the right dimensions —
      // next/image would add an optimisation pipeline for nothing.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={STILL}
        alt=""
        aria-hidden
        style={box}
        className="select-none object-contain"
        onError={() => setStillFailed(true)}
      />
    );
  }

  return (
    <video
      style={box}
      // muted + playsInline are what make autoplay legal on iOS and in Chrome.
      autoPlay
      muted
      playsInline
      // No `loop`: the cube finishes solved and holds that frame, which is the
      // resting state the hand-off springs into.
      preload="auto"
      poster={stillFailed ? undefined : STILL}
      aria-hidden
      className="pointer-events-none select-none object-contain"
      onError={() => setVideoFailed(true)}
    >
      <source src={VIDEO_WEBM} type="video/webm" />
      <source src={VIDEO_MP4} type="video/mp4" />
    </video>
  );
}
