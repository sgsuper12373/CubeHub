import { buildAppRobots } from "@/lib/seo/sitemap";
import { APP_URL } from "@/lib/site-url";

/**
 * The app host's /robots.txt. `src/proxy.ts` rewrites app.cuberhub.me/robots.txt
 * here (lib/host-routing.ts); the root host keeps src/app/robots.ts.
 */
export const dynamic = "force-static";

export function GET() {
  return new Response(buildAppRobots(APP_URL), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
