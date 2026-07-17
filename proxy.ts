  import type { NextRequest } from "next/server";

  import { updateSession } from "@/lib/supabase/proxy";

  export async function proxy(request: NextRequest) {
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
