import { test, expect } from "@playwright/test";

/**
 * Vercel Analytics and Speed Insights render only on Vercel (VERCEL=1). Here
 * (local or CI) the pages must not load their scripts or call /_vercel/*,
 * which would 404 and count test traffic.
 */
test("analytics and speed insights stay off outside Vercel", async ({ page }) => {
  const vercelRequests: string[] = [];
  page.on("request", (r) => {
    if (new URL(r.url()).pathname.startsWith("/_vercel/")) vercelRequests.push(r.url());
  });

  for (const path of ["/", "/timer", "/learn"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await expect(page.locator('script[src*="/_vercel/"]')).toHaveCount(0);
  }
  expect(vercelRequests).toEqual([]);
});
