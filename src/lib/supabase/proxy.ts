import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session on each request and keeps the
 * session cookies in sync between the browser and Server Components.
 *
 * Called from the root `proxy.ts` (the Next.js 16 successor to middleware).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: Do not run code between createServerClient and getUser().
  // getUser() revalidates the token and triggers a refresh when it has
  // expired; skipping it can cause sessions to be dropped at random.
  await supabase.auth.getUser();

  // Route protection will live here once auth pages exist (Step 4).
  // For now every route stays public — we only refresh the session.

  // IMPORTANT: return `supabaseResponse` untouched so the refreshed
  // cookies survive. If you build your own response, copy over
  // `supabaseResponse.cookies` first or the session will fall out of sync.
  return supabaseResponse;
}
