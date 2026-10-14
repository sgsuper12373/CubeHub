"use server";

import { revalidatePath } from "next/cache";

import { getUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

/** Marks every notification read. RLS (`notif_update`) limits it to the caller's own. */
export async function markAllNotificationsRead(): Promise<void> {
  const user = await getUser();
  if (!user) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);
  if (error) console.error("markAllNotificationsRead failed", error);
  revalidatePath("/", "layout");
}
