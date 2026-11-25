import { expect, test } from "@playwright/test";

import { E2E_USERS, hasE2eUsers } from "./users";

/** "Up next for you" on /learn (src/lib/learn/next-set.ts). Reads only. */

test("guests don't get the banner", async ({ page }) => {
  await page.goto("/learn");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByTestId("next-set")).toHaveCount(0);
});

test.describe("member", () => {
  test.skip(!hasE2eUsers(), "E2E_USER_A/B credentials not set");
  test.use({ storageState: E2E_USERS[0].state });

  test("a signed-in cuber is pointed at a real set", async ({ page }) => {
    await page.goto("/learn");
    const banner = page.getByTestId("next-set");
    await expect(banner).toBeVisible();
    await expect(banner).toContainText("Up next for you");
    const href = await banner.getAttribute("href");
    expect(href).toMatch(/^\/learn\/(333|222)\/[a-z0-9]+$/);
    await banner.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
