/**
 * Scales and tick selection. Pure functions, no React, no dependencies — the
 * same reasoning that keeps `lib/timer/stats.ts` dependency-free.
 */

/** A linear mapping from a data domain onto a pixel range. */
export function linearScale(
  [d0, d1]: [number, number],
  [r0, r1]: [number, number],
): (v: number) => number {
  // A zero-width domain would divide by zero; park it in the middle instead,
  // which is what a run of identical times should look like.
  if (d1 === d0) return () => (r0 + r1) / 2;
  const m = (r1 - r0) / (d1 - d0);
  return (v) => r0 + (v - d0) * m;
}

/**
 * Tick steps for a time axis, chosen from a ladder of round durations so labels
 * read "10s, 15s, 20s" and never "10.37s, 15.56s". Same rationale as the
 * histogram bucket ladder in `stats.ts`.
 */
const TIME_STEPS = [
  10, 20, 50, 100, 250, 500, 1000, 2000, 2500, 5000, 10_000, 15_000, 30_000,
  60_000, 120_000, 300_000, 600_000,
];

/**
 * Round tick values covering [min, max], aiming for about `count` of them.
 * Returns the padded domain alongside, so the caller's scale and its axis agree
 * on where the top and bottom of the plot actually are.
 */
export function timeTicks(
  min: number,
  max: number,
  count = 5,
): { ticks: number[]; domain: [number, number] } {
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { ticks: [], domain: [0, 1] };
  }
  if (min === max) {
    // No spread: one tick through the middle beats a fake axis.
    return { ticks: [min], domain: [min - 1000, max + 1000] };
  }

  const ideal = (max - min) / count;
  const step = TIME_STEPS.find((s) => s >= ideal) ?? TIME_STEPS[TIME_STEPS.length - 1];

  const first = Math.floor(min / step) * step;
  const last = Math.ceil(max / step) * step;

  const ticks: number[] = [];
  for (let t = first; t <= last; t += step) ticks.push(t);
  return { ticks, domain: [first, last] };
}

/**
 * Up to `count` evenly spaced indices into a series, always including the first
 * and last. Used for date labels on the x axis, where labelling every solve
 * would be unreadable and labelling a fixed count would drift off the ends.
 */
export function spacedIndices(length: number, count = 5): number[] {
  if (length <= 0) return [];
  if (length <= count) return Array.from({ length }, (_, i) => i);

  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    out.push(Math.round((i * (length - 1)) / (count - 1)));
  }
  return [...new Set(out)];
}

/** Short date for an axis label: "12 Mar". Locale-aware, no year — the range picker carries that. */
export function formatDayLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
