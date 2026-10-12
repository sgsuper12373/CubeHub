import { test, expect } from "@playwright/test";

test("an unknown URL is a themed 404 with a way home", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const res = await page.goto("/no-such-page");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "This page doesn't exist" })).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);

  await page.getByRole("link", { name: "Home" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("notFound() inside the app keeps the navbar", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const res = await page.goto("/learn/no-such-puzzle");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "This page doesn't exist" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Timer" }).first()).toBeVisible();
});
