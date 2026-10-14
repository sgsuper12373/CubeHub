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

export function compareTimes(mine: number | null, theirs: number | null): CompareCell {
  if (mine === null || theirs === null) return { mine, theirs, faster: null, gapMs: null };
  if (mine === theirs) return { mine, theirs, faster: "tie", gapMs: 0 };
  return { mine, theirs, faster: mine < theirs ? "me" : "them", gapMs: Math.abs(mine - theirs) };
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
