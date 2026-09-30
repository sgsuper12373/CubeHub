/**
 * Decide whether the timer digits need `--timer-scrim` behind them.
 *
 * Rule (docs/design-tokens.md): timer digits and state colours need 3:1 on
 * the timer background, including a user background image. An image isn't
 * one colour, so we test its bright and dark extremes (10th and 90th
 * luminance percentiles, sampled once on upload), after the user's
 * brightness and opacity are applied over the theme canvas. If any timer
 * colour drops below 3:1 against either extreme, the scrim goes on.
 */
import { composite, contrastRatio, toGamma, type Rgba } from "@/themes/color";

export const TIMER_MIN_CONTRAST = 3;

export interface LuminanceRange {
  /** Relative luminance (linear, 0..1) of the darker 10% of the image. */
  p10: number;
  /** Relative luminance (linear, 0..1) of the brighter 10% of the image. */
  p90: number;
}

/** Luminance percentiles from RGBA bytes (e.g. canvas ImageData). */
export function luminancePercentiles(rgba: Uint8ClampedArray | number[]): LuminanceRange {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const values: number[] = [];
  for (let i = 0; i + 3 < rgba.length; i += 4) {
    if (rgba[i + 3] === 0) continue; // fully transparent pixel shows the canvas
    values.push(0.2126 * lin(rgba[i]) + 0.7152 * lin(rgba[i + 1]) + 0.0722 * lin(rgba[i + 2]));
  }
  if (values.length === 0) return { p10: 0, p90: 0 };
  values.sort((a, b) => a - b);
  const at = (p: number) => values[Math.min(values.length - 1, Math.floor(p * values.length))];
  return { p10: at(0.1), p90: at(0.9) };
}

/** The colour behind the digits for an image region of luminance `lum`. */
export function effectiveBackground(
  lum: number,
  canvas: Rgba,
  { opacity, brightness }: { opacity: number; brightness: number },
): Rgba {
  // brightness() scales linear light; opacity composites in gamma space.
  const g = toGamma(Math.min(1, lum * brightness));
  return composite({ r: g, g, b: g, a: opacity }, canvas);
}

export function timerNeedsScrim({
  inks,
  canvas,
  range,
  opacity,
  brightness,
}: {
  /** Every colour the digits can take (idle, holding, running, result, penalty). */
  inks: Rgba[];
  /** The theme background the image sits on. */
  canvas: Rgba;
  range: LuminanceRange;
  opacity: number;
  brightness: number;
}): boolean {
  return [range.p10, range.p90].some((lum) => {
    const behind = effectiveBackground(lum, canvas, { opacity, brightness });
    return inks.some((ink) => contrastRatio(ink, behind) < TIMER_MIN_CONTRAST);
  });
}
