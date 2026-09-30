"use client";

import { STICKER_OUTLINE, stickerFill } from "@/lib/stickers";
import { cn } from "@/lib/utils";

interface FaceletViewerProps {
  cubeState: string;
  size?: number;
  className?: string;
}

/**
 * Renders a 2D Last Layer (LL) view of a Rubik's cube from a 54-character
 * Kociemba facelet string (URFDLB order).
 */
export function FaceletViewer({
  cubeState,
  size = 80,
  className,
}: FaceletViewerProps) {
  // Ensure we have a string of at least 54 chars, padded with X if missing
  const state = (cubeState || "").padEnd(54, "X");

  // Colours come from the --sticker-* tokens. Set via `style` rather than the
  // SVG fill/stroke attributes, where var() support is inconsistent.
  const sticker = (index: number) => ({
    fill: stickerFill(state[index]),
    stroke: STICKER_OUTLINE,
  });

  // The 54-char order is U(0-8), R(9-17), F(18-26), D(27-35), L(36-44), B(45-53)
  // Faces are ordered 1 to 9 (0 to 8 index) like a reading book:
  // Top-left, Top-middle, Top-right, Middle-left... Bottom-right.

  // U Face (0-8)
  // B Face top row is 45, 46, 47 (viewing from top, these map to B3, B2, B1)
  // R Face top row is 9, 10, 11 (viewing from top, these map to R1, R2, R3)
  // F Face top row is 18, 19, 20 (viewing from top, these map to F1, F2, F3)
  // L Face top row is 36, 37, 38 (viewing from top, these map to L1, L2, L3)

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-sm"
      >
        {/* Background dark border */}
        <rect x="5" y="5" width="90" height="90" rx="8" style={{ fill: STICKER_OUTLINE }} />

        {/* --- Top (B Face) --- */}
        {/* B3 (47), B2 (46), B1 (45) */}
        <path d="M 22 10 L 40 10 L 40 18 L 22 18 Z" style={sticker(47)} strokeWidth="2" />
        <path d="M 40 10 L 60 10 L 60 18 L 40 18 Z" style={sticker(46)} strokeWidth="2" />
        <path d="M 60 10 L 78 10 L 78 18 L 60 18 Z" style={sticker(45)} strokeWidth="2" />

        {/* --- Bottom (F Face) --- */}
        {/* F1 (18), F2 (19), F3 (20) */}
        <path d="M 22 82 L 40 82 L 40 90 L 22 90 Z" style={sticker(18)} strokeWidth="2" />
        <path d="M 40 82 L 60 82 L 60 90 L 40 90 Z" style={sticker(19)} strokeWidth="2" />
        <path d="M 60 82 L 78 82 L 78 90 L 60 90 Z" style={sticker(20)} strokeWidth="2" />

        {/* --- Left (L Face) --- */}
        {/* L1 (36), L2 (37), L3 (38) ... wait, if looking down at the cube, L face top row is L1-L3. 
            From the top view, the edge adjacent to U1-U4-U7 is L3, L2, L1 or L1, L2, L3?
            L face has L1 (top-left), L2 (top-mid), L3 (top-right). 
            Adjacent to U1 is L1. Adjacent to U4 is L2. Adjacent to U7 is L3. 
            So from top to bottom on the left side of the 2D view: L1, L2, L3. */}
        <path d="M 10 22 L 18 22 L 18 40 L 10 40 Z" style={sticker(36)} strokeWidth="2" />
        <path d="M 10 40 L 18 40 L 18 60 L 10 60 Z" style={sticker(37)} strokeWidth="2" />
        <path d="M 10 60 L 18 60 L 18 78 L 10 78 Z" style={sticker(38)} strokeWidth="2" />

        {/* --- Right (R Face) --- */}
        {/* R face top row is R1, R2, R3. Adjacent to U3 is R3. Adjacent to U6 is R2. Adjacent to U9 is R1.
            From top to bottom on the right side: R3, R2, R1. */}
        <path d="M 82 22 L 90 22 L 90 40 L 82 40 Z" style={sticker(11)} strokeWidth="2" />
        <path d="M 82 40 L 90 40 L 90 60 L 82 60 Z" style={sticker(10)} strokeWidth="2" />
        <path d="M 82 60 L 90 60 L 90 78 L 82 78 Z" style={sticker(9)} strokeWidth="2" />

        {/* --- U Face (3x3 Grid) --- */}
        {/* Row 1 */}
        <rect x="22" y="22" width="18" height="18" style={sticker(0)} strokeWidth="2" rx="2" />
        <rect x="40" y="22" width="20" height="18" style={sticker(1)} strokeWidth="2" rx="2" />
        <rect x="60" y="22" width="18" height="18" style={sticker(2)} strokeWidth="2" rx="2" />
        {/* Row 2 */}
        <rect x="22" y="40" width="18" height="20" style={sticker(3)} strokeWidth="2" rx="2" />
        <rect x="40" y="40" width="20" height="20" style={sticker(4)} strokeWidth="2" rx="2" />
        <rect x="60" y="40" width="18" height="20" style={sticker(5)} strokeWidth="2" rx="2" />
        {/* Row 3 */}
        <rect x="22" y="60" width="18" height="18" style={sticker(6)} strokeWidth="2" rx="2" />
        <rect x="40" y="60" width="20" height="18" style={sticker(7)} strokeWidth="2" rx="2" />
        <rect x="60" y="60" width="18" height="18" style={sticker(8)} strokeWidth="2" rx="2" />
      </svg>
    </div>
  );
}
