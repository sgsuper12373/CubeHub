"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

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
