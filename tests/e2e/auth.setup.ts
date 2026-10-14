import { test as setup, expect } from "@playwright/test";

import { E2E_USERS, hasE2eUsers } from "./users";

/**
 * Signs each e2e test account in once and saves its session, so signed-in
 * specs start already logged in. Skips without credentials (a fork, or a
 * local run without them in .env.local); the specs that need them skip too.
 * The accounts are ordinary users: never the service-role key.
 */
for (const user of E2E_USERS) {
  setup(`sign in ${user.id}`, async ({ page }) => {
    setup.skip(!hasE2eUsers(), "E2E_USER_A/B credentials not set");
    await page.goto("/login?next=/profile");
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill(user.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/profile\/[A-Za-z0-9_]+$/);
    await page.context().storageState({ path: user.state });
  });
}
