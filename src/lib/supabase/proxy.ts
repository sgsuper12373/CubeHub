import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session on each request and keeps the
 * session cookies in sync between the browser and Server Components.
 *
 * Called from `src/proxy.ts` (the Next.js 16 successor to middleware). It must
 * sit beside `src/app`: at the repo root it was silently ignored from July to
 * October 2026, so sessions were only ever refreshed by the browser client.
 */
export async function updateSession(request: NextRequest) {
  // Server Components read the page path from `x-pathname` (the protected
  // layout uses it for `/login?next=`). Request headers only reach them when
  // passed as a *new* Headers object to NextResponse.next — setting one on
  // `request.headers` in place is silently dropped — so build a copy each
  // time, after any cookie refresh below has updated the request.
  const pathname = request.nextUrl.pathname + request.nextUrl.search;
  const forwardedHeaders = () => {
    const headers = new Headers(request.headers);
    headers.set("x-pathname", pathname);
    return headers;
  };

  let supabaseResponse = NextResponse.next({
    request: {
      headers: forwardedHeaders(),
    },
  });

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
          supabaseResponse = NextResponse.next({
            request: {
              headers: forwardedHeaders(),
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: Do not run code between createServerClient and getClaims().
  // getClaims() refreshes a session that is about to expire (writing the new
  // cookies through setAll above) and verifies the token; skipping it can
  // drop sessions at random. With asymmetric signing keys the check is local,
  // so this costs no network round trip on most requests. Pages still use
  // getUser() (lib/auth/dal.ts) where they need the authoritative user.
  await supabase.auth.getClaims();

  // This file refreshes the session and nothing else — no route protection
  // here, deliberately. Access is enforced in two other places:
  //   - routes that need an account: src/app/(app)/(protected)/layout.tsx
  //   - content that needs an account or a subscription: RLS in Postgres
  // See `docs/access-control.md`.

  // IMPORTANT: return `supabaseResponse` untouched so the refreshed
  // cookies survive. If you build your own response, copy over
  // `supabaseResponse.cookies` first or the session will fall out of sync.
  return supabaseResponse;
}
