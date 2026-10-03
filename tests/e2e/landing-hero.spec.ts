import { test, expect } from "@playwright/test";

/**
 * The landing page must stay browsable: the hero's timer is a replay that
 * ignores Space and taps until the visitor opts in with "Try a solve here".
 * Regression guard for the old demo, which grabbed Space whenever it was on
 * screen and started on any touch, including a thumb scrolling past.
 */

test.describe("landing hero timer", () => {
  test("Space scrolls the page instead of starting a solve", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Replay", { exact: true })).toBeVisible();

    await page.keyboard.down("Space");
    await page.waitForTimeout(500);
    await page.keyboard.up("Space");

    await expect(page.getByText("Live", { exact: true })).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  });

  test("opting in turns the card into a working timer, and Done hands the page back", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Try a solve here" }).click();

    const pad = page.getByRole("button", { name: /Practice timer/ });
    await expect(pad).toBeFocused();

    // Hold past the 300ms threshold, release to start, press to stop.
    await page.keyboard.down("Space");
    await page.waitForTimeout(450);
    await page.keyboard.up("Space");
    await expect(page.getByText("running", { exact: true })).toBeVisible();
    await page.waitForTimeout(300);
    await page.keyboard.down("Space");
    await page.keyboard.up("Space");
    await expect(page.getByText("stopped", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Done" }).click();
    await expect(page.getByText("Replay", { exact: true })).toBeVisible();
  });
});
