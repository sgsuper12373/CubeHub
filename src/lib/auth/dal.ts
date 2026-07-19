import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

/**
 * The authenticated user, or null. Memoized per render pass so multiple
 * Server Components can call it without repeat network trips.
 *
 * Uses `getUser()` (not `getSession()`) because it revalidates the token
 * with Supabase rather than trusting the cookie.
 */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export type CurrentProfile = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

/**
 * The current user's public profile row (username, display name, avatar),
 * or null when logged out. Created automatically on signup by the
 * `handle_new_user` trigger.
 */
export const getProfile = cache(async (): Promise<CurrentProfile | null> => {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url")
    .eq("id", user.id)
    .single();

  return data;
});

/**
 * Timer settings from user_settings, mapped to the client-side TimerSettings
 * shape. Returns null when logged out. Used by /timer's server shell to
 * pass initialSettings to <TimerScreen/> — avoids a client roundtrip.
 *
 * DB mapping (docs/database.md):
 * - inspection_type 'none' → off, 'wca_15s' → 15s, 'custom' → use custom_inspection_secs
 * - timer_trigger is passed through (DB: 'spacebar'|'stackmat'|'touch')
 */
export const getTimerSettings = cache(async () => {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("user_settings")
    .select(
      "inspection_type, custom_inspection_secs, hide_time_while_solving, show_scramble_preview, timer_trigger",
    )
    .eq("user_id", user.id)
    .single();

  if (!data) return null;

  // Map DB inspection_type to InspectionMode
  let inspectionMode: "off" | "8s" | "15s" = "15s";
  if (data.inspection_type === "none") {
    inspectionMode = "off";
  } else if (data.inspection_type === "custom") {
    inspectionMode = data.custom_inspection_secs === 8 ? "8s" : "15s";
  }
  // wca_15s → "15s" (default)

  return {
    inspectionMode,
    hideTimeWhileSolving: data.hide_time_while_solving,
    showScramblePreview: data.show_scramble_preview,
    trigger: data.timer_trigger === "touch" ? "touch" as const : "spacebar" as const,
  };
});
