import { NextResponse, type NextRequest } from "next/server";

import { HANDOFF_COOKIE } from "@/lib/handoff";
import { routeForHost } from "@/lib/host-routing";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Host routing first (docs/app-shell-plan.md → Host routing), then the
 * session refresh. Routing has to come first: updateSession() must run
 * nothing between createServerClient() and getClaims() and must return its
 * response untouched, so a redirect or rewrite returns early instead of
 * wrapping it. In single-host mode (NEXT_PUBLIC_APP_URL unset) routeForHost
 * always passes and this is the plain session refresh it always was.
 */
export async function proxy(request: NextRequest) {
  const decision = routeForHost(
    request.headers.get("host") ?? "",
    request.nextUrl.pathname,
    request.nextUrl.search,
    undefined,
    { method: request.method, handoffDone: request.cookies.has(HANDOFF_COOKIE) },
  );
  if (decision.kind === "redirect") return NextResponse.redirect(decision.to, decision.status);
  if (decision.kind === "rewrite") return NextResponse.rewrite(new URL(decision.to, request.url));
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
    * Run on every request path except:
    * - _next/static (static files)
    * - _next/image (image optimization)
    * - favicon.ico and common image assets
    * Session refresh is skipped for these to avoid needless work.
    */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
