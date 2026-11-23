import type { MetadataRoute } from "next";
import { HOST_SPLIT, SITE_URL } from "@/lib/site-url";

/**
 * /robots.txt on the root host. Split: the marketing site, all crawlable
 * (the app host's rules are src/app/app-robots.txt). Single host: crawl
 * everything public; skip account, admin and auth pages.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: HOST_SPLIT
      ? { userAgent: "*", allow: "/" }
      : {
          userAgent: "*",
          allow: "/",
          disallow: ["/settings", "/profile/edit", "/master-access", "/auth/"],
        },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
