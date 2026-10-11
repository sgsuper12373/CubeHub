"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { isOwnAvatarUrl, validateProfileInput, type ProfileInput } from "./validate";

export type ProfileEditState =
  | { error?: string; field?: keyof ProfileInput }
  | undefined;

/**
 * Server Action for /profile/edit: validate, save, and go back to the
 * profile. RLS (`profiles_update`) already limits the write to the caller's
 * own row; the validation here is what keeps the values sane.
 */
export async function saveProfileDetails(
  _prev: ProfileEditState,
  formData: FormData,
): Promise<ProfileEditState> {
  const result = validateProfileInput({
    displayName: String(formData.get("display_name") ?? ""),
    bio: String(formData.get("bio") ?? ""),
    country: String(formData.get("country") ?? ""),
    wcaId: String(formData.get("wca_id") ?? ""),
    isPublic: formData.get("is_public") === "on",
  });
  if (!result.ok) return { error: result.error, field: result.field };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in to edit your profile." };

  const { data, error } = await supabase
    .from("profiles")
    .update(result.update)
    .eq("id", user.id)
    .select("username")
    .single();

  if (error) {
    if (error.code === "23505" && error.message.includes("wca_id")) {
      return { error: "That WCA ID is already linked to another profile.", field: "wcaId" };
    }
    return { error: "Couldn't save your profile. Please try again." };
  }

  revalidatePath("/", "layout");
  redirect(`/profile/${encodeURIComponent(data.username)}`);
}

/**
 * Point the profile at a freshly uploaded avatar, or clear it (`null`). The
 * upload itself happens in the browser, straight to Storage, where the bucket
 * policy confines it to the user's own folder; this only accepts a URL inside
 * that folder.
 */
export async function setAvatarUrl(url: string | null): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  if (url !== null && !isOwnAvatarUrl(url, process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", user.id)) {
    return { error: "That image can't be used as your avatar." };
  }

  const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
  if (error) return { error: "Couldn't update your avatar. Please try again." };

  revalidatePath("/", "layout");
  return {};
}
