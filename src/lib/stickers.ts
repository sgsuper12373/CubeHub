/**
 * Sticker colours for 2D cube renders, keyed by facelet character (Kociemba
 * face letters, plus X for masked). Values are theme tokens named by face,
 * not colour, so a user colour scheme (e.g. white-top) is an override of the
 * --sticker-* tokens — see docs/design-tokens.md. Default scheme: yellow top,
 * green front, so R is orange and L is red.
 */
export const STICKER_FILL = {
  U: "var(--sticker-u)",
  R: "var(--sticker-r)",
  F: "var(--sticker-f)",
  D: "var(--sticker-d)",
  L: "var(--sticker-l)",
  B: "var(--sticker-b)",
  X: "var(--sticker-masked)",
} as const;

export type StickerChar = keyof typeof STICKER_FILL;

export const STICKER_OUTLINE = "var(--sticker-outline)";

/** Fill for a facelet character; anything unknown renders as masked. */
export function stickerFill(char: string | undefined): string {
  return STICKER_FILL[(char ?? "X") as StickerChar] ?? STICKER_FILL.X;
}
