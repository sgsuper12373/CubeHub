import type { CSSProperties } from "react";

/**
 * Display options for the timer background image. Stored per device in
 * localStorage (local-first; syncing is a later step), so everything read
 * back is clamped to a valid value.
 */

export type BackgroundFit = "cover" | "contain";

/** Horizontal and vertical anchor, as CSS object-position keywords. */
export type BackgroundPosition = `${"left" | "center" | "right"} ${"top" | "center" | "bottom"}`;

export interface BackgroundOptions {
  /** 0.1..1 — image opacity over the theme background. */
  opacity: number;
  /** 0..20 px. */
  blur: number;
  /** 0.3..1.5 — CSS brightness() factor. */
  brightness: number;
  fit: BackgroundFit;
  position: BackgroundPosition;
}

export const DEFAULT_BACKGROUND_OPTIONS: BackgroundOptions = {
  opacity: 0.6,
  blur: 0,
  brightness: 1,
  fit: "cover",
  position: "center center",
};

export const LIMITS = {
  opacity: { min: 0.1, max: 1, step: 0.05 },
  blur: { min: 0, max: 20, step: 1 },
  brightness: { min: 0.3, max: 1.5, step: 0.05 },
} as const;

const H = ["left", "center", "right"] as const;
const V = ["top", "center", "bottom"] as const;

/** All nine anchors, row by row (top-left first), for the position picker. */
export const POSITIONS: BackgroundPosition[] = V.flatMap((v) =>
  H.map((h) => `${h} ${v}` as BackgroundPosition),
);

const clamp = (value: unknown, { min, max }: { min: number; max: number }, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;

/** Coerce anything (e.g. parsed localStorage) into valid options. */
export function sanitizeOptions(raw: unknown): BackgroundOptions {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_BACKGROUND_OPTIONS;
  return {
    opacity: clamp(o.opacity, LIMITS.opacity, d.opacity),
    blur: clamp(o.blur, LIMITS.blur, d.blur),
    brightness: clamp(o.brightness, LIMITS.brightness, d.brightness),
    fit: o.fit === "contain" || o.fit === "cover" ? o.fit : d.fit,
    position: POSITIONS.includes(o.position as BackgroundPosition)
      ? (o.position as BackgroundPosition)
      : d.position,
  };
}

/** Inline style for the <img>: fit, anchor, opacity and filters. */
export function imageStyle(o: BackgroundOptions): CSSProperties {
  return {
    objectFit: o.fit,
    objectPosition: o.position,
    opacity: o.opacity,
    filter: `blur(${o.blur}px) brightness(${o.brightness})`,
    // A blur fades the image edges to transparent; overscan hides that.
    transform: o.blur > 0 && o.fit === "cover" ? "scale(1.06)" : undefined,
  };
}
