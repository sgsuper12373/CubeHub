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
