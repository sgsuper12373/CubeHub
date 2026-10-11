import { test, expect } from "@playwright/test";

/**
 * Timer feature round (docs/timer.md). Signed out, so everything runs against
 * local storage and needs no Supabase data.
 */

const scramble = (page: import("@playwright/test").Page) =>
  page.locator('[aria-label^="Scramble: "]').first();

test("switching event scrambles for it and is remembered after a reload", async ({ page }) => {
  await page.goto("/timer");
  await expect(scramble(page)).toBeVisible({ timeout: 60_000 });
  const before = await scramble(page).getAttribute("aria-label");

  await page.getByLabel("Event").selectOption("pyra");
  // Pyraminx scrambles end with tip moves (lowercase u/l/r/b), which a 3x3
  // scramble never has. Tips are random, so check for a Pyraminx face only.
  await expect(scramble(page)).not.toHaveAttribute("aria-label", before ?? "", { timeout: 60_000 });
  const pyra = (await scramble(page).getAttribute("aria-label")) ?? "";
  expect(pyra).not.toMatch(/\b[DF]/);
  await expect(page.getByRole("button", { name: "New Pyraminx scramble" })).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("Event")).toHaveValue("pyra");
  await expect(scramble(page)).toBeVisible({ timeout: 60_000 });
});

test("megaminx scrambles keep their seven lines and the buttons stay reachable", async ({ page }) => {
  await page.goto("/timer");
  await expect(scramble(page)).toBeVisible({ timeout: 60_000 });
  await page.getByLabel("Event").selectOption("mega");

  await expect(scramble(page).locator("p")).toHaveCount(7, { timeout: 60_000 });
  await expect(page.getByRole("button", { name: "New Megaminx scramble" })).toBeInViewport();
});

/**
 * One full keyboard solve with the default 15s inspection: tap to inspect,
 * hold past the hold threshold, release to start, press to stop.
 */
async function solve(page: import("@playwright/test").Page, ms: number) {
  await page.keyboard.down("Space");
  await page.keyboard.up("Space");
  await page.keyboard.down("Space");
  await page.waitForTimeout(450);
  await page.keyboard.up("Space");
  await page.waitForTimeout(ms);
  await page.keyboard.down("Space");
  await page.keyboard.up("Space");
  // Past the stop debounce, so the next press starts a new attempt.
  await page.waitForTimeout(300);
}

test("session best toast, then an all-time PB card with a share image", async ({ page }) => {
  await page.goto("/timer");
  await expect(scramble(page)).toBeVisible({ timeout: 60_000 });

  await solve(page, 1500);
  await solve(page, 700);
  await expect(page.getByText(/^Session best: Single/)).toBeVisible();

  // After a reload the 0.7s single is history, so beating it is all-time.
  await page.reload();
  await expect(scramble(page)).toBeVisible({ timeout: 60_000 });
  await solve(page, 250);

  const card = page.getByRole("status").filter({ hasText: "New all-time PB" });
  await expect(card).toBeVisible();
  await expect(card).toContainText("Single");

  const share = card.getByRole("button", { name: "Share" });
  await expect(share).toBeEnabled({ timeout: 10_000 });
  const download = page.waitForEvent("download");
  await share.click();
  expect((await download).suggestedFilename()).toBe("cubehub-pb.png");

  // Starting the next solve puts the card away.
  await page.keyboard.down("Space");
  await page.keyboard.up("Space");
  await expect(card).toHaveCount(0);
});
