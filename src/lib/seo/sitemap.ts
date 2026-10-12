import type { MetadataRoute } from "next";
import type { LearnIndex } from "@/lib/learn/public-dal";
import { casePath } from "@/lib/learn/case-route";

type Entry = MetadataRoute.Sitemap[number];

/**
 * Public pages worth indexing that don't come from the database. /stats is
 * left out (it shows the visitor's own local solves), as are /compete and
 * /shop (stubs) and every profile (privacy).
 */
const FIXED: Entry[] = [
  { url: "/", changeFrequency: "weekly", priority: 1 },
  { url: "/timer", changeFrequency: "monthly", priority: 0.9 },
  { url: "/learn", changeFrequency: "weekly", priority: 0.9 },
  { url: "/playground", changeFrequency: "monthly", priority: 0.6 },
];

/** Sitemap entries for the fixed pages plus every published Learn page. */
export function buildSitemapEntries(index: LearnIndex, siteUrl: string): MetadataRoute.Sitemap {
  const origin = siteUrl.replace(/\/+$/, "");
  const entries: Entry[] = [...FIXED];

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

  // A slug used by both a tutorial and a set (e.g. "beginner") is one page.
  const seen = new Set<string>();
  return entries
    .map((e) => ({ ...e, url: `${origin}${e.url === "/" ? "" : e.url}` }))
    .filter((e) => !seen.has(e.url) && seen.add(e.url));
}
