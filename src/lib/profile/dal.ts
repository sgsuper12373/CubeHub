import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type PublicProfile = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  country: string | null;
  wcaId: string | null;
  createdAt: string;
  totalSolves: number;
  eloRating: number;
  peakEloRating: number;
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
      .select("id, username, display_name, avatar_url, country, wca_id, created_at")
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

    // 3. Fetch ELO rating for 3x3 (default 1000)
    const { data: elo } = await supabase
      .from("elo_ratings")
      .select("rating, peak_rating")
      .eq("user_id", profile.id)
      .eq("puzzle_type", "333")
      .maybeSingle();

    // 4. Fetch total solves count (excluding soft-deleted)
    const { count } = await supabase
      .from("solves")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .is("deleted_at", null);

    return {
      id: profile.id,
      username: profile.username,
      displayName: profile.display_name,
      avatarUrl: profile.avatar_url,
      country: profile.country ?? "IN",
      wcaId: profile.wca_id ?? null,
      createdAt: profile.created_at,
      totalSolves: count ?? 0,
      eloRating: elo?.rating ?? 1000,
      peakEloRating: elo?.peak_rating ?? 1000,
      personalBests: (pbs ?? []).map((pb) => ({
        puzzleType: pb.puzzle_type,
        category: pb.category,
        timeMs: pb.time_ms,
        achievedAt: pb.achieved_at,
      })),
    };
  },
);
