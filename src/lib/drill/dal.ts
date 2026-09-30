import "server-only";
import { cache } from "react";

import { getUser } from "@/lib/auth/dal";
import { getPuzzle, type Algorithm } from "@/lib/learn/dal";
import { createClient } from "@/lib/supabase/server";

import { toVariantStats, VARIANT_STATS_COLUMNS, type VariantStatsRow } from "./rows";
import type { VariantStats } from "./types";

export type DrillAlgorithm = Pick<Algorithm, "id" | "moves" | "label" | "is_main" | "move_count">;

export interface DrillCase {
  id: string;
  subset: string;
  caseNumber: number | null;
  name: string;
  algorithms: DrillAlgorithm[];
}

export interface DrillSubset {
  slug: string;
  name: string;
}

/** What to drill: one algorithm subset, every subset of the puzzle, or chosen cases. */
export type DrillSelection =
  | { kind: "subset"; slug: string }
  | { kind: "all" }
  | { kind: "cases"; ids: string[] };

export interface DrillData {
  subsets: DrillSubset[];
  cases: DrillCase[];
  /** Empty for guests. */
  stats: VariantStats[];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Cases, approved variants and (signed in) per-variant stats for a drill.
 * Returns null when the puzzle does not exist.
 */
export const getDrillData = cache(
  async (puzzleId: string, selection: DrillSelection): Promise<DrillData | null> => {
    const puzzle = await getPuzzle(puzzleId);
    if (!puzzle) return null;

    const subsets: DrillSubset[] = puzzle.series
      .filter((s) => s.type === "algorithms")
      .map((s) => ({ slug: s.slug, name: s.name }));
    const known = new Set(subsets.map((s) => s.slug));

    const supabase = await createClient();
    let query = supabase
      .from("algorithm_cases")
      .select("id, subset, case_number, name, algorithms(id, moves, label, is_main, is_approved, move_count)")
      .eq("puzzle_type", puzzleId)
      .order("subset")
      .order("case_number");

    if (selection.kind === "subset") {
      if (!known.has(selection.slug)) return { subsets, cases: [], stats: [] };
      query = query.eq("subset", selection.slug);
    } else if (selection.kind === "all") {
      query = query.in("subset", [...known]);
    } else {
      const ids = selection.ids.filter((id) => UUID.test(id));
      if (ids.length === 0) return { subsets, cases: [], stats: [] };
      query = query.in("id", ids).in("subset", [...known]);
    }

    const { data, error } = await query;
    if (error || !data) {
      if (error) console.error("drill cases query failed", error);
      return { subsets, cases: [], stats: [] };
    }

    const cases: DrillCase[] = data
      .map((c) => ({
        id: c.id as string,
        subset: c.subset as string,
        caseNumber: (c.case_number as number | null) ?? null,
        name: (c.name as string | null) ?? `Case ${c.case_number ?? ""}`.trim(),
        algorithms: ((c.algorithms ?? []) as (DrillAlgorithm & { is_approved: boolean })[])
          .filter((a) => a.is_approved)
          // Main first, then the rest in a stable order.
          .sort((a, b) => Number(b.is_main) - Number(a.is_main) || a.id.localeCompare(b.id))
          .map(({ id, moves, label, is_main, move_count }) => ({ id, moves, label, is_main, move_count })),
      }))
      .filter((c) => c.algorithms.length > 0);

    const user = await getUser();
    if (!user || cases.length === 0) return { subsets, cases, stats: [] };

    const algorithmIds = cases.flatMap((c) => c.algorithms.map((a) => a.id));
    const { data: rows, error: statsError } = await supabase
      .from("v_drill_variant_stats")
      .select(VARIANT_STATS_COLUMNS)
      .eq("user_id", user.id)
      .in("algorithm_id", algorithmIds);
    if (statsError) console.error("drill stats query failed", statsError);

    return {
      subsets,
      cases,
      stats: ((rows ?? []) as VariantStatsRow[]).map(toVariantStats),
    };
  },
);
