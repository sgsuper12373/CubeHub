import type { Expression } from "@/lib/companion/svg-state";

/**
 * Which part variant each expression uses. Final art replaces the part files
 * (eyes.tsx, brows.tsx, mouth.tsx, …) and, if its variants differ, this
 * table: the renderer, the Director and the pages never change.
 */
export const EYE_VARIANTS = ["open", "happy", "wide", "worried", "focused", "sleepy"] as const;
export const BROW_VARIANTS = ["neutral", "raised", "worried", "focused", "relaxed"] as const;
export const MOUTH_VARIANTS = ["smile", "open", "grin", "o", "wobble", "flat", "talk"] as const;

export type EyeVariant = (typeof EYE_VARIANTS)[number];
export type BrowVariant = (typeof BROW_VARIANTS)[number];
export type MouthVariant = (typeof MOUTH_VARIANTS)[number];

export interface FaceParts {
  eyes: EyeVariant;
  brows: BrowVariant;
  mouth: MouthVariant;
  /** Whether the eyes blink in this expression (open eyes only). */
  blinks: boolean;
}

export const EXPRESSION_PARTS: Record<Expression, FaceParts> = {
  idle: { eyes: "open", brows: "neutral", mouth: "smile", blinks: true },
  happy: { eyes: "happy", brows: "raised", mouth: "open", blinks: false },
  grin: { eyes: "happy", brows: "raised", mouth: "grin", blinks: false },
  surprised: { eyes: "wide", brows: "raised", mouth: "o", blinks: false },
  concerned: { eyes: "worried", brows: "worried", mouth: "wobble", blinks: true },
  focused: { eyes: "focused", brows: "focused", mouth: "flat", blinks: false },
  sleepy: { eyes: "sleepy", brows: "relaxed", mouth: "o", blinks: false },
  talking: { eyes: "open", brows: "raised", mouth: "talk", blinks: true },
};
