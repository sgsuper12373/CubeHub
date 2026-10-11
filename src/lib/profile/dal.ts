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
  /** Null when the cuber hides their activity from others. */
  activity: ProfileActivity | null;
  /** Null when the cuber hides their learning from others. */
  learning: LearningProgress[] | null;
};

export type ProfileActivity = {
  /** IST days with at least one solve, last 53 weeks, oldest first. */
  days: { day: string; count: number }[];
  currentStreak: number;
  longestStreak: number;
  activeDays: number;
};

export type LearningProgress = {
  puzzle: string;
  slug: string;
  name: string;
  learned: number;
  total: number;
};

const EMPTY_STATS: ProfileStats = {
  hidden: false,
  totalSolves: 0,
  byEvent: {},
  firstSolveOn: null,
  lastSolveOn: null,
  activity: null,
  learning: null,
};

export type PublicProfile = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  isPublic: boolean;
  showActivity: boolean;
  showLearning: boolean;
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
      .select("id, username, display_name, avatar_url, bio, is_public, show_activity, show_learning, country, wca_id, created_at")
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
      showActivity: profile.show_activity ?? true,
      showLearning: profile.show_learning ?? true,
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
    activity: toActivity(r.activity),
    learning: toLearning(r.learning),
  };
}

const num = (v: unknown) => (typeof v === "number" ? v : 0);

function toActivity(raw: unknown): ProfileActivity | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const days = Array.isArray(r.days)
    ? r.days.flatMap((d) =>
        typeof d === "object" && d !== null && typeof (d as { d: unknown }).d === "string"
          ? [{ day: (d as { d: string }).d, count: num((d as { n: unknown }).n) }]
          : [],
      )
    : [];
  return {
    days,
    currentStreak: num(r.current_streak),
    longestStreak: num(r.longest_streak),
    activeDays: num(r.active_days),
  };
}

function toLearning(raw: unknown): LearningProgress[] | null {
  if (!Array.isArray(raw)) return null;
  return raw.flatMap((l) => {
    if (typeof l !== "object" || l === null) return [];
    const r = l as Record<string, unknown>;
    if (typeof r.slug !== "string" || typeof r.puzzle !== "string") return [];
    return [{
      puzzle: r.puzzle,
      slug: r.slug,
      name: typeof r.name === "string" ? r.name : r.slug.toUpperCase(),
      learned: num(r.learned),
      total: num(r.total),
    }];
  });
}

/** One point of a PB timeline: when the record was set, and the new time. */
export type ProgressPoint = { at: string; ms: number };

export type PbProgression = {
  single: ProgressPoint[];
  ao5: ProgressPoint[];
  ao12: ProgressPoint[];
};

function toPoints(raw: unknown): ProgressPoint[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((p) => {
    const r = p as { at?: unknown; ms?: unknown };
    return typeof r.at === "string" && typeof r.ms === "number" ? [{ at: r.at, ms: r.ms }] : [];
  });
}

/**
 * Every time single, Ao5 and Ao12 improved on one event, oldest first. Null
 * for a private profile (or if the call fails; the page then just omits the
 * chart).
 */
export const getPbProgression = cache(
  async (profileId: string, event: string): Promise<PbProgression | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_pb_progression", {
      p_user: profileId,
      p_puzzle: event,
    });
    if (error) {
      console.error("get_pb_progression failed", error);
      return null;
    }
    const r = (data ?? {}) as Record<string, unknown>;
    if (r.private === true) return null;
    return { single: toPoints(r.single), ao5: toPoints(r.ao5), ao12: toPoints(r.ao12) };
  },
);

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
  showActivity: boolean;
  showLearning: boolean;
};

export const getEditableProfile = cache(async (): Promise<EditableProfile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, country, wca_id, is_public, show_activity, show_learning")
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
    showActivity: data.show_activity ?? true,
    showLearning: data.show_learning ?? true,
  };
});
