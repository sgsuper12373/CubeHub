import { test, expect } from "@playwright/test";

/**
 * Profile pages, signed out. Signed-in behaviour (landing on your own page,
 * the Settings button) needs an account and is checked by hand; see
 * docs/profile.md.
 */

test("My profile sends a signed-out visitor to sign in, and back afterwards", async ({ page }) => {
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/login\?next=%2Fprofile$/);
});

test("an unknown username is a 404 with no ELO anywhere", async ({ page }) => {
  const res = await page.goto("/profile/no_such_user_xyz");
  expect(res?.status()).toBe(404);
  await expect(page.getByText(/ELO/)).toHaveCount(0);
});

test("the nav's Profile tab goes to /profile", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/timer");
  await expect(page.getByRole("link", { name: "Profile" }).first()).toHaveAttribute("href", "/profile");
});
