import { expect, test } from "@playwright/test";

/**
 * Installable app and offline timer (docs/pwa.md). The service worker only
 * registers in production builds, so this runs under `test:e2e:prod`.
 */
test.skip(process.env.E2E_PROD !== "1" && !process.env.CI, "the service worker only registers in production builds");

test("the manifest and its icons are served", async ({ request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.ok()).toBe(true);
  const manifest = await res.json();
  expect(manifest).toMatchObject({ name: "CuberHub", start_url: "/timer", display: "standalone" });
  for (const icon of manifest.icons as { src: string }[]) expect((await request.get(icon.src)).ok()).toBe(true);
  expect((await request.get("/sw.js")).headers()["cache-control"]).toContain("no-store");
});

test("once opened online, the timer scrambles and saves solves offline", async ({ page, context }) => {
  await page.goto("/timer");
  await expect(page.getByLabel(/^Scramble: /).first()).toBeVisible({ timeout: 20_000 });
  // Installed, and controlling the page after a reload.
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), { timeout: 10_000 }).toBe(true);
  await expect(page.getByLabel(/^Scramble: /).first()).toBeVisible({ timeout: 20_000 });

  await context.setOffline(true);
  try {
    await page.reload();
    await expect(page.getByLabel(/^Scramble: /).first()).toBeVisible({ timeout: 20_000 });
    // Inspection, hold, solve, stop.
    await page.keyboard.press("Space");
    await page.keyboard.down("Space");
    await page.waitForTimeout(700);
    await page.keyboard.up("Space");
    await page.waitForTimeout(3200);
    await page.keyboard.press("Space");
    await expect
      .poll(() =>
        page.evaluate(() => {
          const raw = localStorage.getItem("cubehub.timer.v1");
          return raw ? ((JSON.parse(raw) as { solves?: unknown[] }).solves?.length ?? 0) : 0;
        }),
      )
      .toBe(1);

    // Pages that need the network say so instead of the browser's error page.
    await page.goto("/stats");
    await expect(page.getByRole("heading", { name: "You're offline" })).toBeVisible();
    await page.getByRole("link", { name: "Open the timer" }).click();
    await expect(page.getByLabel(/^Scramble: /).first()).toBeVisible({ timeout: 20_000 });
  } finally {
    await context.setOffline(false);
  }
});
