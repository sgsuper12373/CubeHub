import type { ProgressPoint } from "./dal";

/**
 * PB timeline maths. Pure, so it is unit-tested without rendering.
 *
 * A personal best is a step function: it holds until the next record, then
 * drops. Each series becomes a horizontal run to the next record's date, a
 * vertical drop to the new time, and finally a run out to the cuber's last
 * active day, so a current PB reaches the right-hand edge.
 */

/** The SVG path for one series, or "" with no points. */
export function stepPath(
  points: ProgressPoint[],
  x: (t: number) => number,
  y: (ms: number) => number,
  endT: number,
): string {
  if (points.length === 0) return "";
  const parts = [`M${x(Date.parse(points[0].at))},${y(points[0].ms)}`];
  for (let i = 1; i < points.length; i++) {
    parts.push(`H${x(Date.parse(points[i].at))}`, `V${y(points[i].ms)}`);
  }
  parts.push(`H${x(endT)}`);
  return parts.join(" ");
}

/** The time span and time range every series has to fit in. */
export function timelineExtent(series: ProgressPoint[][], lastActive: number) {
  const all = series.flat();
  if (all.length === 0) return null;
  const times = all.map((p) => Date.parse(p.at));
  const ms = all.map((p) => p.ms);
  return {
    startT: Math.min(...times),
    // A record set on the last active day still needs a sliver of width.
    endT: Math.max(lastActive, Math.max(...times) + 60_000),
    minMs: Math.min(...ms),
    maxMs: Math.max(...ms),
  };
}

/** "14.20 → 12.80": the first and current record, for the summary line. */
export function improvement(points: ProgressPoint[]): { from: number; to: number; at: string } | null {
  if (points.length < 2) return null;
  return { from: points[0].ms, to: points[points.length - 1].ms, at: points[0].at };
}
