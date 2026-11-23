import "server-only";
import { createPublicClient } from "@/lib/supabase/public";

/** Upper bound for one sitemap file (the protocol allows 50,000 URLs). */
const SITEMAP_PROFILE_LIMIT = 10_000;

/** The signup trigger's placeholder handle. */
const AUTO_HANDLE = /^user_[0-9a-f]{12}$/;

/**
 * Usernames of public profiles, for the app host's sitemap. Cookie-free, so
 * the sitemap stays cached. Auto-assigned handles (`user_<12 hex>`, from the
 * signup trigger) are skipped: those cubers haven't set up a profile yet, and
 * an empty page is nothing to index. Any failure returns an empty list.
 */
export async function getPublicProfileUsernames(): Promise<string[]> {
  try {
    const { data } = await createPublicClient()
      .from("profiles")
      .select("username")
      .eq("is_public", true)
      .order("username")
      .limit(SITEMAP_PROFILE_LIMIT);
    return (data ?? [])
      .map((p) => p.username as string)
      .filter((u) => u && !AUTO_HANDLE.test(u));
  } catch {
    return [];
  }
}
