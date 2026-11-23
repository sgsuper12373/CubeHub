"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type Piece =
  | { kind: "sticker"; face: "u" | "r" | "f" | "d" | "l" | "b" }
  | { kind: "corner" | "edge" }
  | { kind: "glyph"; text: string };

type Placed = Piece & { left: string; top: string; size: number; duration: number; delay: number; depth: number };

/**
 * The decorative layer behind the hero and the final call to action
 * (docs/landing-plan.md → Motion system): sticker squares in the six cube
 * colours, a couple of cube pieces and notation glyphs, drifting slowly (CSS
 * keyframes, globals.css → "Floating field") and shifting a few pixels with
 * the pointer (motion values, so React never re-renders per frame).
 *
 * Colours are the sticker tokens, never raw values. aria-hidden and
 * pointer-events-none. The drift pauses off screen and in a hidden tab;
 * reduced motion stops drift and parallax.
 */
const PIECES: Placed[] = [
  { kind: "sticker", face: "u", left: "8%", top: "18%", size: 18, duration: 14, delay: 0, depth: 1 },
  { kind: "glyph", text: "R", left: "18%", top: "72%", size: 22, duration: 17, delay: -4, depth: 0.6 },
  { kind: "sticker", face: "r", left: "86%", top: "14%", size: 14, duration: 12, delay: -2, depth: 1.2 },
  { kind: "corner", left: "78%", top: "68%", size: 34, duration: 19, delay: -7, depth: 0.8 },
  { kind: "glyph", text: "U'", left: "92%", top: "42%", size: 20, duration: 15, delay: -9, depth: 0.5 },
  { kind: "sticker", face: "f", left: "30%", top: "8%", size: 12, duration: 13, delay: -5, depth: 1.4 },
  { kind: "edge", left: "4%", top: "48%", size: 28, duration: 18, delay: -3, depth: 0.7 },
  { kind: "sticker", face: "b", left: "60%", top: "88%", size: 16, duration: 16, delay: -8, depth: 1 },
  { kind: "glyph", text: "F2", left: "48%", top: "4%", size: 18, duration: 14, delay: -11, depth: 0.6 },
  { kind: "sticker", face: "l", left: "70%", top: "6%", size: 10, duration: 11, delay: -6, depth: 1.3 },
  { kind: "glyph", text: "M", left: "38%", top: "90%", size: 20, duration: 17, delay: -1, depth: 0.5 },
  { kind: "sticker", face: "d", left: "14%", top: "92%", size: 12, duration: 12, delay: -10, depth: 1.1 },
];

const STICKER_BG = {
  u: "bg-sticker-u",
  r: "bg-sticker-r",
  f: "bg-sticker-f",
  d: "bg-sticker-d",
  l: "bg-sticker-l",
  b: "bg-sticker-b",
} as const;

function PieceShape({ piece }: { piece: Placed }) {
  if (piece.kind === "sticker") {
    return <span className={cn("block size-full rounded-[22%] opacity-70", STICKER_BG[piece.face])} />;
  }
  if (piece.kind === "glyph") {
    return (
      <span className="block font-mono font-semibold text-muted-foreground/50" style={{ fontSize: piece.size }}>
        {piece.text}
      </span>
    );
  }
  // A corner shows three stickers, an edge two, on an isometric cubie.
  return (
    <svg viewBox="0 0 40 40" className="size-full opacity-60">
      <path d="M20 4 L35 12 L20 20 L5 12 Z" className="fill-sticker-u stroke-sticker-outline" strokeWidth="1" />
      <path d="M20 20 L35 12 L35 28 L20 36 Z" className={cn(piece.kind === "corner" ? "fill-sticker-r" : "fill-sticker-masked", "stroke-sticker-outline")} strokeWidth="1" />
      <path d="M5 12 L20 20 L20 36 L5 28 Z" className="fill-sticker-f stroke-sticker-outline" strokeWidth="1" />
    </svg>
  );
}

export function FloatingField({ className, intensity = 1 }: { className?: string; intensity?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const x = useSpring(px, { stiffness: 40, damping: 15 });
  const y = useSpring(py, { stiffness: 40, damping: 15 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let visible = true;
    const sync = () => setPaused(!visible || document.hidden);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    io.observe(el);
    document.addEventListener("visibilitychange", sync);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  useEffect(() => {
    if (reduced || paused) return;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      px.set(((e.clientX / window.innerWidth) * 2 - 1) * 8 * intensity);
      py.set(((e.clientY / window.innerHeight) * 2 - 1) * 8 * intensity);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduced, paused, px, py, intensity]);

  return (
    <div
      ref={ref}
      aria-hidden
      data-floating-field={paused ? "paused" : "running"}
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      {PIECES.map((p, i) => (
        <FloatingPiece key={i} piece={p} x={x} y={y} still={!!reduced} />
      ))}
    </div>
  );
}

/** One piece, shifted by its depth: nearer pieces move further with the pointer. */
function FloatingPiece({
  piece,
  x,
  y,
  still,
}: {
  piece: Placed;
  x: MotionValue<number>;
  y: MotionValue<number>;
  still: boolean;
}) {
  const dx = useTransform(x, (v) => (still ? 0 : v * piece.depth));
  const dy = useTransform(y, (v) => (still ? 0 : v * piece.depth));
  return (
    <motion.span
      className="absolute"
      style={{
        left: piece.left,
        top: piece.top,
        width: piece.kind === "glyph" ? undefined : piece.size,
        height: piece.kind === "glyph" ? undefined : piece.size,
        x: dx,
        y: dy,
      }}
    >
      <span
        className="floating-piece block size-full"
        style={{ animationDuration: `${piece.duration}s`, animationDelay: `${piece.delay}s` }}
      >
        <PieceShape piece={piece} />
      </span>
    </motion.span>
  );
}
