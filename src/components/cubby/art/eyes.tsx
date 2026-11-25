"use client";

import { motion } from "motion/react";

import type { EyeVariant } from "@/components/cubby/art/manifest";
import { EYE_LEFT, EYE_RIGHT } from "@/components/cubby/art/geometry";
import type { CubbyDirection } from "@/lib/companion/renderer";

const LOOK: Record<CubbyDirection, { x: number; y: number }> = {
  left: { x: -2.6, y: 0 },
  right: { x: 2.6, y: 0 },
  up: { x: 0, y: -2.8 },
  down: { x: 0, y: 2.4 },
};

function Eye({ cx, cy, variant, look }: { cx: number; cy: number; variant: EyeVariant; look: CubbyDirection | null }) {
  const off = look ? LOOK[look] : { x: 0, y: 0 };
  switch (variant) {
    case "happy":
      return <path d={`M${cx - 6} ${cy + 2} Q${cx} ${cy - 7} ${cx + 6} ${cy + 2}`} className="cubby-ink-line" strokeWidth={3.4} />;
    case "sleepy":
      return <path d={`M${cx - 6} ${cy + 1} Q${cx} ${cy + 5} ${cx + 6} ${cy + 1}`} className="cubby-ink-line" strokeWidth={2.6} />;
    case "focused":
      return (
        <g>
          <path d={`M${cx - 6.5} ${cy} L${cx + 6.5} ${cy} Q${cx + 6.5} ${cy + 7} ${cx} ${cy + 7} Q${cx - 6.5} ${cy + 7} ${cx - 6.5} ${cy}Z`} className="cubby-eye-white" strokeWidth={1.6} />
          <circle cx={cx + off.x} cy={cy + 3} r={2.8} className="cubby-ink" />
        </g>
      );
    case "wide":
      return (
        <g>
          <ellipse cx={cx} cy={cy} rx={7.5} ry={9.5} className="cubby-eye-white" strokeWidth={1.6} />
          <circle cx={cx + off.x} cy={cy + off.y} r={2.6} className="cubby-ink" />
        </g>
      );
    case "worried":
      return (
        <g>
          <ellipse cx={cx} cy={cy + 1} rx={6.2} ry={7} className="cubby-eye-white" strokeWidth={1.6} />
          <circle cx={cx + off.x} cy={cy + 2 + off.y} r={3.1} className="cubby-ink" />
        </g>
      );
    case "open":
      return (
        <g>
          <ellipse cx={cx} cy={cy} rx={7.2} ry={8.6} className="cubby-eye-white" strokeWidth={1.8} />
          <circle cx={cx + off.x} cy={cy + off.y} r={3.9} className="cubby-ink" />
          <circle cx={cx + off.x + 1.4} cy={cy + off.y - 1.6} r={1.2} className="cubby-shine" />
        </g>
      );
  }
}

/** Both eyes. Open eyes blink every few seconds unless motion is reduced. */
export function Eyes({ variant, look, blinks, reduced }: { variant: EyeVariant; look: CubbyDirection | null; blinks: boolean; reduced: boolean }) {
  const blink = blinks && !reduced;
  return (
    <motion.g
      style={{ transformBox: "fill-box", transformOrigin: "center" }}
      animate={blink ? { scaleY: [1, 1, 0.1, 1] } : { scaleY: 1 }}
      transition={blink ? { duration: 4.2, times: [0, 0.94, 0.97, 1], repeat: Infinity } : { duration: 0 }}
    >
      <Eye cx={EYE_LEFT.x} cy={EYE_LEFT.y} variant={variant} look={look} />
      <Eye cx={EYE_RIGHT.x} cy={EYE_RIGHT.y} variant={variant} look={look} />
    </motion.g>
  );
}
