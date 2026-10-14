import { test, expect } from "@playwright/test";

import { E2E_USERS, hasE2eUsers } from "./users";

/**
 * Signed in, a drill rep is stored: after a reload the per-variant table
 * still counts it. ("This session" is in memory and empties on reload by
 * design; the saved history lives in the variant stats.)
 */

test.skip(!hasE2eUsers(), "E2E_USER_A/B credentials not set");
test.use({ storageState: E2E_USERS[0].state });

test("signed-in reps survive a reload", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/learn/333/drill?set=pll&order=random");
  await page.getByRole("button", { name: "Custom set" }).click();
  await page.getByLabel("Include Ua Perm").check();
  await page.getByRole("button", { name: "Drill 1 selected" }).click();
  await expect(page).toHaveURL(/cases=/);
  await expect(page.getByTestId("drill-case-name")).toHaveText("Ua Perm");

  const main = page.getByRole("region", { name: "Algorithm variants" }).getByRole("button").first();
  await main.click();
  const count = async () => Number((await main.textContent())?.match(/(\d+) reps?/)?.[1] ?? 0);
  const before = await count();

  for (let i = 0; i < 2; i++) {
    await page.keyboard.press("Space"); // start
    await page.waitForTimeout(300);
    await page.keyboard.press("Space"); // stop
    await page.waitForTimeout(250);
    await page.keyboard.press("Space"); // next (same case)
  }
  // The server's stats come back with each save.
  await expect.poll(count, { timeout: 15_000 }).toBe(before + 2);

  await page.reload();
  await expect(page.getByTestId("drill-case-name")).toHaveText("Ua Perm");
  await main.click();
  await expect.poll(count, { timeout: 15_000 }).toBe(before + 2);
});
