"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

import { isReportReason, REPORT_NOTE_MAX } from "@/lib/social/types";

import { COMMENT_MAX, isReactionId, validatePostInput, type PostField, type PostInput } from "./posts";
import {
  clubErrorMessage,
  REQUEST_MESSAGE_MAX,
  validateClubInput,
  type ClubField,
} from "./types";

/**
 * Club writes. Every membership change is an RPC in
 * `20261020000100_clubs.sql`, called with the cuber's own client, so the
 * database is the real boundary (roles, bans, limits). Actions return a
 * result instead of throwing: a thrown error's message is hidden in
 * production, and the RPCs' messages are written for the cuber.
 *
 * Every successful write calls `revalidatePath`, so the action's own response
 * carries the fresh page. Callers must not also `router.refresh()`: with two
 * writes in quick succession, the first refresh can land after the second
 * write and show stale data (seen with two quick comments).
 */

export type ActionResult<T = undefined> = { ok: true; value: T } | { ok: false; error: string };
export type ClubFormState = { error?: string; field?: ClubField } | undefined;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function refresh(slug?: string) {
  revalidatePath("/clubs");
  if (slug) revalidatePath(`/clubs/${slug}`, "layout");
}

function readClubForm(formData: FormData) {
  return validateClubInput({
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    description: String(formData.get("description") ?? ""),
    type: String(formData.get("type") ?? ""),
    tags: formData.getAll("tags").map(String),
    isPublic: formData.get("visibility") !== "private",
  });
}

/** The name/slug hints point at a field; anything else is a form-level error. */
function fieldFor(hint: string | null | undefined): ClubField | undefined {
  if (hint === "name_taken") return "name";
  if (hint === "slug_taken") return "slug";
  return undefined;
}

export async function createClub(_prev: ClubFormState, formData: FormData): Promise<ClubFormState> {
  if (!(await getUser())) return { error: "Sign in to create a club." };
  const input = readClubForm(formData);
  if (!input.ok) return { error: input.error, field: input.field };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_club", {
    p_name: input.value.name,
    p_slug: input.value.slug,
    p_description: input.value.description,
    p_type: input.value.type,
    p_tags: input.value.tags,
    p_is_public: input.value.isPublic,
  });
  if (error) {
    console.error("create_club failed", error);
    return { error: clubErrorMessage(error, "Couldn't create the club. Please try again."), field: fieldFor(error.hint) };
  }
  refresh();
  redirect(`/clubs/${data as string}`);
}

/** Owner only (RLS). Changing the address redirects to the new one. */
export async function updateClubSettings(_prev: ClubFormState, formData: FormData): Promise<ClubFormState> {
  const clubId = String(formData.get("club_id") ?? "");
  const oldSlug = String(formData.get("old_slug") ?? "");
  if (!UUID.test(clubId)) return { error: "Club not found." };
  const input = readClubForm(formData);
  if (!input.ok) return { error: input.error, field: input.field };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clubs")
    .update({
      name: input.value.name,
      slug: input.value.slug,
      description: input.value.description || null,
      type: input.value.type,
      tags: input.value.tags,
      is_public: input.value.isPublic,
    })
    .eq("id", clubId)
    .select("slug");
  if (error) {
    console.error("club update failed", error);
    if (error.code === "23505") {
      const nameTaken = error.message.includes("name");
      return nameTaken
        ? { error: "A club with that name already exists.", field: "name" }
        : { error: "That address is taken.", field: "slug" };
    }
    return { error: "Couldn't save. Please try again." };
  }
  if (!data?.length) return { error: "Only the owner can change the settings." };

  refresh(oldSlug);
  const slug = data[0].slug as string;
  refresh(slug);
  redirect(`/clubs/${slug}/manage?saved=1`);
}

/** Owner (or platform admin). The name must be typed to confirm. */
export async function deleteClub(clubId: string, typedName: string): Promise<ActionResult> {
  if (!UUID.test(clubId)) return { ok: false, error: "Club not found." };
  const supabase = await createClient();
  const { data: club } = await supabase.from("clubs").select("name").eq("id", clubId).maybeSingle();
  if (!club) return { ok: false, error: "Club not found." };
  if (typedName.trim() !== club.name) return { ok: false, error: "Type the club's name exactly to delete it." };

  const { data, error } = await supabase.from("clubs").delete().eq("id", clubId).select("id");
  if (error) {
    console.error("club delete failed", error);
    return { ok: false, error: "Couldn't delete the club. Please try again." };
  }
  // RLS filters the row out for anyone but the owner: nothing deleted.
  if (!data?.length) return { ok: false, error: "Only the owner can delete the club." };
  refresh();
  return { ok: true, value: undefined };
}

async function rpc(name: string, args: Record<string, unknown>, fallback: string, slug?: string): Promise<ActionResult> {
  if (!(await getUser())) return { ok: false, error: "Sign in first." };
  const supabase = await createClient();
  const { error } = await supabase.rpc(name, args);
  if (error) {
    console.error(`${name} failed`, error);
    return { ok: false, error: clubErrorMessage(error, fallback) };
  }
  refresh(slug);
  return { ok: true, value: undefined };
}

export async function joinClub(clubId: string, slug: string): Promise<ActionResult> {
  if (!UUID.test(clubId)) return { ok: false, error: "Club not found." };
  return rpc("join_club", { p_club: clubId }, "Couldn't join. Please try again.", slug);
}

export async function requestToJoin(clubId: string, slug: string, message: string): Promise<ActionResult> {
  if (!UUID.test(clubId)) return { ok: false, error: "Club not found." };
  if (message.length > REQUEST_MESSAGE_MAX) {
    return { ok: false, error: `Keep the message under ${REQUEST_MESSAGE_MAX} characters.` };
  }
  return rpc("request_to_join", { p_club: clubId, p_message: message.trim() || null }, "Couldn't send the request.", slug);
}

/** The requester's own row (RLS `club_req_cancel`). */
export async function cancelJoinRequest(clubId: string, slug: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Sign in first." };
  if (!UUID.test(clubId)) return { ok: false, error: "Club not found." };
  const supabase = await createClient();
  const { error } = await supabase.from("club_join_requests").delete().eq("club_id", clubId).eq("user_id", user.id);
  if (error) {
    console.error("cancel join request failed", error);
    return { ok: false, error: "Couldn't cancel the request." };
  }
  refresh(slug);
  return { ok: true, value: undefined };
}

export async function leaveClub(clubId: string, slug: string): Promise<ActionResult> {
  if (!UUID.test(clubId)) return { ok: false, error: "Club not found." };
  return rpc("leave_club", { p_club: clubId }, "Couldn't leave the club.", slug);
}

export async function respondToJoinRequest(requestId: string, approve: boolean, slug: string): Promise<ActionResult> {
  if (!UUID.test(requestId)) return { ok: false, error: "That request is gone." };
  return rpc(
    "respond_to_join_request",
    { p_request: requestId, p_approve: approve },
    approve ? "Couldn't approve." : "Couldn't decline.",
    slug,
  );
}

export async function removeClubMember(clubId: string, userId: string, ban: boolean, slug: string): Promise<ActionResult> {
  if (!UUID.test(clubId) || !UUID.test(userId)) return { ok: false, error: "Member not found." };
  return rpc(
    "remove_club_member",
    { p_club: clubId, p_user: userId, p_ban: ban },
    ban ? "Couldn't ban." : "Couldn't remove.",
    slug,
  );
}

export async function unbanClubMember(clubId: string, userId: string, slug: string): Promise<ActionResult> {
  if (!UUID.test(clubId) || !UUID.test(userId)) return { ok: false, error: "Not found." };
  return rpc("unban_club_member", { p_club: clubId, p_user: userId }, "Couldn't unban.", slug);
}

export async function setClubMemberRole(
  clubId: string,
  userId: string,
  role: "admin" | "member",
  slug: string,
): Promise<ActionResult> {
  if (!UUID.test(clubId) || !UUID.test(userId)) return { ok: false, error: "Member not found." };
  if (role !== "admin" && role !== "member") return { ok: false, error: "Unknown role." };
  return rpc("set_club_member_role", { p_club: clubId, p_user: userId, p_role: role }, "Couldn't change the role.", slug);
}

export async function transferClubOwnership(clubId: string, userId: string, slug: string): Promise<ActionResult> {
  if (!UUID.test(clubId) || !UUID.test(userId)) return { ok: false, error: "Member not found." };
  return rpc("transfer_club_ownership", { p_club: clubId, p_user: userId }, "Couldn't transfer the club.", slug);
}

// ── Posts ─────────────────────────────────────────────────────────────────

export type PostResult = { ok: true } | { ok: false; error: string; field?: PostField };

/** Members post (RLS); 10 a day across clubs (trigger, `rate_limited`). */
export async function createPost(clubId: string, slug: string, input: PostInput): Promise<PostResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Sign in to post." };
  if (!UUID.test(clubId)) return { ok: false, error: "Club not found." };
  const v = validatePostInput(input);
  if (!v.ok) return v;

  const supabase = await createClient();
  const { error } = await supabase.from("club_posts").insert({ club_id: clubId, author_id: user.id, ...v.value });
  if (error) {
    console.error("create post failed", error);
    if (error.code === "42501") return { ok: false, error: "Only members can post here." };
    return { ok: false, error: clubErrorMessage(error, "Couldn't post. Please try again.") };
  }
  refresh(slug);
  return { ok: true };
}

/** The author, within 15 minutes (RLS). The kind can't change. */
export async function editPost(postId: string, slug: string, input: PostInput): Promise<PostResult> {
  if (!(await getUser())) return { ok: false, error: "Sign in first." };
  if (!UUID.test(postId)) return { ok: false, error: "Post not found." };
  const v = validatePostInput(input);
  if (!v.ok) return v;

  const supabase = await createClient();
  const { body, alg, puzzle, setup, video_url } = v.value;
  const { data, error } = await supabase
    .from("club_posts")
    .update({ body, alg, puzzle, setup, video_url })
    .eq("id", postId)
    .eq("kind", v.value.kind)
    .select("id");
  if (error) {
    console.error("edit post failed", error);
    return { ok: false, error: "Couldn't save the edit." };
  }
  if (!data?.length) return { ok: false, error: "Posts can be edited for 15 minutes after posting." };
  refresh(slug);
  return { ok: true };
}

/** The author, the club's owner/admins, or the platform admin (RLS). */
export async function deletePost(postId: string, slug: string): Promise<ActionResult> {
  if (!(await getUser())) return { ok: false, error: "Sign in first." };
  if (!UUID.test(postId)) return { ok: false, error: "Post not found." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("club_posts").delete().eq("id", postId).select("id");
  if (error) {
    console.error("delete post failed", error);
    return { ok: false, error: "Couldn't delete the post." };
  }
  if (!data?.length) return { ok: false, error: "You can't delete this post." };
  refresh(slug);
  return { ok: true, value: undefined };
}

/** Owner/admins; at most 3 pinned per club (RPC, `pin_limit`). */
export async function setPostPinned(postId: string, pinned: boolean, slug: string): Promise<ActionResult> {
  if (!UUID.test(postId)) return { ok: false, error: "Post not found." };
  return rpc(
    "set_club_post_pinned",
    { p_post: postId, p_pinned: pinned },
    pinned ? "Couldn't pin the post." : "Couldn't unpin the post.",
    slug,
  );
}

// ── Reactions, comments, reports ──────────────────────────────────────────

/** Members react (RLS); one of each kind per cuber per post (primary key). */
export async function setReaction(postId: string, reaction: string, on: boolean, slug: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Sign in to react." };
  if (!UUID.test(postId) || !isReactionId(reaction)) return { ok: false, error: "Post not found." };
  const supabase = await createClient();
  const { error } = on
    ? await supabase.from("club_post_reactions").insert({ post_id: postId, user_id: user.id, reaction })
    : await supabase.from("club_post_reactions").delete().eq("post_id", postId).eq("user_id", user.id).eq("reaction", reaction);
  // Already reacted (a double tap): the state the cuber wants is already there.
  if (error && error.code !== "23505") {
    console.error("reaction failed", error);
    return { ok: false, error: error.code === "42501" ? "Join the club to react." : "Couldn't react. Please try again." };
  }
  refresh(slug);
  return { ok: true, value: undefined };
}

/** Members comment (RLS); 60 an hour (trigger, `rate_limited`). */
export async function addComment(postId: string, body: string, slug: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Sign in to comment." };
  if (!UUID.test(postId)) return { ok: false, error: "Post not found." };
  const text = body.trim();
  if (!text) return { ok: false, error: "Write a comment first." };
  if (text.length > COMMENT_MAX) return { ok: false, error: `Keep it under ${COMMENT_MAX} characters.` };

  const supabase = await createClient();
  const { error } = await supabase.from("club_post_comments").insert({ post_id: postId, author_id: user.id, body: text });
  if (error) {
    console.error("comment failed", error);
    if (error.code === "42501") return { ok: false, error: "Join the club to comment." };
    return { ok: false, error: clubErrorMessage(error, "Couldn't comment. Please try again.") };
  }
  refresh(slug);
  return { ok: true, value: undefined };
}

/** The comment's author, the club's owner/admins, or the platform admin (RLS). */
export async function deleteComment(commentId: string, slug: string): Promise<ActionResult> {
  if (!(await getUser())) return { ok: false, error: "Sign in first." };
  if (!UUID.test(commentId)) return { ok: false, error: "Comment not found." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("club_post_comments").delete().eq("id", commentId).select("id");
  if (error) {
    console.error("delete comment failed", error);
    return { ok: false, error: "Couldn't delete the comment." };
  }
  if (!data?.length) return { ok: false, error: "You can't delete this comment." };
  refresh(slug);
  return { ok: true, value: undefined };
}

/**
 * A club, a post or a comment, to the platform admin. The trigger fills in
 * the club and shares the 10-a-day limit with profile reports.
 */
export async function reportClubContent(
  target: { clubId: string } | { postId: string } | { commentId: string },
  reason: string,
  note: string,
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Sign in to report." };
  const id = "clubId" in target ? target.clubId : "postId" in target ? target.postId : target.commentId;
  if (!UUID.test(id)) return { ok: false, error: "Nothing to report." };
  if (!isReportReason(reason)) return { ok: false, error: "Pick a reason." };
  const text = note.trim();
  if (text.length > REPORT_NOTE_MAX) return { ok: false, error: `Keep the note under ${REPORT_NOTE_MAX} characters.` };

  const supabase = await createClient();
  const { error } = await supabase.from("club_reports").insert({
    reporter_id: user.id,
    club_id: "clubId" in target ? target.clubId : null,
    post_id: "postId" in target ? target.postId : null,
    comment_id: "commentId" in target ? target.commentId : null,
    reason,
    note: text || null,
  });
  if (error) {
    console.error("club report failed", error);
    return { ok: false, error: clubErrorMessage(error, "Couldn't send the report. Please try again.") };
  }
  return { ok: true, value: undefined };
}
