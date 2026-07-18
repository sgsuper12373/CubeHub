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
