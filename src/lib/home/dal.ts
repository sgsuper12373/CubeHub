import "server-only";
import { cache } from "react";

import { getDrillData } from "@/lib/drill/dal";
import { getPublicProfile, type LearningProgress } from "@/lib/profile/dal";

import { summariseDrillQueue, type DrillQueue } from "./drill-queue";

/**
 * Home's reads for a signed-in cuber (docs/home-plan.md → Rendering and data).
 * Each wraps an existing DAL, all React-cache()d, so cards that need the same
 * data share one query per render.
 */

export type HomeSummary = { solveCount: number; learning: LearningProgress[] };

/** Total solves and per-series learning progress, from the cuber's own profile stats. */
export const getHomeSummary = cache(async (username: string): Promise<HomeSummary> => {
  const profile = await getPublicProfile(username);
  return {
    solveCount: profile?.stats.totalSolves ?? 0,
    learning: profile?.stats.learning ?? [],
  };
});

/**
 * The series to continue: in progress (some learned, not all), most learned
 * first. The profile stats carry no "last touched" time, so "most progress"
 * stands in for "most recent" (docs/decisions.md → Home).
 */
export function pickContinueSeries(learning: readonly LearningProgress[]): LearningProgress | null {
  const inProgress = learning.filter((l) => l.learned > 0 && l.learned < l.total);
  inProgress.sort((a, b) => b.learned - a.learned || b.learned / b.total - a.learned / a.total);
  return inProgress[0] ?? null;
}

/** The 3x3 drill queue: due count, slowest cases, a switch suggestion. */
export const getDrillQueue = cache(async (): Promise<DrillQueue> => {
  const data = await getDrillData("333", { kind: "all" });
  if (!data) return { due: 0, slowest: [], suggestion: null, started: false };
  return summariseDrillQueue(data.cases, data.stats);
});

/** The next case to learn in a series: the first, in order, not marked learned. */
export const getNextUnlearnedCase = cache(
  async (puzzle: string, slug: string): Promise<{ name: string; caseNumber: number | null; moves: string | null } | null> => {
    const data = await getDrillData(puzzle, { kind: "subset", slug });
    if (!data) return null;
    const learned = new Set(data.learnedCaseIds);
    const next = data.cases.find((c) => !learned.has(c.id));
    if (!next) return null;
    const main = next.algorithms.find((a) => a.is_main) ?? next.algorithms[0];
    return { name: next.name, caseNumber: next.caseNumber, moves: main?.moves ?? null };
  },
);
