import { createBrowserClient } from "@supabase/ssr";

import { COOKIE_DOMAIN } from "@/lib/site-url";

/**
 * With the hosts split, the session cookie lives on the parent domain
 * (`.cuberhub.me`) so the landing page on the root host sees the same sign-in
 * as the app (docs/app-shell-plan.md → Auth and cookies across hosts).
 * Host-only, as before, in single-host mode and on localhost.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    COOKIE_DOMAIN ? { cookieOptions: { domain: COOKIE_DOMAIN } } : undefined,
  );
}
