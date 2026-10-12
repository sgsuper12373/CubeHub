import { test, expect, type Page } from "@playwright/test";

/**
 * Per-case pages (/learn/[puzzle]/[series]/[case]). They need seeded algorithm
 * data: CI sets E2E_REQUIRE_DATA so missing data fails there; elsewhere these
 * skip with a reason, as in drill.spec.ts.
 */
async function openCase(page: Page, path: string) {
  const res = await page.goto(path);
  const missing = res?.status() === 404;
  if (process.env.E2E_REQUIRE_DATA === "1") {
    expect(missing, `${path} has no data, but E2E_REQUIRE_DATA is set`).toBe(false);
  } else {
    test.skip(missing, "no seeded algorithm data in this environment");
  }
}

test("a case page has its own title, player and algorithms", async ({ page }) => {
  await openCase(page, "/learn/333/oll/27");

  await expect(page).toHaveTitle(/^OLL 27\b.*Algorithm.*\| CubeHub$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^OLL 27\b/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/learn\/333\/oll\/27$/);

  await expect(page.locator("twisty-player").first()).toBeAttached({ timeout: 30_000 });
  await expect(page.getByRole("status", { name: /loading/i })).toHaveCount(0, { timeout: 30_000 });

  // Picking another algorithm plays it instead
  const algs = page.getByRole("button", { pressed: false }).filter({ hasText: /moves$/ });
  if ((await algs.count()) > 0) {
    await algs.first().click();
    await expect(page.getByRole("button", { pressed: true }).filter({ hasText: /moves$/ })).toHaveCount(1);
  }

  await expect(page.getByRole("link", { name: "Drill this case" })).toHaveAttribute(
    "href",
    /^\/learn\/333\/drill\?case=[0-9a-f-]{36}$/,
  );
});

test("previous and next go through the set in order", async ({ page }) => {
  await openCase(page, "/learn/333/oll/27");
  await page.locator('a[rel="next"]').click();
  await expect(page).toHaveURL(/\/learn\/333\/oll\/28$/);
  await page.locator('a[rel="prev"]').click();
  await expect(page).toHaveURL(/\/learn\/333\/oll\/27$/);
});

test("a card's name links to its case page", async ({ page }) => {
  await openCase(page, "/learn/333/pll/1");
  await page.goto("/learn/333/pll");
  const link = page.locator('a[href="/learn/333/pll/1"]').first();
  const name = (await link.textContent())?.trim() ?? "";
  await link.click();
  await expect(page).toHaveURL(/\/learn\/333\/pll\/1$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
});

test("bad case URLs are 404s", async ({ page }) => {
  await openCase(page, "/learn/333/oll/27");
  for (const path of ["/learn/333/oll/999", "/learn/333/oll/abc", "/learn/333/oll/0", "/learn/333/beginner/1"]) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(404);
  }
});

test("the share image is a PNG", async ({ page, request }) => {
  await openCase(page, "/learn/333/oll/27");
  const src = await page.locator('meta[property="og:image"]').getAttribute("content");
  expect(src).toMatch(/\/learn\/333\/oll\/27\/opengraph-image/);
  const res = await request.get(new URL(src!).pathname + new URL(src!).search);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("image/png");
});

test("a case page fits a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openCase(page, "/learn/333/oll/27");
  await expect(page.locator("twisty-player").first()).toBeAttached({ timeout: 30_000 });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
});

test("the sitemap lists case pages, and robots.txt points to it", async ({ request }) => {
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  expect(xml).toContain("<loc>");
  expect(xml).not.toMatch(/\/settings</);
  if (process.env.E2E_REQUIRE_DATA === "1" || xml.includes("/learn/333/oll/")) {
    expect(xml).toMatch(/\/learn\/333\/oll\/27</);
  }

  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toMatch(/Sitemap: .*\/sitemap\.xml/);
  expect(robots).toContain("Disallow: /settings");
});
