import { test, expect } from "@playwright/test";

import { E2E_USERS, hasE2eUsers } from "./users";

/** /home (docs/home-plan.md). Guests run on local storage; members use the e2e accounts. */

test.describe("guest", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("a first visit shows the welcome card and starts the timer in one click", async ({ page }) => {
    await page.goto("/home");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Welcome to CuberHub");
    await expect(page.getByRole("region", { name: "Start here" })).toBeVisible();
    await page.getByRole("link", { name: /Start 3x3 session/ }).click();
    await expect(page).toHaveURL(/\/timer$/);
  });

  test("Enter starts a session; Space does nothing", async ({ page }) => {
    await page.goto("/home");
    await expect(page.getByRole("region", { name: "Start here" })).toBeVisible();
    await page.keyboard.press("Space");
    await page.waitForTimeout(300);
    await expect(page).toHaveURL(/\/home$/);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/timer$/);
  });
});

test.describe("guest layout", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("hiding a card persists across reloads", async ({ page }) => {
    await page.goto("/home");
    await expect(page.getByRole("region", { name: "Playground" })).toBeVisible();
    await page.getByRole("button", { name: "Customize" }).click();
    await page.getByRole("dialog", { name: "Customize Home" }).getByRole("switch", { name: "Playground" }).uncheck();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("region", { name: "Playground" })).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("region", { name: "Start here" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Playground" })).toHaveCount(0);
  });
});

// Member layouts persist through user_settings.home_layout
// (20261124000000_home_layout.sql, applied 2026-11-25).

test.describe("member", () => {
  test.skip(!hasE2eUsers(), "E2E_USER_A/B credentials not set");
  test.use({ viewport: { width: 1280, height: 800 }, storageState: E2E_USERS[0].state });

  test("a signed-in visit to /login lands on /home", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/home$/);
    await expect(page.getByRole("heading", { level: 1 })).not.toHaveText("Welcome to CuberHub");
  });

  test("a hidden card stays hidden after a reload (saved to the account), and comes back", async ({ page }) => {
    const card = page.getByRole("region", { name: "What's new" });
    const toggle = async (on: boolean) => {
      await page.getByRole("button", { name: "Customize" }).click();
      const sw = page.getByRole("dialog", { name: "Customize Home" }).getByRole("switch", { name: "What's new" });
      if (on) await sw.check();
      else await sw.uncheck();
      await page.keyboard.press("Escape");
    };
    await page.goto("/home");
    await expect(card).toBeVisible();
    await toggle(false);
    try {
      await expect(card).toHaveCount(0);
      // No local layout either: what comes back is the account's.
      await page.evaluate(() => localStorage.removeItem("cubehub.home.v1"));
      await page.reload();
      await expect(page.getByRole("button", { name: "Customize" })).toBeVisible();
      await expect(card).toHaveCount(0);
    } finally {
      // Leave the test account as it was.
      await toggle(true);
      await expect(card).toBeVisible();
      await page.reload();
      await expect(card).toBeVisible();
    }
  });
});
