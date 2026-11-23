import { test, expect } from "@playwright/test";

/** The landing page (docs/landing-plan.md). The hero timer has its own spec (landing-hero.spec.ts). */

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the hero's headline and buttons are in the HTML", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Every part of cubing. One hub.");
    await expect(page.getByRole("link", { name: /Start timing free/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "Explore Learn" })).toBeVisible();
  });
});

test.describe("header", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("links to the sections and turns solid once the page scrolls", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Site" });
    await expect(nav.getByRole("link", { name: "Features" })).toHaveAttribute("href", "/#features");
    await expect(nav.getByRole("link", { name: "Open app" })).toBeVisible();
    const header = page.locator("header").first();
    await expect(header).toHaveClass(/border-transparent/);
    await page.mouse.wheel(0, 600);
    await expect(header).toHaveClass(/backdrop-blur/);
  });
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 800 } });

  test("the menu opens the same links in a sheet", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Menu" }).click();
    const sheet = page.getByRole("dialog", { name: "Menu" });
    await expect(sheet.getByRole("link", { name: "Roadmap" })).toBeVisible();
    await expect(sheet.getByRole("link", { name: "Open app" })).toBeVisible();
  });
});

test("with reduced motion, nothing on the page is animating", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const running = await page.evaluate(() =>
    document
      .getAnimations()
      .filter((a) => a.playState === "running" && a instanceof CSSAnimation)
      .map((a) => (a as CSSAnimation).animationName),
  );
  expect(running).toEqual([]);
});
