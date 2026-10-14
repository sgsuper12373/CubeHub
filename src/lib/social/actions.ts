"use server";

import { revalidatePath } from "next/cache";

import { getUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

import { searchProfiles, type SearchResult } from "./dal";
import { isReportReason, REPORT_NOTE_MAX, type FollowStatus } from "./types";

/**
 * Follow, block and report writes. Everything goes through the caller's own
 * Supabase client, so RLS and the triggers in `20261018000100_social.sql` are
 * the real boundary (block checks, rate limits, pending vs accepted). These
 * actions return a result instead of throwing, because a thrown error's
 * message is hidden in production and the rate-limit text should reach the
 * cuber.
 */

export type ActionResult<T = undefined> = { ok: true; value: T } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type DbError = { message: string; hint?: string | null; code?: string } | null;

/** The trigger's own wording for blocks and rate limits; a generic line otherwise. */
function friendly(error: DbError, fallback: string): string {
  if (error?.hint === "rate_limited" || error?.hint === "blocked") return error.message;
  return fallback;
}

async function signedIn(): Promise<string | null> {
  const user = await getUser();
  return user?.id ?? null;
}

function refresh() {
  revalidatePath("/profile/[username]", "layout");
  revalidatePath("/people");
}

/** Follows a cuber; returns the stored status (pending for a private profile). */
export async function follow(targetId: string): Promise<ActionResult<FollowStatus>> {
  const me = await signedIn();
  if (!me) return { ok: false, error: "Sign in to follow cubers." };
  if (!UUID.test(targetId) || targetId === me) return { ok: false, error: "You can't follow this cuber." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_follows")
    .insert({ follower_id: me, following_id: targetId })
    .select("status")
    .single();
  if (error) {
    // Already following or requested: report the current state, not an error.
    if (error.code === "23505") {
      const { data: row } = await supabase
        .from("user_follows")
        .select("status")
        .eq("follower_id", me)
        .eq("following_id", targetId)
        .maybeSingle();
      if (row) return { ok: true, value: row.status as FollowStatus };
    }
    console.error("follow failed", error);
    return { ok: false, error: friendly(error, "Couldn't follow. Please try again.") };
  }
  refresh();
  return { ok: true, value: data.status as FollowStatus };
}

/** Unfollows, or cancels a pending request. */
export async function unfollow(targetId: string): Promise<ActionResult> {
  const me = await signedIn();
  if (!me) return { ok: false, error: "Sign in first." };
  if (!UUID.test(targetId)) return { ok: false, error: "Invalid cuber." };

  const supabase = await createClient();
  const { error } = await supabase.from("user_follows").delete().eq("follower_id", me).eq("following_id", targetId);
  if (error) {
    console.error("unfollow failed", error);
    return { ok: false, error: "Couldn't unfollow. Please try again." };
  }
  refresh();
  return { ok: true, value: undefined };
}

export async function acceptRequest(followerId: string): Promise<ActionResult> {
  const me = await signedIn();
  if (!me) return { ok: false, error: "Sign in first." };
  if (!UUID.test(followerId)) return { ok: false, error: "Invalid request." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("user_follows")
    .update({ status: "accepted" })
    .eq("follower_id", followerId)
    .eq("following_id", me)
    .eq("status", "pending");
  if (error) {
    console.error("acceptRequest failed", error);
    return { ok: false, error: "Couldn't accept that request." };
  }
  refresh();
  return { ok: true, value: undefined };
}

/** Declines a request, or removes an existing follower: both delete their row. */
export async function removeFollower(followerId: string): Promise<ActionResult> {
  const me = await signedIn();
  if (!me) return { ok: false, error: "Sign in first." };
  if (!UUID.test(followerId)) return { ok: false, error: "Invalid cuber." };

  const supabase = await createClient();
  const { error } = await supabase.from("user_follows").delete().eq("follower_id", followerId).eq("following_id", me);
  if (error) {
    console.error("removeFollower failed", error);
    return { ok: false, error: "Couldn't remove that follower." };
  }
  refresh();
  return { ok: true, value: undefined };
}

export async function block(targetId: string): Promise<ActionResult> {
  const me = await signedIn();
  if (!me) return { ok: false, error: "Sign in first." };
  if (!UUID.test(targetId) || targetId === me) return { ok: false, error: "You can't block this cuber." };

  const supabase = await createClient();
  const { error } = await supabase.from("user_blocks").insert({ blocker_id: me, blocked_id: targetId });
  if (error && error.code !== "23505") {
    console.error("block failed", error);
    return { ok: false, error: "Couldn't block. Please try again." };
  }
  refresh();
  revalidatePath("/settings");
  return { ok: true, value: undefined };
}

export async function unblock(targetId: string): Promise<ActionResult> {
  const me = await signedIn();
  if (!me) return { ok: false, error: "Sign in first." };
  if (!UUID.test(targetId)) return { ok: false, error: "Invalid cuber." };

  const supabase = await createClient();
  const { error } = await supabase.from("user_blocks").delete().eq("blocker_id", me).eq("blocked_id", targetId);
  if (error) {
    console.error("unblock failed", error);
    return { ok: false, error: "Couldn't unblock. Please try again." };
  }
  refresh();
  revalidatePath("/settings");
  return { ok: true, value: undefined };
}

export async function reportProfile(targetId: string, reason: string, note: string): Promise<ActionResult> {
  const me = await signedIn();
  if (!me) return { ok: false, error: "Sign in to report a profile." };
  if (!UUID.test(targetId) || targetId === me) return { ok: false, error: "You can't report this profile." };
  if (!isReportReason(reason)) return { ok: false, error: "Pick a reason." };
  const trimmed = note.trim();
  if (trimmed.length > REPORT_NOTE_MAX) {
    return { ok: false, error: `Keep the note under ${REPORT_NOTE_MAX} characters.` };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profile_reports")
    .insert({ reporter_id: me, reported_id: targetId, reason, note: trimmed || null });
  if (error) {
    console.error("reportProfile failed", error);
    return { ok: false, error: friendly(error, "Couldn't send the report. Please try again.") };
  }
  return { ok: true, value: undefined };
}

/** Search for the People page's as-you-type box; same rules as search_profiles. */
export async function searchPeople(query: string): Promise<SearchResult[]> {
  if (typeof query !== "string") return [];
  return searchProfiles(query);
}
