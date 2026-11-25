import type { CubbyDirection } from "@/lib/companion/renderer";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Placement {
  x: number;
  y: number;
  /** Where the card sits relative to the target; null = centred (no target). */
  side: "below" | "above" | "right" | "left" | null;
  /** Where Cubby (on the card) should point to show the target. */
  pointAt: CubbyDirection | null;
}

const POINT: Record<NonNullable<Placement["side"]>, CubbyDirection> = {
  below: "up",
  above: "down",
  right: "left",
  left: "right",
};

/**
 * Where a tour card goes: below the spotlight if it fits, else above, right,
 * left; clamped inside the viewport with a margin. Without a target it's
 * centred. Never on top of the spotlight when any side fits.
 */
export function placeCard(target: Rect | null, card: { width: number; height: number }, viewport: { width: number; height: number }, gap = 14, margin = 12): Placement {
  const clampX = (x: number) => Math.max(margin, Math.min(x, viewport.width - card.width - margin));
  const clampY = (y: number) => Math.max(margin, Math.min(y, viewport.height - card.height - margin));
  if (!target) {
    return { x: clampX((viewport.width - card.width) / 2), y: clampY((viewport.height - card.height) / 2), side: null, pointAt: null };
  }
  const centreX = target.x + target.width / 2 - card.width / 2;
  const centreY = target.y + target.height / 2 - card.height / 2;
  const below = target.y + target.height + gap;
  const above = target.y - gap - card.height;
  const right = target.x + target.width + gap;
  const left = target.x - gap - card.width;

  let side: NonNullable<Placement["side"]>;
  let x: number;
  let y: number;
  if (below + card.height <= viewport.height - margin) [side, x, y] = ["below", clampX(centreX), below];
  else if (above >= margin) [side, x, y] = ["above", clampX(centreX), above];
  else if (right + card.width <= viewport.width - margin) [side, x, y] = ["right", right, clampY(centreY)];
  else if (left >= margin) [side, x, y] = ["left", left, clampY(centreY)];
  else [side, x, y] = ["below", clampX(centreX), clampY(below)];
  return { x, y, side, pointAt: POINT[side] };
}

/** The spotlight hole: the target padded, kept inside the viewport. */
export function spotlightRect(target: Rect, viewport: { width: number; height: number }, pad = 8): Rect {
  const x = Math.max(4, target.x - pad);
  const y = Math.max(4, target.y - pad);
  const right = Math.min(viewport.width - 4, target.x + target.width + pad);
  const bottom = Math.min(viewport.height - 4, target.y + target.height + pad);
  return { x, y, width: Math.max(0, right - x), height: Math.max(0, bottom - y) };
}
