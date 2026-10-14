/** Head-to-head maths for /profile/[username]/compare. Pure, for tests. */

export type Side = "me" | "them" | "tie" | null;

export interface CompareCell {
  mine: number | null;
  theirs: number | null;
  /** Who is faster; null when either side has no time. */
  faster: Side;
  /** How much faster the faster side is, in ms. */
  gapMs: number | null;
}

/** To the centisecond the page shows, truncated like formatMs. */
const shown = (ms: number) => Math.floor(ms / 10) * 10;

/**
 * Judged on the times as displayed, so the gap is the difference of the two
 * numbers on screen (0.15 vs 0.02 is 0.13, not 0.12 from the raw ms) and two
 * times that read the same are a tie.
 */
export function compareTimes(mine: number | null, theirs: number | null): CompareCell {
  if (mine === null || theirs === null) return { mine, theirs, faster: null, gapMs: null };
  const a = shown(mine);
  const b = shown(theirs);
  if (a === b) return { mine, theirs, faster: "tie", gapMs: 0 };
  return { mine, theirs, faster: a < b ? "me" : "them", gapMs: Math.abs(a - b) };
}

/** "Head-to-head: you lead 3–2" tally over the cells both sides have. */
export function tally(cells: readonly CompareCell[]): { me: number; them: number } {
  return cells.reduce(
    (acc, c) => ({ me: acc.me + (c.faster === "me" ? 1 : 0), them: acc.them + (c.faster === "them" ? 1 : 0) }),
    { me: 0, them: 0 },
  );
}

/** Events either cuber has a PB on, in the given registry order. */
export function sharedEventOrder(
  registry: readonly string[],
  mine: readonly { puzzleType: string }[],
  theirs: readonly { puzzleType: string }[],
): string[] {
  const has = new Set([...mine, ...theirs].map((pb) => pb.puzzleType));
  return registry.filter((e) => has.has(e));
}
