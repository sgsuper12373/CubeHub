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

// The app shell moved Profile out of the tabs: on desktop it's the sidebar's
// account row (signed in only), on phones it's in the More sheet.
test("the phone More sheet's Profile link goes to /profile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/timer");
  await page.getByRole("navigation", { name: "Tabs" }).getByRole("button", { name: /More/ }).click();
  await expect(page.getByRole("dialog", { name: "More" }).getByRole("link", { name: "Profile" })).toHaveAttribute(
    "href",
    "/profile",
  );
});

test("editing a profile needs an account", async ({ page }) => {
  await page.goto("/profile/edit");
  await expect(page).toHaveURL(/\/login\?next=%2Fprofile%2Fedit$/);
});
