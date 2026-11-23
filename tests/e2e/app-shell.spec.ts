import { test, expect, type Page } from "@playwright/test";

/**
 * The app shell (docs/app-shell-plan.md): the sidebar, the retired Zen mode,
 * Focus mode hiding the chrome, and the phone More sheet. Single host, signed
 * out. The two-host routing is unit-tested (tests/unit/host-routing.test.ts).
 */

const scramble = (page: Page) => page.locator('[aria-label^="Scramble: "]').first();
const sidebar = (page: Page) => page.locator("aside.app-sidebar");
/** <TimerScreen/> sets this on <html> while a solve (or inspection) is under way and Focus mode is on. */
const solving = (page: Page) => page.locator("html[data-focus-solving]");

test.describe("desktop", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("Modes has no Zen toggle; Hide UI while solving is on by default", async ({ page }) => {
    await page.goto("/timer");
    await page.getByRole("button", { name: "Modes" }).click();
    await expect(page.getByText("Zen Mode")).toHaveCount(0);
    await expect(page.getByText("Hide UI while solving")).toBeVisible();
  });

  test("the sidebar remembers its state per page group across reloads", async ({ page }) => {
    await page.goto("/timer");
    await expect(sidebar(page)).toHaveAttribute("data-sidebar-state", "rail");
    await page.getByRole("button", { name: "Expand sidebar" }).click();
    await expect(sidebar(page)).toHaveAttribute("data-sidebar-state", "expanded");
    await page.reload();
    await expect(sidebar(page)).toHaveAttribute("data-sidebar-state", "expanded");

    // Stats is in another group and keeps its own default.
    await page.goto("/stats");
    await expect(sidebar(page)).toHaveAttribute("data-sidebar-state", "auto");
    await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Stats" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    // Ctrl+B hides it and brings it back.
    await page.keyboard.press("Control+b");
    await expect(sidebar(page)).toHaveAttribute("data-sidebar-state", "hidden");
    await page.reload();
    await expect(sidebar(page)).toHaveAttribute("data-sidebar-state", "hidden");
    await page.getByRole("button", { name: "Show sidebar" }).click();
    await expect(sidebar(page)).not.toHaveAttribute("data-sidebar-state", "hidden");
  });

  test("with the Learn flyout open, Space does not start the timer", async ({ page }) => {
    await page.goto("/timer");
    await expect(scramble(page)).toBeVisible({ timeout: 60_000 });
    await page.getByRole("navigation", { name: "Main" }).getByRole("button", { name: "Learn" }).hover();
    await expect(page.getByRole("menuitem", { name: "All of Learn" })).toBeVisible();
    await page.keyboard.press("Space");
    await page.waitForTimeout(300);
    await expect(solving(page)).toHaveCount(0);
  });

  test("Focus mode hides the sidebar while solving and brings it back after", async ({ page }) => {
    await page.goto("/timer");
    await expect(scramble(page)).toBeVisible({ timeout: 60_000 });
    await expect(sidebar(page)).toBeVisible();
    // A tap starts the default 15 s inspection, which counts as under way.
    await page.keyboard.down("Space");
    await page.keyboard.up("Space");
    await expect(solving(page)).toHaveCount(1);
    await expect(sidebar(page)).toBeHidden();
    // Escape abandons inspection; the chrome comes back.
    await page.keyboard.press("Escape");
    await expect(solving(page)).toHaveCount(0);
    await expect(sidebar(page)).toBeVisible();
  });
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 800 }, hasTouch: true });

  test("the bottom bar is Home, Timer, Learn, Drill and More; More opens the rest", async ({ page }) => {
    await page.goto("/learn");
    const tabs = page.getByRole("navigation", { name: "Tabs" });
    await expect(tabs.getByRole("link")).toHaveText(["Home", "Timer", "Learn", "Drill"]);
    await tabs.getByRole("button", { name: /More/ }).click();
    const sheet = page.getByRole("dialog", { name: "More" });
    await expect(sheet.getByRole("link", { name: "Stats" })).toBeVisible();
    await expect(sheet.getByRole("link", { name: "Sign in" })).toBeVisible();
    await sheet.getByRole("link", { name: "Stats" }).click();
    await expect(page).toHaveURL(/\/stats$/);
    await expect(tabs.getByRole("button", { name: /More/ })).toHaveClass(/text-primary/);
  });
});
