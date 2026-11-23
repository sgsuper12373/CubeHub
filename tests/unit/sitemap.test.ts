import { describe, it, expect } from "vitest";

import {
  buildAppRobots,
  buildAppSitemapEntries,
  buildMarketingSitemapEntries,
  buildSitemapEntries,
} from "@/lib/seo/sitemap";

const EMPTY = { sets: [], tutorials: [], cases: [] };

describe("buildSitemapEntries", () => {
  it("lists only the fixed pages when there is no data", () => {
    const urls = buildSitemapEntries(EMPTY, "https://cubehub.example/").map((e) => e.url);
    expect(urls).toEqual([
      "https://cubehub.example",
      "https://cubehub.example/timer",
      "https://cubehub.example/learn",
      "https://cubehub.example/playground",
      "https://cubehub.example/features/timer",
      "https://cubehub.example/features/drill-lab",
      "https://cubehub.example/features/learn",
      "https://cubehub.example/features/playground",
      "https://cubehub.example/roadmap",
      "https://cubehub.example/about",
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

describe("per-host sitemaps (split hosts)", () => {
  const INDEX = {
    sets: [{ puzzle: "333", slug: "pll" }],
    tutorials: [],
    cases: [{ puzzle: "333", series: "pll", caseNumber: 1 }],
  };

  it("the root host lists only marketing pages", () => {
    const urls = buildMarketingSitemapEntries("https://cuberhub.me/").map((e) => e.url);
    expect(urls).toEqual(["https://cuberhub.me"]);
  });

  it("the app host lists app pages, Learn and public profiles, not the landing page", () => {
    const urls = buildAppSitemapEntries(INDEX, ["sumit", "a b"], "https://app.cuberhub.me").map((e) => e.url);
    expect(urls).toContain("https://app.cuberhub.me/timer");
    expect(urls).toContain("https://app.cuberhub.me/learn/333/pll/1");
    expect(urls).toContain("https://app.cuberhub.me/profile/sumit");
    expect(urls).toContain("https://app.cuberhub.me/profile/a%20b");
    expect(urls).not.toContain("https://app.cuberhub.me");
    expect(urls.every((u) => u.startsWith("https://app.cuberhub.me/"))).toBe(true);
  });

  it("the app host's robots.txt allows Learn and profiles and points at its own sitemap", () => {
    const robots = buildAppRobots("https://app.cuberhub.me/");
    expect(robots).toContain("Allow: /learn/");
    expect(robots).toContain("Allow: /profile/");
    expect(robots).toContain("Disallow: /\n");
    expect(robots).toContain("Sitemap: https://app.cuberhub.me/sitemap.xml");
  });
});
