import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

/** /robots.txt: crawl everything public; skip account, admin and auth pages. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/settings", "/profile/edit", "/master-access", "/auth/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
