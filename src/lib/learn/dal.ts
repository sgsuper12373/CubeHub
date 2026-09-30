import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/dal";

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
};

export type AlgorithmSubset = {
  id: string;
  puzzleType: string;
  slug: string;
  name: string;
  description: string | null;
  accessTier: "public" | "free" | "premium";
  isPublished: boolean;
  orderIndex: number;
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

function getPuzzleName(id: string) {
  if (id === "333") return "3x3 Cube";
  if (id === "222") return "2x2 Cube";
  return id;
}

function getPuzzleDescription(id: string) {
  if (id === "333") return "Learn how to solve the classic 3x3 Rubik's Cube.";
  if (id === "222") return "Learn how to solve the pocket 2x2 cube.";
  return "";
}

/**
 * Returns all published algorithm subsets for a given puzzle type.
 * Sourced from the algorithm_subsets table (20260914000000_access_tiers.sql).
 */
export const getAlgorithmSubsets = cache(
  async (puzzleType: string): Promise<AlgorithmSubset[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("algorithm_subsets")
      .select("*")
      .eq("puzzle_type", puzzleType)
      .eq("is_published", true)
      .order("order_index");

    if (error || !data) return [];

    return data.map((row) => ({
      id: row.id,
      puzzleType: row.puzzle_type,
      slug: row.slug,
      name: row.name,
      description: row.description ?? null,
      accessTier: row.access_tier as "public" | "free" | "premium",
      isPublished: row.is_published,
      orderIndex: row.order_index,
    }));
  },
);

/**
 * Returns a list of puzzles that have published series or algorithm cases.
 * Algorithm subsets are now sourced from the algorithm_subsets table for
 * correct naming, ordering, and access-tier data.
 */
export const getPuzzles = cache(async (): Promise<LearnPuzzle[]> => {
  const supabase = await createClient();

  // 1. Fetch published tutorial series
  const { data: tutorialSeries } = await supabase
    .from("tutorial_series")
    .select("*")
    .eq("is_published", true)
    .order("order_index");

  // 2. Fetch published algorithm subsets
  const { data: algSubsets } = await supabase
    .from("algorithm_subsets")
    .select("*")
    .eq("is_published", true)
    .order("order_index");

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
