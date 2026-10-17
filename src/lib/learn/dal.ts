import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/dal";
import { adjacentCases } from "@/lib/learn/case-route";
import { getPuzzleDescription, getPuzzleName } from "@/lib/learn/puzzle-names";

export type LearnPuzzle = {
  id: string;
  name: string;
  description: string;
  series: LearnSeries[];
};

export type LearnSeries = {
  id: string;
  slug: string;
  name: string;
  description: string;
  type: "tutorial" | "algorithms";
  accessTier?: "public" | "free" | "premium";
  casesCount?: number;
  learnedCount?: number;
  /** Approved algorithms across the set's cases (algorithm sets only). */
  algorithmsCount?: number;
  /** Published steps (tutorial series only). */
  stepsCount?: number;
};

export type AlgorithmCase = {
  id: string;
  puzzle_type: string;
  subset: string;
  case_number: number;
  name: string;
  description: string | null;
  setup_moves: string | null;
  cube_state: string;
  thumbnail_url?: string | null;
  algorithms: Algorithm[];
  learned: boolean;
  starred: boolean;
};

export type Algorithm = {
  id: string;
  case_id: string;
  moves: string;
  move_count: number;
  is_main: boolean;
  label: string | null;
  is_approved: boolean;
};

export type TutorialStep = {
  id: string;
  title: string;
  content_md: string;
  cube_state: string | null;
  order_index: number;
  completed: boolean;
};

/**
 * Returns a list of puzzles that have published series or algorithm cases.
 * Algorithm subsets are now sourced from the algorithm_subsets table for
 * correct naming, ordering, and access-tier data.
 */
export const getPuzzles = cache(async (): Promise<LearnPuzzle[]> => {
  const supabase = await createClient();

  // Published series and subsets, plus the rows the cards and hero count, so
  // no number on the Learn pages is made up.
  const [
    { data: tutorialSeries },
    { data: algSubsets },
    { data: caseRows },
    { data: stepRows },
  ] = await Promise.all([
    supabase
      .from("tutorial_series")
      .select("*")
      .eq("is_published", true)
      .order("order_index"),
    supabase
      .from("algorithm_subsets")
      .select("*")
      .eq("is_published", true)
      .order("order_index"),
    supabase
      .from("algorithm_cases")
      .select("puzzle_type, subset, algorithms(is_approved)"),
    supabase
      .from("tutorial_steps")
      .select("series_id")
      .eq("is_published", true),
  ]);

  const caseCounts = new Map<string, { cases: number; algorithms: number }>();
  for (const c of caseRows ?? []) {
    const key = `${c.puzzle_type}/${c.subset}`;
    const entry = caseCounts.get(key) ?? { cases: 0, algorithms: 0 };
    entry.cases += 1;
    entry.algorithms += (c.algorithms ?? []).filter((a) => a.is_approved).length;
    caseCounts.set(key, entry);
  }

  const stepCounts = new Map<string, number>();
  for (const s of stepRows ?? []) {
    stepCounts.set(s.series_id, (stepCounts.get(s.series_id) ?? 0) + 1);
  }

  const puzzlesMap = new Map<string, LearnPuzzle>();

  // Add algorithm subsets
  if (algSubsets) {
    for (const subset of algSubsets) {
      const puzzleId = subset.puzzle_type as string;
      if (!puzzlesMap.has(puzzleId)) {
        puzzlesMap.set(puzzleId, {
          id: puzzleId,
          name: getPuzzleName(puzzleId),
          description: getPuzzleDescription(puzzleId),
          series: [],
        });
      }
      puzzlesMap.get(puzzleId)!.series.push({
        id: subset.slug,
        slug: subset.slug,
        name: subset.name,
        description: subset.description ?? `Algorithm subset: ${subset.name}`,
        type: "algorithms",
        accessTier: subset.access_tier as "public" | "free" | "premium",
        casesCount: caseCounts.get(`${puzzleId}/${subset.slug}`)?.cases ?? 0,
        algorithmsCount:
          caseCounts.get(`${puzzleId}/${subset.slug}`)?.algorithms ?? 0,
      });
    }
  }

  // Add tutorial series
  if (tutorialSeries) {
    for (const s of tutorialSeries) {
      if (!puzzlesMap.has(s.puzzle_type)) {
        puzzlesMap.set(s.puzzle_type, {
          id: s.puzzle_type,
          name: getPuzzleName(s.puzzle_type),
          description: getPuzzleDescription(s.puzzle_type),
          series: [],
        });
      }
      puzzlesMap.get(s.puzzle_type)!.series.push({
        id: s.slug,
        slug: s.slug,
        name: s.title,
        description: s.description || "",
        type: "tutorial",
        accessTier:
          (s.access_tier as "public" | "free" | "premium") ?? "public",
        stepsCount: stepCounts.get(s.id) ?? 0,
      });
    }
  }

  return Array.from(puzzlesMap.values());
});

/**
 * Returns a specific puzzle and its series.
 */
export const getPuzzle = cache(
  async (puzzleId: string): Promise<LearnPuzzle | null> => {
    const puzzles = await getPuzzles();
    return puzzles.find((p) => p.id === puzzleId) || null;
  },
);

/**
 * Returns a specific series (either a tutorial series or an algorithm subset).
 */
export const getSeries = cache(
  async (
    puzzleId: string,
    seriesSlug: string,
  ): Promise<{
    series: LearnSeries;
    cases: AlgorithmCase[];
    steps: TutorialStep[];
  } | null> => {
    const puzzle = await getPuzzle(puzzleId);
    if (!puzzle) return null;

    const series = puzzle.series.find((s) => s.slug === seriesSlug);
    if (!series) return null;

    const supabase = await createClient();
    const user = await getUser();

    if (series.type === "algorithms") {
      const { data: casesData } = await supabase
        .from("algorithm_cases")
        .select("*, algorithms(*)")
        .eq("puzzle_type", puzzleId)
        .eq("subset", seriesSlug)
        .order("case_number");

      if (!casesData) return { series, cases: [], steps: [] };

      const cases = casesData.map((c) => {
        const algs = (c.algorithms as Algorithm[]).filter(
          (a) => a.is_approved,
        );
        return { ...c, algorithms: algs, learned: false, starred: false };
      }) as AlgorithmCase[];

      if (user && cases.length > 0) {
        const mainAlgIds = cases.flatMap((c) => c.algorithms.map((a) => a.id));
        if (mainAlgIds.length > 0) {
          const { data: bookmarks } = await supabase
            .from("user_algorithm_bookmarks")
            .select("algorithm_id, learned")
            .eq("user_id", user.id)
            .in("algorithm_id", mainAlgIds);

          if (bookmarks) {
            const bookmarkMap = new Map(
              bookmarks.map((b) => [b.algorithm_id, b]),
            );
            for (const c of cases) {
              for (const a of c.algorithms) {
                const b = bookmarkMap.get(a.id);
                if (b) {
                  c.learned = c.learned || b.learned;
                  c.starred = false;
                }
              }
            }
          }
        }
      }

      return { series, cases, steps: [] };
    } else {
      const { data: stepsData } = await supabase
        .from("tutorial_steps")
        .select("*, tutorial_series!inner(slug)")
        .eq("tutorial_series.slug", seriesSlug)
        .eq("is_published", true)
        .order("order_index");

      if (!stepsData) return { series, cases: [], steps: [] };

      const steps = stepsData.map((s) => ({
        ...s,
        completed: false,
      })) as TutorialStep[];

      if (user && steps.length > 0) {
        const stepIds = steps.map((s) => s.id);
        const { data: progress } = await supabase
          .from("user_tutorial_progress")
          .select("step_id")
          .eq("user_id", user.id)
          .in("step_id", stepIds);

        if (progress) {
          const progressSet = new Set(progress.map((p) => p.step_id));
          for (const s of steps) {
            s.completed = progressSet.has(s.id);
          }
        }
      }

      return { series, cases: [], steps };
    }
  },
);

/**
 * One case of an algorithm set, by case number, for /learn/[puzzle]/[series]/[case].
 * Built on the cached getSeries(), so the learned state comes with it and the
 * page and its metadata share one query. Null for a tutorial series, an
 * unpublished set or an unknown number.
 */
export const getCase = cache(
  async (
    puzzleId: string,
    seriesSlug: string,
    caseNumber: number,
  ): Promise<{
    puzzle: LearnPuzzle;
    series: LearnSeries;
    algCase: AlgorithmCase;
    /** Every case in the set, in case-number order, for the case switcher. */
    cases: AlgorithmCase[];
    prev: AlgorithmCase | null;
    next: AlgorithmCase | null;
  } | null> => {
    const [puzzle, data] = await Promise.all([
      getPuzzle(puzzleId),
      getSeries(puzzleId, seriesSlug),
    ]);
    if (!puzzle || !data || data.series.type !== "algorithms") return null;

    const algCase = data.cases.find((c) => c.case_number === caseNumber);
    if (!algCase) return null;

    return {
      puzzle,
      series: data.series,
      algCase,
      cases: data.cases,
      ...adjacentCases(data.cases, caseNumber),
    };
  },
);

/**
 * Returns a specific algorithm case by ID, including its algorithms.
 * Used for "Train Case" mode in the timer (single-case training).
 */
export const getAlgorithmCaseById = cache(
  async (id: string): Promise<AlgorithmCase | null> => {
    const supabase = await createClient();
    const user = await getUser();

    const { data: caseData } = await supabase
      .from("algorithm_cases")
      .select("*, algorithms(*)")
      .eq("id", id)
      .single();

    if (!caseData) return null;

    const algCase = {
      ...caseData,
      learned: false,
      starred: false,
    } as AlgorithmCase;
    algCase.algorithms = (algCase.algorithms as Algorithm[]).filter(
      (a) => a.is_approved,
    );

    if (user && algCase.algorithms.length > 0) {
      const mainAlgIds = algCase.algorithms.map((a) => a.id);
      const { data: bookmarks } = await supabase
        .from("user_algorithm_bookmarks")
        .select("learned")
        .eq("user_id", user.id)
        .in("algorithm_id", mainAlgIds);

      if (bookmarks && bookmarks.length > 0) {
        algCase.learned = bookmarks.some((b) => b.learned);
      }
    }

    return algCase;
  },
);
