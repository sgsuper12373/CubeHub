/**
 * The site's absolute origins, for metadata, sitemaps, robots.txt and links
 * between the two hosts (docs/app-shell-plan.md → Host routing).
 *
 * - NEXT_PUBLIC_SITE_URL is the marketing origin (https://cuberhub.me). Set it
 *   in Vercel, or every absolute URL (Open Graph, sitemap entries) points at
 *   localhost.
 * - NEXT_PUBLIC_APP_URL is the product origin (https://app.cuberhub.me). Leave
 *   it unset for preview deployments and local dev: it falls back to
 *   SITE_URL, HOST_SPLIT is false, and everything serves from one host.
 */

/**
 * Used when NEXT_PUBLIC_SITE_URL is unset or empty: the live domain in a
 * production build, so `next build` can never publish localhost in og:url,
 * og:image, canonicals, JSON-LD, sitemap.xml or robots.txt; localhost in dev.
 */
const DEFAULT_SITE_URL = process.env.NODE_ENV === "production" ? "https://cuberhub.me" : "http://localhost:3000";

/** The marketing origin, e.g. https://cuberhub.me */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, "");
/** The app origin, e.g. https://app.cuberhub.me. Falls back to SITE_URL (single-host mode). */
export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || SITE_URL).replace(/\/+$/, "");
/** True only when the two origins differ: production and a local split-host setup. */
export const HOST_SPLIT = APP_URL !== SITE_URL;

export const siteUrl = (path = "/") => `${SITE_URL}${path}`;
export const appUrl = (path = "/") => `${APP_URL}${path}`;

/**
 * The parent domain both hosts share cookies on (`.cuberhub.me`), or undefined
 * in single-host mode and on localhost, where a host-only cookie is right
 * (browsers refuse `domain=.localhost`).
 */
export function cookieDomainFor(siteUrl: string, split: boolean): string | undefined {
  if (!split) return undefined;
  const { hostname } = new URL(siteUrl);
  if (hostname === "localhost" || hostname.endsWith(".localhost") || /^[\d.]+$/.test(hostname)) {
    return undefined;
  }
  return `.${hostname.replace(/^www\./, "")}`;
}

export const COOKIE_DOMAIN = cookieDomainFor(SITE_URL, HOST_SPLIT);
