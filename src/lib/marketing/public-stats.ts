import "server-only";

import { createPublicClient } from "@/lib/supabase/public";

/**
 * Real numbers for the landing page's social proof. Totals come from the
 * security-definer `public_stats()` function
 * (supabase/migrations/20261125000000_public_stats.sql), which returns
 * aggregate counts only; the club count is a plain read (anon can read
 * `clubs`). Nothing here is ever a placeholder.
 */
export type PublicStats = {
  solves: number | null;
  cubers: number | null;
  casesDrilled: number | null;
  clubs: number | null;
};

/** A stat renders only at or above its minimum: "4 cubers" is real, but not proof of anything. */
export const STAT_MINIMUM = { solves: 10_000, cubers: 100, casesDrilled: 1_000, clubs: 5 } as const;

function count(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
}

/**
 * The function's one row (bigints may arrive as numbers or strings), or null
 * when there's no usable row. `clubs` is read separately.
 */
export function parsePublicStatsRow(data: unknown): Omit<PublicStats, "clubs"> | null {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const stats = { solves: count(r.solves), cubers: count(r.cubers), casesDrilled: count(r.cases_drilled) };
  return stats.solves === null && stats.cubers === null && stats.casesDrilled === null ? null : stats;
}

/**
 * The landing totals, or null when `public_stats()` is missing (migration not
 * applied), fails, or returns nothing. Null hides the whole slot.
 */
export async function getPublicStats(): Promise<PublicStats | null> {
  try {
    const supabase = createPublicClient();
    const [totals, clubs] = await Promise.all([
      supabase.rpc("public_stats"),
      supabase.from("clubs").select("id", { count: "exact", head: true }),
    ]);
    if (totals.error) return null;
    const parsed = parsePublicStatsRow(totals.data);
    if (!parsed) return null;
    return { ...parsed, clubs: clubs.error ? null : clubs.count };
  } catch {
    return null;
  }
}

/** The stats worth showing, in display order. Empty means render nothing. */
export function showableStats(stats: PublicStats | null): { key: keyof PublicStats; label: string; value: number }[] {
  if (!stats) return [];
  const rows: { key: keyof PublicStats; label: string }[] = [
    { key: "solves", label: "solves timed" },
    { key: "cubers", label: "cubers" },
    { key: "casesDrilled", label: "cases drilled" },
    { key: "clubs", label: "college clubs" },
  ];
  return rows.flatMap(({ key, label }) => {
    const value = stats[key];
    return value !== null && value >= STAT_MINIMUM[key] ? [{ key, label, value }] : [];
  });
}
