import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { COOKIE_DOMAIN } from "@/lib/site-url";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Parent-domain cookies when the hosts are split; see client.ts.
      ...(COOKIE_DOMAIN ? { cookieOptions: { domain: COOKIE_DOMAIN } } : {}),
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll called from a Server Component; ignore if middleware
            // is refreshing the session.
          }
        },
      },
    },
  );
}
