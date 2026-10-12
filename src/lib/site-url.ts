/**
 * The site's absolute origin, for metadata, the sitemap and robots.txt. Set
 * NEXT_PUBLIC_SITE_URL to the live domain in Vercel, or every absolute URL
 * (Open Graph, sitemap entries) points at localhost.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
