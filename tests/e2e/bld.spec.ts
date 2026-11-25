import { expect, test, type Page } from "@playwright/test";

/**
 * 3x3 BLD in the timer (docs/timer.md → BLD): no inspection, and an optional
 * memo split that keeps the memo time with the solve. Guest only: the memo is
 * kept in this browser (the cloud column waits for 20261126000100_bld_memo.sql).
 */
test.use({ viewport: { width: 1280, height: 800 } });

const scramble = (page: Page) => page.getByLabel(/^Scramble: /).first();

async function hold(page: Page) {
  await page.keyboard.down("Space");
  await page.waitForTimeout(700);
  await page.keyboard.up("Space");
}

test("3x3 BLD has no inspection, and the memo split keeps a memo time", async ({ page }) => {
  await page.goto("/timer");
  await expect(scramble(page)).toBeVisible({ timeout: 60_000 });
  await page.getByLabel("Event").selectOption("333bf");
  await expect(scramble(page)).toBeVisible({ timeout: 60_000 });

  await page.getByRole("button", { name: "Timer settings" }).click();
  await page.getByRole("switch", { name: /BLD memo split/ }).click();
  await page.keyboard.press("Escape");

  // WCA inspection is on by default, but BLD goes straight to the hold.
  await hold(page);
  await expect(page.getByText("memo · press any key when the blindfold goes on")).toBeVisible();

  await page.waitForTimeout(400);
  await page.keyboard.press("a");
  await expect(page.getByText("solving · press any key to stop")).toBeVisible();

  await page.waitForTimeout(400);
  await page.keyboard.press("a");
  await expect(page.getByText("tap or press space for the next scramble")).toBeVisible();

  await page.locator('[data-panel="solves"] .cursor-pointer').first().click();
  await expect(page.getByTestId("solve-memo")).toHaveText(/^Memo 0\.\d\d · Execution 0\.\d\d$/);
});

test("without the split, one key press stops a BLD solve", async ({ page }) => {
  await page.goto("/timer");
  await expect(scramble(page)).toBeVisible({ timeout: 60_000 });
  await page.getByLabel("Event").selectOption("333bf");
  await expect(scramble(page)).toBeVisible({ timeout: 60_000 });

  await hold(page);
  await page.waitForTimeout(300);
  await page.keyboard.press("a");
  await expect(page.getByText("tap or press space for the next scramble")).toBeVisible();
  await page.locator('[data-panel="solves"] .cursor-pointer').first().click();
  await expect(page.getByText("Solve Details")).toBeVisible();
  await expect(page.getByTestId("solve-memo")).toHaveCount(0);
});
