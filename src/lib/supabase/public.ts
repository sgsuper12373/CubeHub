import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * A Supabase client with no cookies and no session: it reads only what the
 * anon role may read. For public, cacheable server output (the sitemap, OG
 * images), where `@/lib/supabase/server` would read `cookies()` and make the
 * route dynamic. Never give it the service-role key.
 */
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );
}
