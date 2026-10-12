import "server-only";
import { createPublicClient } from "@/lib/supabase/public";

/**
 * Cookie-free reads of published Learn content, for the sitemap and the case
 * OG images. Every failure returns empty or null instead of throwing, so a
 * build without database access still produces a sitemap and an image.
 */

export type LearnIndex = {
  /** Published algorithm sets */
  sets: { puzzle: string; slug: string }[];
  /** Published tutorial series */
  tutorials: { puzzle: string; slug: string }[];
  /** Every case in a published set */
  cases: { puzzle: string; series: string; caseNumber: number }[];
};

export async function getPublishedLearnIndex(): Promise<LearnIndex> {
  try {
    const supabase = createPublicClient();
    const [subsets, tutorials] = await Promise.all([
      supabase
        .from("algorithm_subsets")
        .select("puzzle_type, slug")
        .eq("is_published", true)
        .order("order_index"),
      supabase
        .from("tutorial_series")
        .select("puzzle_type, slug")
        .eq("is_published", true)
        .order("order_index"),
    ]);

    const sets = (subsets.data ?? []).map((s) => ({ puzzle: s.puzzle_type as string, slug: s.slug as string }));
    const published = new Set(sets.map((s) => `${s.puzzle}/${s.slug}`));

    const { data: caseRows } = sets.length
      ? await supabase
          .from("algorithm_cases")
          .select("puzzle_type, subset, case_number")
          .in("subset", [...new Set(sets.map((s) => s.slug))])
          .not("case_number", "is", null)
          .order("case_number")
      : { data: [] };

    return {
      sets,
      tutorials: (tutorials.data ?? []).map((t) => ({ puzzle: t.puzzle_type as string, slug: t.slug as string })),
      cases: (caseRows ?? [])
        .filter((c) => published.has(`${c.puzzle_type}/${c.subset}`))
        .map((c) => ({ puzzle: c.puzzle_type as string, series: c.subset as string, caseNumber: c.case_number as number })),
    };
  } catch {
    return { sets: [], tutorials: [], cases: [] };
  }
}

export type PublicCase = {
  name: string;
  case_number: number;
  description: string | null;
  setName: string;
  mainMoves: string | null;
  moveCount: number | null;
  algorithmCount: number;
};

/** One case of a published set, with its main algorithm, for the OG image. */
export async function getPublicCase(
  puzzle: string,
  series: string,
  caseNumber: number,
): Promise<PublicCase | null> {
  try {
    const supabase = createPublicClient();
    const [{ data: subset }, { data: row }] = await Promise.all([
      supabase
        .from("algorithm_subsets")
        .select("name")
        .eq("puzzle_type", puzzle)
        .eq("slug", series)
        .eq("is_published", true)
        .maybeSingle(),
      supabase
        .from("algorithm_cases")
        .select("name, case_number, description, algorithms(moves, move_count, is_main, is_approved)")
        .eq("puzzle_type", puzzle)
        .eq("subset", series)
        .eq("case_number", caseNumber)
        .maybeSingle(),
    ]);
    if (!subset || !row) return null;

    const algs = ((row.algorithms ?? []) as {
      moves: string;
      move_count: number;
      is_main: boolean;
      is_approved: boolean;
    }[]).filter((a) => a.is_approved);
    const main = algs.find((a) => a.is_main) ?? algs[0] ?? null;

    return {
      name: row.name as string,
      case_number: row.case_number as number,
      description: (row.description as string | null) ?? null,
      setName: subset.name as string,
      mainMoves: main?.moves ?? null,
      moveCount: main?.move_count ?? null,
      algorithmCount: algs.length,
    };
  } catch {
    return null;
  }
}
