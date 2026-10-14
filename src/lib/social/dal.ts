import "server-only";
import { cache } from "react";

import { getUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

import { formatMs } from "@/lib/timer/format";

import {
  toFollowSummary,
  type FeedItem,
  type FeedKind,
  type FollowStatus,
  type FollowSummary,
  type PersonRow,
  type PersonWithStat,
} from "./types";

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

/**
 * The People feed: PBs, practice days, badges and learned cases, newest
 * first. "following" is the people you follow; "everyone" is every profile
 * you can see, for when that's still quiet.
 */
export async function getActivityFeed(scope: "following" | "everyone", days = 30): Promise<FeedItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_activity_feed", { p_scope: scope, p_days: days });
  if (error) {
    console.error("get_activity_feed failed", error);
    return [];
  }
  return (
    (data ?? []) as (ProfileJoin & {
      kind: FeedKind;
      user_id: string;
      puzzle_type: string | null;
      category: string | null;
      time_ms: number | null;
      n: number | null;
      label: string | null;
      at: string;
    })[]
  ).map((r) => ({
    kind: r.kind,
    person: toPerson({ ...r, id: r.user_id }),
    puzzleType: r.puzzle_type,
    category: r.category,
    timeMs: r.time_ms,
    n: r.n,
    label: r.label,
    at: r.at,
  }));
}

/**
 * Follow state and a headline time for each row of a list, so the row can
 * carry a Follow button and something worth comparing. Two small queries for
 * the whole list; PBs come through RLS, so a private profile shows none.
 */
export async function withFollowAndStat(people: PersonRow[]): Promise<PersonWithStat[]> {
  if (people.length === 0) return [];
  const user = await getUser();
  const supabase = await createClient();
  const ids = people.map((p) => p.id);

  const [profiles, pbs, mine, theirs] = await Promise.all([
    supabase.from("profiles").select("id, is_public").in("id", ids),
    supabase
      .from("personal_bests")
      .select("user_id, category, time_ms")
      .in("user_id", ids)
      .eq("puzzle_type", "333")
      .in("category", ["ao12", "ao5", "single"]),
    user
      ? supabase.from("user_follows").select("following_id, status").eq("follower_id", user.id).in("following_id", ids)
      : Promise.resolve({ data: [] as { following_id: string; status: string }[] }),
    user
      ? supabase
          .from("user_follows")
          .select("follower_id")
          .eq("following_id", user.id)
          .eq("status", "accepted")
          .in("follower_id", ids)
      : Promise.resolve({ data: [] as { follower_id: string }[] }),
  ]);

  const isPublic = new Map((profiles.data ?? []).map((p) => [p.id as string, p.is_public as boolean]));
  const iFollow = new Map((mine.data ?? []).map((f) => [f.following_id as string, f.status as FollowStatus]));
  const followsMe = new Set((theirs.data ?? []).map((f) => f.follower_id as string));
  const best = new Map<string, Record<string, number>>();
  for (const pb of pbs.data ?? []) {
    const row = best.get(pb.user_id) ?? {};
    row[pb.category as string] = pb.time_ms as number;
    best.set(pb.user_id as string, row);
  }

  return people.map((p) => {
    const b = best.get(p.id);
    const headline = b?.ao12
      ? `3x3 Ao12 ${formatMs(b.ao12)}`
      : b?.ao5
        ? `3x3 Ao5 ${formatMs(b.ao5)}`
        : b?.single
          ? `3x3 single ${formatMs(b.single)}`
          : null;
    return {
      ...p,
      isPublic: isPublic.get(p.id) ?? true,
      iFollow: iFollow.get(p.id) ?? "none",
      followsMe: followsMe.has(p.id),
      headline,
    };
  });
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
  followsMe: boolean;
}

export async function getSuggestions(): Promise<Suggestion[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("suggest_profiles");
  if (error) {
    console.error("suggest_profiles failed", error);
    return [];
  }
  return ((data ?? []) as (ProfileJoin & { user_id: string; ao12_ms: number | null; follows_me: boolean })[]).map(
    (r) => ({
      ...toPerson({ ...r, id: r.user_id }),
      ao12Ms: r.ao12_ms,
      followsMe: r.follows_me === true,
    }),
  );
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
