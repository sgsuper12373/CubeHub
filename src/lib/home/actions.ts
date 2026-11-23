"use server";

import { revalidatePath } from "next/cache";

import { getUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

import { isLayoutEmpty, parseHomeLayout } from "./cards";

/**
 * Saves a signed-in cuber's Home layout to `user_settings.home_layout`
 * (migration 20261124000000_home_layout.sql). An empty layout is stored as
 * null, meaning "the default". Unknown card ids are dropped before saving.
 */
export async function saveHomeLayout(raw: unknown): Promise<{ error?: string }> {
  const user = await getUser();
  if (!user) return { error: "Sign in to save your Home layout." };

  const layout = raw === null ? null : parseHomeLayout(raw);
  if (raw !== null && !layout) return { error: "That layout isn't valid." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("user_settings")
    .update({ home_layout: isLayoutEmpty(layout) ? null : layout })
    .eq("user_id", user.id);
  if (error) {
    console.error("saveHomeLayout failed:", error);
    return { error: "Couldn't save your layout. Try again in a moment." };
  }
  revalidatePath("/home");
  return {};
}
