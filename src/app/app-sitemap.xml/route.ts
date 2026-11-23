import { getPublishedLearnIndex } from "@/lib/learn/public-dal";
import { getPublicProfileUsernames } from "@/lib/profile/public-dal";
import { buildAppSitemapEntries } from "@/lib/seo/sitemap";
import { APP_URL } from "@/lib/site-url";

/**
 * The app host's /sitemap.xml (rewritten here by src/proxy.ts): Learn pages
 * and public profiles. Cookie-free reads, refreshed daily, like the root one.
 */
export const revalidate = 86400;

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function GET() {
  const [index, profiles] = await Promise.all([getPublishedLearnIndex(), getPublicProfileUsernames()]);
  const urls = buildAppSitemapEntries(index, profiles, APP_URL)
    .map(
      (e) =>
        `<url><loc>${escape(e.url)}</loc>` +
        (e.changeFrequency ? `<changefreq>${e.changeFrequency}</changefreq>` : "") +
        (e.priority !== undefined ? `<priority>${e.priority}</priority>` : "") +
        `</url>`,
    )
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
