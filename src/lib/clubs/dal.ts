import "server-only";
import { cache } from "react";

import { getUser } from "@/lib/auth/dal";
import type { PersonRow } from "@/lib/social/types";
import { createClient } from "@/lib/supabase/server";

import {
  isClubTag,
  isClubType,
  ROLE_ORDER,
  type ClubRole,
  type ClubSummary,
  type Membership,
} from "./types";

/**
 * Reads for clubs. RLS and the RPCs in `20261020000100_clubs.sql` decide what
 * each viewer may see (a private club's members only to members, requests and
 * bans only to owner/admins); these only shape rows.
 */

const CLUB_COLUMNS = "id, slug, name, description, type, tags, is_public, member_count";

type ClubRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  type: string;
  tags: string[] | null;
  is_public: boolean;
  member_count: number;
};

type ProfileJoin = { id: string; username: string; display_name: string | null; avatar_url: string | null };

function toClub(r: ClubRow): ClubSummary {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    description: r.description,
    type: isClubType(r.type) ? r.type : "online",
    tags: (r.tags ?? []).filter(isClubTag),
    isPublic: r.is_public,
    memberCount: r.member_count,
  };
}

function toPerson(p: ProfileJoin): PersonRow {
  return { id: p.id, username: p.username, displayName: p.display_name, avatarUrl: p.avatar_url };
}

/**
 * Profiles are hidden between blocked cubers, so the join comes back null.
 * Manage lists still need the row (to approve, remove or unban), so it gets a
 * stand-in; public lists drop it.
 */
function personOrHidden(userId: string, p: ProfileJoin | null): { person: PersonRow; hidden: boolean } {
  if (p) return { person: toPerson(p), hidden: false };
  return {
    person: { id: userId, username: "", displayName: "A cuber you've blocked", avatarUrl: null },
    hidden: true,
  };
}

export const getClubBySlug = cache(async (slug: string): Promise<ClubSummary | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("clubs").select(CLUB_COLUMNS).eq("slug", slug.toLowerCase()).maybeSingle();
  if (error) console.error("club query failed", error);
  return data ? toClub(data as ClubRow) : null;
});

/** The signed-in cuber's relationship to a club. */
export const getMembership = cache(async (clubId: string): Promise<Membership> => {
  const user = await getUser();
  if (!user) return { kind: "signed-out" };
  const supabase = await createClient();
  const [member, request] = await Promise.all([
    supabase.from("club_members").select("role").eq("club_id", clubId).eq("user_id", user.id).maybeSingle(),
    supabase.from("club_join_requests").select("id").eq("club_id", clubId).eq("user_id", user.id).maybeSingle(),
  ]);
  if (member.data) return { kind: "member", role: member.data.role as ClubRole };
  if (request.data) return { kind: "requested" };
  // A ban isn't visible to the banned cuber (owner/admins only); the join RPC
  // refuses and says so instead.
  return { kind: "none" };
});

const LIST_LIMIT = 60;

/** Search and browse: name contains `q`, optional type and tag; biggest first. */
export async function searchClubs(filters: { q?: string; type?: string; tag?: string }): Promise<ClubSummary[]> {
  const supabase = await createClient();
  let query = supabase.from("clubs").select(CLUB_COLUMNS);
  const q = filters.q?.trim();
  if (q) {
    const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    query = query.ilike("name", pattern);
  }
  if (filters.type && isClubType(filters.type)) query = query.eq("type", filters.type);
  if (filters.tag && isClubTag(filters.tag)) query = query.contains("tags", [filters.tag]);
  const { data, error } = await query
    .order("member_count", { ascending: false })
    .order("name")
    .limit(LIST_LIMIT);
  if (error) console.error("club search failed", error);
  return (data ?? []).map((r) => toClub(r as ClubRow));
}

export interface MyClub extends ClubSummary {
  role: ClubRole;
}

/** Clubs the signed-in cuber is in, owned first. */
export const getMyClubs = cache(async (): Promise<MyClub[]> => {
  const user = await getUser();
  if (!user) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("club_members")
    .select(`role, club:clubs(${CLUB_COLUMNS})`)
    .eq("user_id", user.id);
  if (error) console.error("my clubs query failed", error);
  return (data ?? [])
    .flatMap((r) => (r.club ? [{ ...toClub(r.club as unknown as ClubRow), role: r.role as ClubRole }] : []))
    .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || a.name.localeCompare(b.name));
});

export interface ClubMember {
  person: PersonRow;
  /** Blocked between you and them: no profile to show (see personOrHidden). */
  hidden: boolean;
  isPublic: boolean;
  role: ClubRole;
  joinedAt: string;
}

/** Owner, admins, then members. Empty for a private club you're not in. */
export const getClubMembers = cache(async (clubId: string): Promise<ClubMember[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("club_members")
    .select("user_id, role, joined_at, person:profiles!club_members_user_id_fkey(id, username, display_name, avatar_url, is_public)")
    .eq("club_id", clubId)
    .limit(1000);
  if (error) console.error("club members query failed", error);
  return (data ?? [])
    .map((r) => {
      const profile = r.person as unknown as (ProfileJoin & { is_public: boolean }) | null;
      return {
        ...personOrHidden(r.user_id as string, profile),
        isPublic: profile?.is_public ?? false,
        role: r.role as ClubRole,
        joinedAt: r.joined_at as string,
      };
    })
    .sort(
      (a, b) =>
        ROLE_ORDER[a.role] - ROLE_ORDER[b.role] ||
        (a.person.displayName || a.person.username).localeCompare(b.person.displayName || b.person.username),
    );
});

export interface ActivityRow {
  person: PersonRow;
  role: ClubRole;
  solves: number;
}

/** Solves per member this week (Mon–Sun, IST), most first. */
export const getClubActivity = cache(async (clubId: string): Promise<ActivityRow[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_club_activity", { p_club: clubId });
  if (error) console.error("get_club_activity failed", error);
  return ((data ?? []) as {
    user_id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    role: string;
    solves_this_week: number;
  }[]).map((r) => ({
    person: { id: r.user_id, username: r.username, displayName: r.display_name, avatarUrl: r.avatar_url },
    role: r.role as ClubRole,
    solves: r.solves_this_week,
  }));
});

export interface JoinRequest {
  id: string;
  person: PersonRow;
  hidden: boolean;
  message: string | null;
  createdAt: string;
}

/** Pending requests, oldest first. Owner/admins only (RLS). */
export async function getJoinRequests(clubId: string): Promise<JoinRequest[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("club_join_requests")
    .select("id, user_id, message, created_at, person:profiles!club_join_requests_user_id_fkey(id, username, display_name, avatar_url)")
    .eq("club_id", clubId)
    .order("created_at");
  if (error) console.error("club requests query failed", error);
  return (data ?? []).map((r) => ({
    id: r.id as string,
    ...personOrHidden(r.user_id as string, r.person as unknown as ProfileJoin | null),
    message: r.message as string | null,
    createdAt: r.created_at as string,
  }));
}

export interface ClubBan {
  person: PersonRow;
  hidden: boolean;
  bannedAt: string;
}

/** Banned cubers, newest first. Owner/admins only (RLS). */
export async function getClubBans(clubId: string): Promise<ClubBan[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("club_bans")
    .select("user_id, created_at, person:profiles!club_bans_user_id_fkey(id, username, display_name, avatar_url)")
    .eq("club_id", clubId)
    .order("created_at", { ascending: false });
  if (error) console.error("club bans query failed", error);
  return (data ?? []).map((r) => ({
    ...personOrHidden(r.user_id as string, r.person as unknown as ProfileJoin | null),
    bannedAt: r.created_at as string,
  }));
}

/** The full row the manage page edits. */
export async function getClubSettings(clubId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clubs")
    .select("name, slug, description, type, tags, is_public")
    .eq("id", clubId)
    .single();
  return data as { name: string; slug: string; description: string | null; type: string; tags: string[]; is_public: boolean } | null;
}

/** How many clubs the signed-in cuber owns, and whether their username is chosen. */
export async function getCreateEligibility(): Promise<{ owned: number; hasUsername: boolean } | null> {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const [owned, profile] = await Promise.all([
    supabase.from("club_members").select("club_id", { count: "exact", head: true }).eq("user_id", user.id).eq("role", "owner"),
    supabase.from("profiles").select("username").eq("id", user.id).single(),
  ]);
  return {
    owned: owned.count ?? 0,
    hasUsername: !/^user_[0-9a-f]{12}$/i.test(profile.data?.username ?? ""),
  };
}

/** For each cuber: do I follow them (and how), and do they follow me. */
export async function getFollowRelations(
  ids: string[],
): Promise<Map<string, { iFollow: "none" | "pending" | "accepted"; followsMe: boolean }>> {
  const result = new Map<string, { iFollow: "none" | "pending" | "accepted"; followsMe: boolean }>();
  const user = await getUser();
  if (!user || ids.length === 0) return result;
  const supabase = await createClient();
  const [mine, theirs] = await Promise.all([
    supabase.from("user_follows").select("following_id, status").eq("follower_id", user.id).in("following_id", ids),
    supabase
      .from("user_follows")
      .select("follower_id")
      .eq("following_id", user.id)
      .eq("status", "accepted")
      .in("follower_id", ids),
  ]);
  for (const id of ids) result.set(id, { iFollow: "none", followsMe: false });
  for (const r of mine.data ?? []) {
    result.get(r.following_id as string)!.iFollow = r.status as "pending" | "accepted";
  }
  for (const r of theirs.data ?? []) {
    result.get(r.follower_id as string)!.followsMe = true;
  }
  return result;
}

export interface ClubPost {
  id: string;
  kind: "text" | "alg" | "video";
  body: string | null;
  alg: string | null;
  puzzle: "333" | "222" | null;
  setup: string | null;
  videoUrl: string | null;
  pinnedAt: string | null;
  editedAt: string | null;
  createdAt: string;
  author: PersonRow;
}

const POST_COLUMNS =
  "id, kind, body, alg, puzzle, setup, video_url, pinned_at, edited_at, created_at, author_id, author:profiles!club_posts_author_id_fkey(id, username, display_name, avatar_url)";

export const POSTS_PAGE = 20;

function toPost(r: Record<string, unknown>): ClubPost {
  return {
    id: r.id as string,
    kind: r.kind as ClubPost["kind"],
    body: r.body as string | null,
    alg: r.alg as string | null,
    puzzle: r.puzzle as ClubPost["puzzle"],
    setup: r.setup as string | null,
    videoUrl: r.video_url as string | null,
    pinnedAt: r.pinned_at as string | null,
    editedAt: r.edited_at as string | null,
    createdAt: r.created_at as string,
    // RLS already hides posts by cubers you've blocked (or who blocked you),
    // so a missing profile here is unexpected; keep the post readable anyway.
    author: personOrHidden(r.author_id as string, r.author as ProfileJoin | null).person,
  };
}

/**
 * The feed: pinned posts (newest pin first), then a page of the rest, newest
 * first. `before` pages back from a created_at. Empty for a private club
 * you're not in (RLS).
 */
export async function getClubPosts(
  clubId: string,
  before?: string,
): Promise<{ pinned: ClubPost[]; posts: ClubPost[]; hasMore: boolean }> {
  const supabase = await createClient();
  let recent = supabase
    .from("club_posts")
    .select(POST_COLUMNS)
    .eq("club_id", clubId)
    .is("pinned_at", null)
    .order("created_at", { ascending: false })
    .limit(POSTS_PAGE + 1);
  if (before && !Number.isNaN(Date.parse(before))) recent = recent.lt("created_at", before);

  const [pinned, page] = await Promise.all([
    before
      ? Promise.resolve({ data: [], error: null })
      : supabase
          .from("club_posts")
          .select(POST_COLUMNS)
          .eq("club_id", clubId)
          .not("pinned_at", "is", null)
          .order("pinned_at", { ascending: false }),
    recent,
  ]);
  if (pinned.error) console.error("pinned posts query failed", pinned.error);
  if (page.error) console.error("posts query failed", page.error);

  const rows = (page.data ?? []) as Record<string, unknown>[];
  return {
    pinned: ((pinned.data ?? []) as Record<string, unknown>[]).map(toPost),
    posts: rows.slice(0, POSTS_PAGE).map(toPost),
    hasMore: rows.length > POSTS_PAGE,
  };
}
