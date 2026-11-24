import { expect, test } from "@playwright/test";

/** The Ctrl/⌘+K palette (docs/app-shell-plan.md → Command palette). Reads only. */
test.describe("command palette", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("Ctrl+K opens it, a page is one search away, Escape closes it", async ({ page }) => {
    await page.goto("/home");
    await page.keyboard.press("Control+k");
    const box = page.getByRole("combobox", { name: "Search CuberHub" });
    await expect(box).toBeFocused();
    await box.fill("stats");
    await expect(page.getByRole("option").first()).toHaveText(/Stats/);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/stats$/);
    await page.keyboard.press("Control+k");
    await expect(box).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(box).toHaveCount(0);
  });

  test("the sidebar's search button opens it", async ({ page }) => {
    await page.goto("/stats");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByRole("combobox", { name: "Search CuberHub" })).toBeVisible();
  });

  test("Space in the palette never reaches the timer, and Ctrl+K waits while a solve runs", async ({ page }) => {
    await page.goto("/timer");
    await expect(page.getByLabel(/^Scramble: /).first()).toBeVisible({ timeout: 15_000 });
    await page.keyboard.press("Control+k");
    const box = page.getByRole("combobox", { name: "Search CuberHub" });
    await box.fill("a b");
    await expect(page.getByText("hold, then release to start")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(box).toHaveCount(0);

    // Inspection on (the default), so a Space press starts it: the timer is busy.
    await page.keyboard.press("Space");
    await page.keyboard.press("Control+k");
    await expect(box).toHaveCount(0);
    await page.keyboard.press("Escape"); // cancel inspection
  });
});
