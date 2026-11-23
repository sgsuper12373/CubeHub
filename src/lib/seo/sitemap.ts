import type { MetadataRoute } from "next";
import type { LearnIndex } from "@/lib/learn/public-dal";
import { casePath } from "@/lib/learn/case-route";

type Entry = MetadataRoute.Sitemap[number];

/**
 * Marketing pages, served by the root host (docs/app-shell-plan.md → Robots
 * and sitemaps). The landing plan's feature pages join this list as they ship.
 */
const MARKETING: Entry[] = [{ url: "/", changeFrequency: "weekly", priority: 1 }];

/**
 * App pages worth indexing that don't come from the database. /stats is left
 * out (it shows the visitor's own local solves), as are /compete and /shop
 * (stubs) and /home (personal).
 */
const APP_FIXED: Entry[] = [
  { url: "/timer", changeFrequency: "monthly", priority: 0.9 },
  { url: "/learn", changeFrequency: "weekly", priority: 0.9 },
  { url: "/playground", changeFrequency: "monthly", priority: 0.6 },
];

function absolute(entries: Entry[], origin: string): MetadataRoute.Sitemap {
  const base = origin.replace(/\/+$/, "");
  // A slug used by both a tutorial and a set (e.g. "beginner") is one page.
  const seen = new Set<string>();
  return entries
    .map((e) => ({ ...e, url: `${base}${e.url === "/" ? "" : e.url}` }))
    .filter((e) => !seen.has(e.url) && seen.add(e.url));
}

function learnEntries(index: LearnIndex): Entry[] {
  const entries: Entry[] = [];
  const puzzles = [...new Set([...index.sets, ...index.tutorials].map((s) => s.puzzle))];
  for (const puzzle of puzzles) {
    entries.push({ url: `/learn/${encodeURIComponent(puzzle)}`, changeFrequency: "weekly", priority: 0.8 });
  }
  for (const s of [...index.tutorials, ...index.sets]) {
    entries.push({
      url: `/learn/${encodeURIComponent(s.puzzle)}/${encodeURIComponent(s.slug)}`,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }
  for (const c of index.cases) {
    entries.push({ url: casePath(c.puzzle, c.series, c.caseNumber), changeFrequency: "monthly", priority: 0.7 });
  }
  return entries;
}

function profileEntries(usernames: readonly string[]): Entry[] {
  return usernames.map((u) => ({
    url: `/profile/${encodeURIComponent(u)}`,
    changeFrequency: "weekly" as const,
    priority: 0.4,
  }));
}

/** The root host's sitemap when the hosts are split: marketing pages only. */
export function buildMarketingSitemapEntries(siteUrl: string): MetadataRoute.Sitemap {
  return absolute([...MARKETING], siteUrl);
}

/** The app host's sitemap: the fixed app pages, every published Learn page and public profiles. */
export function buildAppSitemapEntries(
  index: LearnIndex,
  publicProfiles: readonly string[],
  appUrl: string,
): MetadataRoute.Sitemap {
  return absolute([...APP_FIXED, ...learnEntries(index), ...profileEntries(publicProfiles)], appUrl);
}

/**
 * Single-host mode (previews, and production until the app host is live):
 * one sitemap with the marketing pages, the fixed app pages and every
 * published Learn page, as before the split. Profiles stay out here, as they
 * always have.
 */
export function buildSitemapEntries(index: LearnIndex, siteUrl: string): MetadataRoute.Sitemap {
  return absolute([...MARKETING, ...APP_FIXED, ...learnEntries(index)], siteUrl);
}

/** The app host's robots.txt: Learn and public profiles are indexable, the rest of the app isn't. */
export function buildAppRobots(appUrl: string): string {
  const base = appUrl.replace(/\/+$/, "");
  return [
    "User-Agent: *",
    "Allow: /learn/",
    "Allow: /profile/",
    // Crawlers need the scripts, styles and images to render those pages.
    "Allow: /_next/",
    "Allow: /cubing/",
    "Allow: /images/",
    "Disallow: /",
    "",
    `Sitemap: ${base}/sitemap.xml`,
    "",
  ].join("\n");
}
