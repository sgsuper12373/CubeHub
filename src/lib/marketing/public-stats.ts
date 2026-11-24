import "server-only";

import { createPublicClient } from "@/lib/supabase/public";

/**
 * Real numbers for the landing page's social proof. Each is null unless it
 * was read from the database; nothing here is ever a placeholder.
 *
 * - cubers: every profile (anon can read `profiles`).
 * - clubs: every club (anon can read `clubs`).
 * - solves: always null for now. `solves` is owner-only under RLS, so a total
 *   needs a security-definer `public_stats()` function first.
 */
export type PublicStats = { cubers: number | null; clubs: number | null; solves: number | null };

/** A stat renders only at or above its minimum: "4 cubers" is real, but not proof of anything. */
export const STAT_MINIMUM = { cubers: 100, clubs: 5, solves: 10_000 } as const;

export async function getPublicStats(): Promise<PublicStats> {
  try {
    const supabase = createPublicClient();
    const [profiles, clubs] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("clubs").select("id", { count: "exact", head: true }),
    ]);
    return {
      cubers: profiles.error ? null : profiles.count,
      clubs: clubs.error ? null : clubs.count,
      solves: null,
    };
  } catch {
    return { cubers: null, clubs: null, solves: null };
  }
}

/** The stats worth showing, in display order. Empty means render nothing. */
export function showableStats(stats: PublicStats): { key: keyof PublicStats; label: string; value: number }[] {
  const rows: { key: keyof PublicStats; label: string }[] = [
    { key: "solves", label: "solves timed" },
    { key: "cubers", label: "cubers" },
    { key: "clubs", label: "college clubs" },
  ];
  return rows.flatMap(({ key, label }) => {
    const value = stats[key];
    return value !== null && value >= STAT_MINIMUM[key] ? [{ key, label, value }] : [];
  });
}
