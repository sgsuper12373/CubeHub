import { test, expect } from "@playwright/test";

/** The landing page (docs/landing-plan.md). The hero timer has its own spec (landing-hero.spec.ts). */

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the hero's headline and buttons are in the HTML", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Every part of cubing. One hub.");
    await expect(page.getByRole("link", { name: /Start timing free/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "Explore Learn" }).first()).toBeVisible();
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
  // The loading cube is the one deliberate exception: slowed to 6 s rather
  // than stopped (globals.css), because it signals that something is loading.
  expect(running.filter((name) => name !== "cube-loader-tumble")).toEqual([]);
});

test("the five feature chapters each have a heading and a link into the app", async ({ page }) => {
  await page.goto("/");
  for (const [title, link] of [
    ["A timer that disappears when you solve.", "/timer"],
    ["Every OLL and PLL, in 3D.", "/learn"],
    ["Find out which alg is actually faster for your hands.", "/learn/333/drill"],
    ["A cube you can turn right here.", "/playground"],
    ["Your PBs, your progress, your college club.", "/clubs"],
  ]) {
    const heading = page.getByRole("heading", { level: 2, name: title });
    await expect(heading).toHaveCount(1);
    await expect(page.locator("section", { has: heading }).locator(`a[href="${link}"]`).first()).toHaveCount(1);
  }
});

test("roadmap and FAQ: three columns, answers that open, and FAQPage data", async ({ page }) => {
  await page.goto("/");
  for (const col of ["Now", "Next", "Later"]) {
    await expect(page.locator("#roadmap").getByRole("heading", { name: col, exact: true })).toBeVisible();
  }
  const faq = page.locator("#faq");
  await faq.getByText("Do I need an account?").click();
  await expect(faq.getByText(/Sign in to sync them across devices/)).toBeVisible();
  const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(ld.some((t) => JSON.parse(t)["@type"] === "FAQPage")).toBe(true);
});

test("section ids are unique", async ({ page }) => {
  await page.goto("/");
  const ids = await page.evaluate(() => [...document.querySelectorAll("[id]")].map((e) => e.id));
  expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
});
