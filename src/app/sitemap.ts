import type { MetadataRoute } from "next";
import { getPublishedLearnIndex } from "@/lib/learn/public-dal";
import { buildSitemapEntries } from "@/lib/seo/sitemap";
import { SITE_URL } from "@/lib/site-url";

/**
 * /sitemap.xml: the fixed public pages and every published Learn page, down
 * to each case. Read without cookies so it stays cached; refreshed daily. If
 * the database can't be reached it still lists the fixed pages.
 */
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return buildSitemapEntries(await getPublishedLearnIndex(), SITE_URL);
}
