"use client";

import { motion } from "motion/react";

import { EYE_LEFT, EYE_RIGHT, HOLD_POINT } from "@/components/cubby/art/geometry";

/** BLD execution: a blindfold slides across the eyes. */
export function Blindfold({ reduced }: { reduced: boolean }) {
  const y = EYE_LEFT.y;
  return (
    <motion.g initial={reduced ? false : { x: -80, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={reduced ? { duration: 0 } : { duration: 0.35, ease: "easeOut" }}>
      <rect x={EYE_LEFT.x - 14} y={y - 8} width={EYE_RIGHT.x - EYE_LEFT.x + 28} height={15} rx={5} className="cubby-blindfold" />
      <path d={`M${EYE_RIGHT.x + 14} ${y - 2} l9 -6 M${EYE_RIGHT.x + 14} ${y + 2} l10 3`} className="cubby-blindfold-tail" strokeWidth={3.4} />
    </motion.g>
  );
}

/** A tiny cube held in both hands; it turns while executing. */
export function HeldCube({ turning, reduced }: { turning: boolean; reduced: boolean }) {
  const { x, y } = HOLD_POINT;
  const s = 8;
  return (
    <motion.g
      style={{ transformBox: "fill-box", transformOrigin: "center" }}
      animate={turning && !reduced ? { rotate: [0, -12, 0, 12, 0] } : { rotate: 0 }}
      transition={turning && !reduced ? { duration: 1.1, repeat: Infinity, ease: "easeInOut" } : { duration: 0 }}
    >
      <path d={`M${x - s} ${y - s / 2} L${x} ${y - s} L${x + s} ${y - s / 2} L${x} ${y}Z`} className="cubby-mini-u" />
      <path d={`M${x - s} ${y - s / 2} L${x} ${y} L${x} ${y + s} L${x - s} ${y + s / 2}Z`} className="cubby-mini-f" />
      <path d={`M${x} ${y} L${x + s} ${y - s / 2} L${x + s} ${y + s / 2} L${x} ${y + s}Z`} className="cubby-mini-r" />
    </motion.g>
  );
}

const PAIRS = ["AK", "PL", "DB"] as const;

/** BLD memo: letter pairs drift up beside Cubby. With reduced motion, one pair sits still. */
export function MemoPairs({ reduced }: { reduced: boolean }) {
  if (reduced) {
    return (
      <text x={112} y={20} className="cubby-memo" fontSize={10} textAnchor="middle">
        {PAIRS[0]}
      </text>
    );
  }
  return (
    <g>
      {PAIRS.map((p, i) => (
        <motion.text
          key={p}
          x={108 + (i % 2) * 10}
          y={30}
          className="cubby-memo"
          fontSize={10}
          textAnchor="middle"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: [0, 1, 0], y: [30, 18, 6] }}
          transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.8, ease: "easeOut" }}
        >
          {p}
        </motion.text>
      ))}
    </g>
  );
}
