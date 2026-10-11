import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Aggregates from `get_profile_stats`; dates are IST calendar dates
 * (YYYY-MM-DD). `hidden` means the profile is private and the viewer isn't
 * its owner, so every number is withheld.
 */
export type ProfileStats = {
  hidden: boolean;
  totalSolves: number;
  byEvent: Record<string, number>;
  firstSolveOn: string | null;
  lastSolveOn: string | null;
};

const EMPTY_STATS: ProfileStats = { hidden: false, totalSolves: 0, byEvent: {}, firstSolveOn: null, lastSolveOn: null };

export type PublicProfile = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  isPublic: boolean;
  country: string | null;
  wcaId: string | null;
  createdAt: string;
  stats: ProfileStats;
  personalBests: {
    puzzleType: string;
    category: string;
    timeMs: number;
    achievedAt: string;
  }[];
};

export const getPublicProfile = cache(
  async (username: string): Promise<PublicProfile | null> => {
    const supabase = await createClient();

    // 1. Fetch profile by case-insensitive username match
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, bio, is_public, country, wca_id, created_at")
      .ilike("username", username)
      .maybeSingle();

    if (error || !profile) {
      return null;
    }

    // 2. Fetch all-time personal bests
    const { data: pbs } = await supabase
      .from("personal_bests")
      .select("puzzle_type, category, time_ms, achieved_at")
      .eq("user_id", profile.id)
      .order("time_ms", { ascending: true });

    // 3. Solve counts. `solves` is owner-only under RLS, so other people's
    // numbers come from a SECURITY DEFINER function that returns aggregates
    // only (supabase/migrations/20261012000000_profile_stats.sql).
    const { data: rawStats, error: statsError } = await supabase.rpc("get_profile_stats", {
      p_user: profile.id,
    });
    if (statsError) console.error("get_profile_stats failed", statsError);
    const stats = toStats(rawStats);

    return {
      id: profile.id,
      username: profile.username,
      displayName: profile.display_name,
      avatarUrl: profile.avatar_url,
      bio: profile.bio ?? null,
      isPublic: profile.is_public ?? true,
      country: profile.country ?? "IN",
      wcaId: profile.wca_id ?? null,
      createdAt: profile.created_at,
      stats,
      personalBests: (pbs ?? []).map((pb) => ({
        puzzleType: pb.puzzle_type,
        category: pb.category,
        timeMs: pb.time_ms,
        achievedAt: pb.achieved_at,
      })),
    };
  },
);

function toStats(raw: unknown): ProfileStats {
  if (typeof raw !== "object" || raw === null) return EMPTY_STATS;
  const r = raw as Record<string, unknown>;
  const byEvent: Record<string, number> = {};
  if (typeof r.by_event === "object" && r.by_event !== null) {
    for (const [event, n] of Object.entries(r.by_event)) {
      if (typeof n === "number") byEvent[event] = n;
    }
  }
  if (r.private === true) return { ...EMPTY_STATS, hidden: true };
  return {
    hidden: false,
    totalSolves: typeof r.total_solves === "number" ? r.total_solves : 0,
    byEvent,
    firstSolveOn: typeof r.first_solve_on === "string" ? r.first_solve_on : null,
    lastSolveOn: typeof r.last_solve_on === "string" ? r.last_solve_on : null,
  };
}

/** The signed-in cuber's own row, with every field the edit form shows. */
export type EditableProfile = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  country: string;
  wcaId: string | null;
  isPublic: boolean;
};

export const getEditableProfile = cache(async (): Promise<EditableProfile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, country, wca_id, is_public")
    .eq("id", user.id)
    .single();
  if (!data) return null;

  return {
    id: data.id,
    username: data.username,
    displayName: data.display_name,
    avatarUrl: data.avatar_url,
    bio: data.bio,
    country: data.country ?? "IN",
    wcaId: data.wca_id,
    isPublic: data.is_public ?? true,
  };
});
