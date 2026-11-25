"use client";

import { motion, useReducedMotion, type TargetAndTransition, type Transition } from "motion/react";

import { Arms } from "@/components/cubby/art/arms";
import { Body } from "@/components/cubby/art/body";
import { Brows } from "@/components/cubby/art/brows";
import { Eyes } from "@/components/cubby/art/eyes";
import { VIEWBOX } from "@/components/cubby/art/geometry";
import { Legs } from "@/components/cubby/art/legs";
import { EXPRESSION_PARTS } from "@/components/cubby/art/manifest";
import { Mouth } from "@/components/cubby/art/mouth";
import { Blindfold, HeldCube, MemoPairs } from "@/components/cubby/art/props";
import type { BodyMotion, Pose } from "@/lib/companion/svg-state";
import { cn } from "@/lib/utils";

const MOTION: Record<BodyMotion, { animate: TargetAndTransition; transition: Transition }> = {
  breathe: { animate: { scaleY: [1, 1.018, 1] }, transition: { duration: 3.6, repeat: Infinity, ease: "easeInOut" } },
  bounce: { animate: { y: [0, -7, 0] }, transition: { duration: 0.4, ease: "easeOut" } },
  spin: { animate: { y: [0, -12, 0, -4, 0], rotate: [0, -8, 8, -3, 0] }, transition: { duration: 0.9, ease: "easeOut" } },
  flinch: { animate: { scale: [1, 0.93, 1], x: [0, -2, 2, 0] }, transition: { duration: 0.3, ease: "easeOut" } },
  still: { animate: {}, transition: { duration: 0 } },
};

/**
 * Cubby v0, drawn from a pose. Every part is its own file behind
 * `manifest.ts`, so final art replaces files, not code. Decorative: the
 * speech card carries the words, so the SVG is aria-hidden.
 */
export function CubbyArt({ pose, size, reduced: reducedProp, className }: { pose: Pose; size: number; reduced?: boolean; className?: string }) {
  const systemReduced = useReducedMotion();
  const reduced = reducedProp ?? systemReduced ?? false;
  const face = EXPRESSION_PARTS[pose.expression];
  const body = reduced ? MOTION.still : MOTION[pose.body];

  return (
    <svg
      viewBox={VIEWBOX}
      height={size}
      width={(size * 130) / 150}
      aria-hidden
      focusable="false"
      className={cn("cubby-art overflow-visible", className)}
      data-expression={pose.expression}
      data-arms={pose.arms}
    >
      <motion.g
        key={pose.body}
        style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}
        animate={body.animate}
        transition={body.transition}
      >
        <Legs />
        <Body />
        {!pose.blindfold && <Eyes variant={face.eyes} look={pose.look} blinks={face.blinks} reduced={reduced} />}
        {!pose.blindfold && <Brows variant={face.brows} />}
        {pose.blindfold && <Blindfold reduced={reduced} />}
        <Mouth variant={face.mouth} reduced={reduced} />
        <Arms pose={pose.arms} look={pose.look} reduced={reduced} />
        {pose.holdingCube && <HeldCube turning={pose.blindfold} reduced={reduced} />}
      </motion.g>
      {pose.memo && <MemoPairs reduced={reduced} />}
    </svg>
  );
}
