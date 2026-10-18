/**
 * Difficulty as the content states it: `tutorial_series.difficulty` (the
 * `difficulty_level` enum). Algorithm sets have no such column, so they show
 * none rather than a made-up one.
 */
export const DIFFICULTY_LEVELS = ["beginner", "intermediate", "advanced", "expert"] as const;

export type Difficulty = (typeof DIFFICULTY_LEVELS)[number];

const LABELS: Record<Difficulty, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  expert: "Expert",
};

export function toDifficulty(value: unknown): Difficulty | undefined {
  return DIFFICULTY_LEVELS.includes(value as Difficulty) ? (value as Difficulty) : undefined;
}

/** 1 (beginner) to 4 (expert), for the card's bar meter. */
export function difficultyRank(d: Difficulty): number {
  return DIFFICULTY_LEVELS.indexOf(d) + 1;
}

/**
 * "Beginner", or "Beginner to Intermediate" across a puzzle's series; null
 * when none of them states a difficulty.
 */
export function difficultyRange(series: { difficulty?: Difficulty }[]): string | null {
  const ranks = series.flatMap((s) => (s.difficulty ? [difficultyRank(s.difficulty)] : []));
  if (ranks.length === 0) return null;
  const lo = DIFFICULTY_LEVELS[Math.min(...ranks) - 1];
  const hi = DIFFICULTY_LEVELS[Math.max(...ranks) - 1];
  return lo === hi ? LABELS[lo] : `${LABELS[lo]} to ${LABELS[hi]}`;
}

export function difficultyLabel(d: Difficulty): string {
  return LABELS[d];
}
