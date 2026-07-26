import { test, expect } from "@playwright/test";

test.describe("CubeHub Auth Smoke & Route Gating Tests", () => {
  test("1 & 2. Homepage loads logged-out navbar with Sign In button that navigates to /login", async ({ page }) => {
    await page.goto("/");

    // Check for Sign In button in navbar
    const signInBtn = page.locator("header nav").getByText("Sign In").or(page.getByText("Sign In").first());
    await expect(signInBtn).toBeVisible();

    // Click Sign In and check navigation
    await signInBtn.click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("3. /login and /signup render cards with Google button, inputs, and cross-links", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();

    // Navigate to signup via cross-link
    const signUpLink = page.getByRole("link", { name: /sign up/i });
    await signUpLink.click();
    await expect(page).toHaveURL(/\/signup/);

    // Verify signup card structure
    await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /create account/i })).toBeVisible();
  });

  test("4. /signup submits with password < 8 chars and triggers client-side validation error without network departure", async ({ page }) => {
    await page.goto("/signup");

    await page.locator('input[name="email"]').fill("test.smoke@cubehub.in");
    await page.locator('input[name="password"]').fill("12345"); // < 8 characters

    const submitBtn = page.getByRole("button", { name: /create account/i });
    await submitBtn.click();

    // Verify HTML5 minLength validation prevents form submission and keeps user on /signup
    const passwordInput = page.locator('input[name="password"]');
    const isValid = await passwordInput.evaluate((el: HTMLInputElement) => el.checkValidity());
    expect(isValid).toBe(false);
    await expect(page).toHaveURL(/\/signup/);
  });

  test("5. Route gating redirects unauthenticated user from /settings to /login with ?next= return target", async ({ page }) => {
    await page.goto("/settings");

    // Assert redirect to /login with encoded ?next=/settings parameter
    await expect(page).toHaveURL(/\/login\?next=%2Fsettings/);
  });
});
