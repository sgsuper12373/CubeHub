"use client";

import { motion } from "motion/react";

import { SHOULDER_LEFT, SHOULDER_RIGHT } from "@/components/cubby/art/geometry";
import type { CubbyDirection } from "@/lib/companion/renderer";
import type { ArmPose } from "@/lib/companion/svg-state";

/**
 * Two short arms, each a limb rotated about its shoulder (0° hangs straight
 * down; positive turns the left arm outward, negative the right).
 */
const ARM_LENGTH = 19;

type Angles = { left: number | number[]; right: number | number[] };

function anglesFor(pose: ArmPose, look: CubbyDirection | null): Angles {
  switch (pose) {
    case "rest":
      return { left: 28, right: -28 };
    case "wave":
      return { left: 28, right: [-150, -118, -150, -118, -150] };
    case "up":
      return { left: 150, right: -150 };
    case "thumbsUp":
      return { left: 28, right: -128 };
    case "shrug":
      return { left: 78, right: -78 };
    case "hold":
      return { left: -42, right: 46 };
    case "point":
      if (look === "left") return { left: 92, right: -28 };
      if (look === "up") return { left: 28, right: -165 };
      if (look === "down") return { left: 28, right: -12 };
      return { left: 28, right: -92 };
  }
}

function Limb({ x, y, angle, pose, side, reduced }: { x: number; y: number; angle: number | number[]; pose: ArmPose; side: "left" | "right"; reduced: boolean }) {
  // Holding the BLD cube, the arms reach in front of the body.
  const length = pose === "hold" ? 34 : ARM_LENGTH;
  const keyframes = Array.isArray(angle);
  const target = reduced && keyframes ? (angle as number[])[0] : angle;
  return (
    <g transform={`translate(${x} ${y})`}>
      <motion.g
        initial={false}
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
        animate={{ rotate: target }}
        transition={reduced ? { duration: 0 } : keyframes ? { duration: 0.9, ease: "easeInOut" } : { type: "spring", stiffness: 260, damping: 18 }}
      >
        {/* Invisible, centred on the shoulder: motion rotates about the group's box centre, so this makes that the shoulder. */}
        <circle cx={0} cy={0} r={length + 8} fill="none" stroke="none" />
        <path d={`M0 0 L0 ${length}`} className="cubby-limb" strokeWidth={5} />
        <circle cx={0} cy={length + 2} r={4.2} className="cubby-hand" />
        {pose === "thumbsUp" && side === "right" && <path d={`M0 ${length + 2} L-5 ${length + 2}`} className="cubby-limb" strokeWidth={3} />}
      </motion.g>
    </g>
  );
}

export function Arms({ pose, look, reduced }: { pose: ArmPose; look: CubbyDirection | null; reduced: boolean }) {
  const a = anglesFor(pose, look);
  return (
    <g>
      <Limb x={SHOULDER_LEFT.x} y={SHOULDER_LEFT.y} angle={a.left} pose={pose} side="left" reduced={reduced} />
      <Limb x={SHOULDER_RIGHT.x} y={SHOULDER_RIGHT.y} angle={a.right} pose={pose} side="right" reduced={reduced} />
    </g>
  );
}

export { anglesFor };
