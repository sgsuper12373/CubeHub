import "server-only";
import { cache } from "react";

import { getUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

import { toFollowSummary, type FollowSummary, type PersonRow } from "./types";

/**
 * Reads for the social layer. RLS and the SECURITY DEFINER RPCs in
 * `20261018000100_social.sql` decide what's visible; these only shape rows.
 */

type ProfileJoin = { id: string; username: string; display_name: string | null; avatar_url: string | null };

function toPerson(p: ProfileJoin): PersonRow {
  return { id: p.id, username: p.username, displayName: p.display_name, avatarUrl: p.avatar_url };
}

/** Null when the viewer is blocked by this cuber. */
export const getFollowSummary = cache(async (userId: string): Promise<FollowSummary | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_follow_summary", { p_user: userId });
  if (error) {
    console.error("get_follow_summary failed", error);
    return null;
  }
  return toFollowSummary(data);
});

const LIST_LIMIT = 200;

/** Accepted followers of a cuber, newest first. */
export const getFollowers = cache(async (userId: string): Promise<PersonRow[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_follows")
    .select("created_at, person:profiles!user_follows_follower_id_fkey(id, username, display_name, avatar_url)")
    .eq("following_id", userId)
    .eq("status", "accepted")
    .order("created_at", { ascending: false })
    .limit(LIST_LIMIT);
  if (error) console.error("followers query failed", error);
  return (data ?? []).flatMap((r) => (r.person ? [toPerson(r.person as unknown as ProfileJoin)] : []));
});

/** Who a cuber follows (accepted), newest first. */
export const getFollowing = cache(async (userId: string): Promise<PersonRow[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_follows")
    .select("created_at, person:profiles!user_follows_following_id_fkey(id, username, display_name, avatar_url)")
    .eq("follower_id", userId)
    .eq("status", "accepted")
    .order("created_at", { ascending: false })
    .limit(LIST_LIMIT);
  if (error) console.error("following query failed", error);
  return (data ?? []).flatMap((r) => (r.person ? [toPerson(r.person as unknown as ProfileJoin)] : []));
});

export interface FollowRequest extends PersonRow {
  requestedAt: string;
}

/** Pending requests to follow the signed-in cuber. */
export const getPendingRequests = cache(async (): Promise<FollowRequest[]> => {
  const user = await getUser();
  if (!user) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_follows")
    .select("created_at, person:profiles!user_follows_follower_id_fkey(id, username, display_name, avatar_url)")
    .eq("following_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) console.error("requests query failed", error);
  return (data ?? []).flatMap((r) =>
    r.person ? [{ ...toPerson(r.person as unknown as ProfileJoin), requestedAt: r.created_at as string }] : [],
  );
});

export interface LeaderboardRow extends PersonRow {
  timeMs: number;
  achievedAt: string;
  isMe: boolean;
}

export async function getFriendsLeaderboard(puzzle: string, category: string): Promise<LeaderboardRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_friends_leaderboard", {
    p_puzzle: puzzle,
    p_category: category,
  });
  if (error) {
    console.error("get_friends_leaderboard failed", error);
    return [];
  }
  return ((data ?? []) as (ProfileJoin & { user_id: string; time_ms: number; achieved_at: string; is_me: boolean })[]).map(
    (r) => ({
      ...toPerson({ ...r, id: r.user_id }),
      timeMs: r.time_ms,
      achievedAt: r.achieved_at,
      isMe: r.is_me,
    }),
  );
}

export interface RecentPb extends PersonRow {
  puzzleType: string;
  category: string;
  timeMs: number;
  achievedAt: string;
}

export async function getFriendsRecentPbs(days = 14): Promise<RecentPb[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_friends_recent_pbs", { p_days: days });
  if (error) {
    console.error("get_friends_recent_pbs failed", error);
    return [];
  }
  return (
    (data ?? []) as (ProfileJoin & {
      user_id: string;
      puzzle_type: string;
      category: string;
      time_ms: number;
      achieved_at: string;
    })[]
  ).map((r) => ({
    ...toPerson({ ...r, id: r.user_id }),
    puzzleType: r.puzzle_type,
    category: r.category,
    timeMs: r.time_ms,
    achievedAt: r.achieved_at,
  }));
}

export interface SearchResult extends PersonRow {
  isPublic: boolean;
  iFollow: "none" | "pending" | "accepted";
}

export async function searchProfiles(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_profiles", { p_query: q.slice(0, 40) });
  if (error) {
    console.error("search_profiles failed", error);
    return [];
  }
  return ((data ?? []) as (ProfileJoin & { user_id: string; is_public: boolean; i_follow: string })[]).map((r) => ({
    ...toPerson({ ...r, id: r.user_id }),
    isPublic: r.is_public,
    iFollow: r.i_follow === "pending" || r.i_follow === "accepted" ? r.i_follow : "none",
  }));
}

export interface Suggestion extends PersonRow {
  ao12Ms: number | null;
}

export async function getSuggestions(): Promise<Suggestion[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("suggest_profiles");
  if (error) {
    console.error("suggest_profiles failed", error);
    return [];
  }
  return ((data ?? []) as (ProfileJoin & { user_id: string; ao12_ms: number | null })[]).map((r) => ({
    ...toPerson({ ...r, id: r.user_id }),
    ao12Ms: r.ao12_ms,
  }));
}

export async function getMyBlocks(): Promise<PersonRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_my_blocks");
  if (error) {
    console.error("get_my_blocks failed", error);
    return [];
  }
  return ((data ?? []) as (ProfileJoin & { user_id: string })[]).map((r) => toPerson({ ...r, id: r.user_id }));
}
