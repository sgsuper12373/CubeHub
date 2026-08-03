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
  casesCount?: number;
  learnedCount?: number;
};

export type AlgorithmCase = {
  id: string;
  puzzle_type: string;
  subset: string;
  case_number: number;
  name: string;
  description: string | null;
  cube_state: string;
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
 * Returns a list of puzzles that have published series or algorithm cases.
 */
export const getPuzzles = cache(async (): Promise<LearnPuzzle[]> => {
  const supabase = await createClient();

  // 1. Fetch published tutorial series
  const { data: tutorialSeries } = await supabase
    .from("tutorial_series")
    .select("*")
    .eq("is_published", true)
    .order("order_index");

  // 2. Fetch distinct algorithm subsets
  const { data: algCases } = await supabase
    .from("algorithm_cases")
    .select("puzzle_type, subset");
  
  // 3. (Optional) Fetch user bookmarks and progress for counts (simplified for now)

  const puzzlesMap = new Map<string, LearnPuzzle>();

  // Add algorithm subsets (like OLL, PLL)
  if (algCases) {
    const subsetMap = new Map<string, Set<string>>(); // puzzle -> set of subsets
    for (const c of algCases) {
      if (!subsetMap.has(c.puzzle_type)) {
        subsetMap.set(c.puzzle_type, new Set());
      }
      subsetMap.get(c.puzzle_type)!.add(c.subset);
    }

    for (const [puzzleId, subsets] of subsetMap.entries()) {
      if (!puzzlesMap.has(puzzleId)) {
        puzzlesMap.set(puzzleId, {
          id: puzzleId,
          name: getPuzzleName(puzzleId),
          description: getPuzzleDescription(puzzleId),
          series: [],
        });
      }
      for (const subset of subsets) {
        puzzlesMap.get(puzzleId)!.series.push({
          id: subset,
          slug: subset,
          name: subset.toUpperCase(),
          description: `Algorithm subset: ${subset.toUpperCase()}`,
          type: "algorithms",
        });
      }
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
      });
    }
  }

  return Array.from(puzzlesMap.values());
});

/**
 * Returns a specific puzzle and its series.
 */
export const getPuzzle = cache(async (puzzleId: string): Promise<LearnPuzzle | null> => {
  const puzzles = await getPuzzles();
  return puzzles.find((p) => p.id === puzzleId) || null;
});

/**
 * Returns a specific series (either a tutorial series or an algorithm subset).
 */
export const getSeries = cache(async (puzzleId: string, seriesSlug: string): Promise<{ series: LearnSeries, cases: AlgorithmCase[], steps: TutorialStep[] } | null> => {
  const puzzle = await getPuzzle(puzzleId);
  if (!puzzle) return null;

  const series = puzzle.series.find((s) => s.slug === seriesSlug);
  if (!series) return null;

  const supabase = await createClient();
  const user = await getUser();

  if (series.type === "algorithms") {
    // Fetch cases and algorithms
    const { data: casesData } = await supabase
      .from("algorithm_cases")
      .select("*, algorithms(*)")
      .eq("puzzle_type", puzzleId)
      .eq("subset", seriesSlug)
      .order("case_number");
      
    if (!casesData) return { series, cases: [], steps: [] };
    
    // Filter to approved main algorithms
    const cases = casesData.map(c => {
       const algs = c.algorithms.filter((a: { is_approved: boolean; is_main: boolean }) => a.is_approved && a.is_main);
       return { ...c, algorithms: algs, learned: false, starred: false };
    }) as AlgorithmCase[];

    // Fetch user bookmarks if logged in
    if (user && cases.length > 0) {
      // Find the main algorithm IDs to check bookmarks against
      const mainAlgIds = cases.flatMap(c => c.algorithms.map(a => a.id));
      
      if (mainAlgIds.length > 0) {
        const { data: bookmarks } = await supabase
          .from("user_algorithm_bookmarks")
          .select("algorithm_id, learned")
          .eq("user_id", user.id)
          .in("algorithm_id", mainAlgIds);
          
        if (bookmarks) {
          const bookmarkMap = new Map(bookmarks.map(b => [b.algorithm_id, b]));
          for (const c of cases) {
            for (const a of c.algorithms) {
              const b = bookmarkMap.get(a.id);
              if (b) {
                c.learned = c.learned || b.learned;
                // Currently no starred in DB schema, simulating or skipping
                c.starred = false;
              }
            }
          }
        }
      }
    }

    return { series, cases, steps: [] };
  } else {
    // Fetch tutorial steps
    const { data: stepsData } = await supabase
      .from("tutorial_steps")
      .select("*, tutorial_series!inner(slug)")
      .eq("tutorial_series.slug", seriesSlug)
      .eq("is_published", true)
      .order("order_index");

    if (!stepsData) return { series, cases: [], steps: [] };
    
    const steps = stepsData.map(s => ({ ...s, completed: false })) as TutorialStep[];
    
    // Fetch user progress if logged in
    if (user && steps.length > 0) {
      const stepIds = steps.map(s => s.id);
      const { data: progress } = await supabase
        .from("user_tutorial_progress")
        .select("step_id")
        .eq("user_id", user.id)
        .in("step_id", stepIds);
        
      if (progress) {
        const progressSet = new Set(progress.map(p => p.step_id));
        for (const s of steps) {
          s.completed = progressSet.has(s.id);
        }
      }
    }

    return { series, cases: [], steps };
  }
});

/**
 * Returns a specific algorithm case by ID, including its algorithms.
 * Used for the "Train Case" mode in the timer.
 */
export const getAlgorithmCaseById = cache(async (id: string): Promise<AlgorithmCase | null> => {
  const supabase = await createClient();
  const user = await getUser();

  const { data: caseData } = await supabase
    .from("algorithm_cases")
    .select("*, algorithms(*)")
    .eq("id", id)
    .single();

  if (!caseData) return null;

  const algCase = { ...caseData, learned: false, starred: false } as AlgorithmCase;
  algCase.algorithms = algCase.algorithms.filter((a: { is_approved: boolean; is_main: boolean }) => a.is_approved && a.is_main);

  if (user && algCase.algorithms.length > 0) {
    const mainAlgIds = algCase.algorithms.map(a => a.id);
    const { data: bookmarks } = await supabase
      .from("user_algorithm_bookmarks")
      .select("learned")
      .eq("user_id", user.id)
      .in("algorithm_id", mainAlgIds);
      
    if (bookmarks && bookmarks.length > 0) {
      algCase.learned = bookmarks.some(b => b.learned);
    }
  }

  return algCase;
});
