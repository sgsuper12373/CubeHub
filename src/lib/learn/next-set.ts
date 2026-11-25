/**
 * "What to learn next" (todo.md idea): the algorithm set a cuber should open
 * next, from what they've marked learned. Pure, so it's unit-tested; the
 * Learn page banner and Home's learning card use it.
 *
 * Order: finish a set you've started (the one furthest along); otherwise the
 * next set on that puzzle's path after the last one you finished; otherwise
 * start at the beginning of the 3x3 path. Null when every set is done.
 */

/** The order sets are usually learned in, per puzzle. 3x3: PLL first (21 cases, the biggest jump). */
export const LEARN_PATHS: Record<string, readonly string[]> = {
  "333": ["pll", "oll"],
  "222": ["beginner", "ortega", "cll", "eg1", "eg2"],
};

export type SetProgress = { puzzle: string; slug: string; name: string; learned: number; total: number };

export type NextSet = {
  puzzle: string;
  slug: string;
  name: string;
  kind: "continue" | "next" | "start";
  /** Cases learned and in the set; total is null for a set not started (the stats only list started ones). */
  learned: number;
  total: number | null;
  /** The finished set this one follows ("You know all of PLL"). */
  after: string | null;
};

const key = (puzzle: string, slug: string) => `${puzzle}/${slug}`;

export function suggestNextSet(
  progress: readonly SetProgress[],
  /** Set names from the Learn index, keyed "puzzle/slug", for sets not started yet. */
  names: Readonly<Record<string, string>>,
): NextSet | null {
  const byKey = new Map(progress.map((p) => [key(p.puzzle, p.slug), p]));
  const done = (puzzle: string, slug: string) => {
    const p = byKey.get(key(puzzle, slug));
    return !!p && p.total > 0 && p.learned >= p.total;
  };
  const nameOf = (puzzle: string, slug: string) => byKey.get(key(puzzle, slug))?.name ?? names[key(puzzle, slug)] ?? null;

  // 1. Finish what's started: the set furthest along.
  const started = progress.filter((p) => p.learned > 0 && p.learned < p.total);
  started.sort((a, b) => b.learned / b.total - a.learned / a.total || b.learned - a.learned);
  if (started[0]) {
    const s = started[0];
    return { puzzle: s.puzzle, slug: s.slug, name: s.name, kind: "continue", learned: s.learned, total: s.total, after: null };
  }

  // 2. The next set on a path the cuber has begun (3x3 before 2x2 on a tie).
  const puzzles = Object.keys(LEARN_PATHS).sort(
    (a, b) => Number(LEARN_PATHS[b].some((s) => done(b, s))) - Number(LEARN_PATHS[a].some((s) => done(a, s))),
  );
  for (const puzzle of puzzles) {
    const path = LEARN_PATHS[puzzle];
    const lastDone = path.reduce((acc, slug, i) => (done(puzzle, slug) ? i : acc), -1);
    if (lastDone === -1) continue;
    const slug = path.slice(lastDone + 1).find((s) => !done(puzzle, s) && nameOf(puzzle, s));
    if (slug) {
      return {
        puzzle,
        slug,
        name: nameOf(puzzle, slug)!,
        kind: "next",
        learned: 0,
        total: null,
        after: nameOf(puzzle, path[lastDone]),
      };
    }
  }

  // 3. Nothing learned yet: the start of the 3x3 path.
  if (progress.every((p) => p.learned === 0)) {
    for (const puzzle of ["333", "222"]) {
      const slug = LEARN_PATHS[puzzle].find((s) => nameOf(puzzle, s));
      if (slug) return { puzzle, slug, name: nameOf(puzzle, slug)!, kind: "start", learned: 0, total: null, after: null };
    }
  }

  // 4. Every path done, or only off-path sets left: nothing to suggest.
  for (const puzzle of puzzles) {
    const slug = LEARN_PATHS[puzzle].find((s) => !done(puzzle, s) && nameOf(puzzle, s));
    if (slug) return { puzzle, slug, name: nameOf(puzzle, slug)!, kind: "next", learned: 0, total: null, after: null };
  }
  return null;
}

/** One line for the suggestion. */
export function nextSetLine(s: NextSet): string {
  if (s.kind === "continue") {
    const left = (s.total ?? 0) - s.learned;
    return `${left} ${left === 1 ? "case" : "cases"} left in ${s.name}.`;
  }
  if (s.kind === "next" && s.after) return `You know all of ${s.after}. Next up: ${s.name}.`;
  if (s.kind === "next") return `Next up: ${s.name}.`;
  return `Start with ${s.name}: the biggest jump for most cubers.`;
}
