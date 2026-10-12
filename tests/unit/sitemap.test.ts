import { describe, it, expect } from "vitest";

import { buildSitemapEntries } from "@/lib/seo/sitemap";

const EMPTY = { sets: [], tutorials: [], cases: [] };

describe("buildSitemapEntries", () => {
  it("lists only the fixed pages when there is no data", () => {
    const urls = buildSitemapEntries(EMPTY, "https://cubehub.example/").map((e) => e.url);
    expect(urls).toEqual([
      "https://cubehub.example",
      "https://cubehub.example/timer",
      "https://cubehub.example/learn",
      "https://cubehub.example/playground",
    ]);
  });

  it("adds puzzles, series and every case, absolute and without duplicates", () => {
    const urls = buildSitemapEntries(
      {
        sets: [
          { puzzle: "333", slug: "oll" },
          { puzzle: "222", slug: "beginner" },
        ],
        tutorials: [
          { puzzle: "333", slug: "beginner" },
          { puzzle: "222", slug: "beginner" },
        ],
        cases: [
          { puzzle: "333", series: "oll", caseNumber: 1 },
          { puzzle: "333", series: "oll", caseNumber: 27 },
          { puzzle: "222", series: "beginner", caseNumber: 1 },
        ],
      },
      "https://cubehub.example",
    ).map((e) => e.url);

    expect(urls).toContain("https://cubehub.example/learn/333");
    expect(urls).toContain("https://cubehub.example/learn/222");
    expect(urls).toContain("https://cubehub.example/learn/333/beginner");
    expect(urls).toContain("https://cubehub.example/learn/333/oll/27");
    expect(urls).toContain("https://cubehub.example/learn/222/beginner/1");
    expect(urls.every((u) => u.startsWith("https://cubehub.example"))).toBe(true);
    expect(new Set(urls).size).toBe(urls.length);
    // A tutorial has steps, not case pages
    expect(urls).not.toContain("https://cubehub.example/learn/333/beginner/1");
  });

  it("never lists private or stub pages", () => {
    const urls = buildSitemapEntries(EMPTY, "https://cubehub.example").map((e) => e.url);
    for (const path of ["/settings", "/stats", "/compete", "/shop", "/profile"]) {
      expect(urls.some((u) => u.endsWith(path))).toBe(false);
    }
  });
});
