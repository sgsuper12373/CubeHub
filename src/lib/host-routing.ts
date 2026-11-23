import { HANDOFF_UNTIL } from "@/lib/handoff";
import { APP_URL, SITE_URL } from "@/lib/site-url";

/**
 * Which host a path belongs to, when the marketing site (cuberhub.me) and the
 * app (app.cuberhub.me) are served by this one deployment
 * (docs/app-shell-plan.md → Host routing).
 *
 * Pure: no Next imports, so it's unit-tested directly. `src/proxy.ts` calls it
 * before the session refresh and acts on the decision.
 */

export type HostDecision =
  | { kind: "pass" }
  | { kind: "redirect"; to: string; status: 307 | 308 }
  | { kind: "rewrite"; to: string };

export interface HostConfig {
  /** Marketing origin, no trailing slash. */
  siteUrl: string;
  /** App origin, no trailing slash. Same as siteUrl in single-host mode. */
  appUrl: string;
}

const DEFAULT_CONFIG: HostConfig = { siteUrl: SITE_URL, appUrl: APP_URL };

/** Per-request facts the guest data handoff rule needs (lib/handoff.ts). */
export interface RequestState {
  /** The request method; only page loads (GET, HEAD) are handed off. */
  method?: string;
  /** Whether the `cubehub-handoff-done` cookie is present. */
  handoffDone?: boolean;
  /** Now, for the HANDOFF_UNTIL cut-off. */
  now?: Date;
}

/**
 * Paths served by the marketing host: exact paths, or prefixes when they end
 * in "/**". Anything not listed belongs to the app host, so a new app route
 * needs no routing change. Keep in step with the marketing pages that exist.
 */
export const ROOT_PATHS: readonly string[] = [
  "/",
  "/features/**",
  "/roadmap",
  "/about",
  "/privacy",
  "/terms",
  // The guest data handoff sender (src/app/handoff). Its receiver,
  // /handoff/receive, is an app path.
  "/handoff",
];

/** Metadata image routes Next generates, at any depth (e.g. a case's opengraph-image). */
const METADATA_IMAGE = /^(icon|apple-icon|opengraph-image|twitter-image)(-[\w-]+)?$/;

/** Never redirected: Next internals, API routes, files, metadata images. */
function isShared(pathname: string): boolean {
  if (pathname.startsWith("/_next/") || pathname === "/api" || pathname.startsWith("/api/")) return true;
  const last = pathname.slice(pathname.lastIndexOf("/") + 1);
  // A dot in the last segment is a file: /cubing/…js, /brand/…png,
  // /app-robots.txt, /.well-known/…, favicon.ico.
  if (last.includes(".")) return true;
  return METADATA_IMAGE.test(last);
}

export function isRootPath(pathname: string): boolean {
  return ROOT_PATHS.some((p) =>
    p.endsWith("/**")
      ? pathname === p.slice(0, -3) || pathname.startsWith(p.slice(0, -2))
      : pathname === p,
  );
}

function hostOf(origin: string): string {
  try {
    return new URL(origin).host.toLowerCase();
  } catch {
    return "";
  }
}

export function routeForHost(
  host: string,
  pathname: string,
  search: string,
  config: HostConfig = DEFAULT_CONFIG,
  state: RequestState = {},
): HostDecision {
  const siteHost = hostOf(config.siteUrl);
  const appHost = hostOf(config.appUrl);
  // 1. Single-host mode (previews, local dev, until the app host goes live).
  if (!siteHost || siteHost === appHost) return { kind: "pass" };

  const requestHost = host.toLowerCase();
  const onApp = requestHost === appHost;
  const onRoot = requestHost === siteHost;
  // Any other host (a *.vercel.app deployment URL) serves everything as today.
  if (!onApp && !onRoot) return { kind: "pass" };

  // 4. Each host has its own robots.txt and sitemap (src/app/app-robots.txt,
  //    src/app/app-sitemap.xml). Checked before the file rule below.
  if (onApp && pathname === "/robots.txt") return { kind: "rewrite", to: "/app-robots.txt" };
  if (onApp && pathname === "/sitemap.xml") return { kind: "rewrite", to: "/app-sitemap.xml" };

  // 2. Internals, API routes, files and metadata images serve on both hosts.
  if (isShared(pathname)) return { kind: "pass" };

  // 3. The app host has no landing page.
  if (onApp && pathname === "/") return { kind: "redirect", to: `${config.appUrl}/home`, status: 307 };

  // 5. A path on the wrong host moves, keeping path and query.
  const belongsOnRoot = isRootPath(pathname);
  if (onApp && belongsOnRoot) {
    return { kind: "redirect", to: `${config.siteUrl}${pathname}${search}`, status: 308 };
  }
  if (onRoot && !belongsOnRoot) {
    // Until HANDOFF_UNTIL, a browser that hasn't been handed off yet gets the
    // handoff page first, so a guest's local solves follow them to the app host.
    const method = (state.method ?? "GET").toUpperCase();
    if (
      !state.handoffDone &&
      (method === "GET" || method === "HEAD") &&
      (state.now ?? new Date()) < HANDOFF_UNTIL &&
      !pathname.startsWith("/handoff/")
    ) {
      return { kind: "rewrite", to: `/handoff?next=${encodeURIComponent(pathname + search)}` };
    }
    return { kind: "redirect", to: `${config.appUrl}${pathname}${search}`, status: 308 };
  }

  return { kind: "pass" };
}
