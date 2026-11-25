"use client";

import { motion } from "motion/react";

import type { MouthVariant } from "@/components/cubby/art/manifest";
import { MOUTH } from "@/components/cubby/art/geometry";

/** The mouth. `talk` flaps (no lip sync, per the spec); with reduced motion it's a still open mouth. */
export function Mouth({ variant, reduced }: { variant: MouthVariant; reduced: boolean }) {
  const { x, y } = MOUTH;
  switch (variant) {
    case "smile":
      return <path d={`M${x - 8} ${y - 2} Q${x} ${y + 5} ${x + 8} ${y - 2}`} className="cubby-ink-line" strokeWidth={3.2} />;
    case "open":
      return <path d={`M${x - 9} ${y - 3} Q${x} ${y + 11} ${x + 9} ${y - 3}Z`} className="cubby-ink" strokeLinejoin="round" />;
    case "grin":
      return (
        <g>
          <path d={`M${x - 12} ${y - 4} Q${x} ${y + 14} ${x + 12} ${y - 4}Z`} className="cubby-ink" strokeLinejoin="round" />
          <path d={`M${x - 10} ${y - 3} L${x + 10} ${y - 3} L${x + 8.5} ${y} L${x - 8.5} ${y}Z`} className="cubby-tooth" />
        </g>
      );
    case "o":
      return <ellipse cx={x} cy={y + 1} rx={3.6} ry={4.4} className="cubby-ink" />;
    case "wobble":
      return <path d={`M${x - 8} ${y + 2} Q${x - 4} ${y - 2} ${x} ${y + 1} Q${x + 4} ${y + 4} ${x + 8} ${y}`} className="cubby-ink-line" strokeWidth={2.4} />;
    case "flat":
      return (
        <g>
          <path d={`M${x - 6} ${y} L${x + 6} ${y}`} className="cubby-ink-line" strokeWidth={2.6} />
          <path d={`M${x + 1} ${y} L${x + 4} ${y} L${x + 3.5} ${y + 2.2} L${x + 1.5} ${y + 2.2}Z`} className="cubby-tooth" />
        </g>
      );
    case "talk":
      return (
        <motion.ellipse
          cx={x}
          cy={y + 1}
          rx={6}
          ry={4.6}
          className="cubby-ink"
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
          animate={reduced ? { scaleY: 1 } : { scaleY: [1, 0.3, 1] }}
          transition={reduced ? { duration: 0 } : { duration: 0.28, repeat: Infinity, ease: "easeInOut" }}
        />
      );
  }
}
