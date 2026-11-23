import type { MetadataRoute } from "next";
import { getPublishedLearnIndex } from "@/lib/learn/public-dal";
import { buildMarketingSitemapEntries, buildSitemapEntries } from "@/lib/seo/sitemap";
import { HOST_SPLIT, SITE_URL } from "@/lib/site-url";

/**
 * /sitemap.xml on the root host. With the hosts split it lists only the
 * marketing pages; the app host's own sitemap (src/app/app-sitemap.xml) lists
 * Learn and profiles. In single-host mode it lists the fixed public pages and
 * every published Learn page, down to each case, as before. Read without
 * cookies so it stays cached; refreshed daily. If the database can't be
 * reached it still lists the fixed pages.
 */
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (HOST_SPLIT) return buildMarketingSitemapEntries(SITE_URL);
  return buildSitemapEntries(await getPublishedLearnIndex(), SITE_URL);
}
