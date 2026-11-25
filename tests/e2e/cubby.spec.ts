import { expect, test, type Page } from "@playwright/test";

/**
 * Cubby, the companion (docs/companion-plan.md). Behind NEXT_PUBLIC_SHOW_CUBBY,
 * which is inlined at build time, so these run in two builds:
 *
 *   NEXT_PUBLIC_SHOW_CUBBY=1 npm run test:e2e:prod -- tests/e2e/cubby.spec.ts
 *   npm run test:e2e:prod                       # the flag-off checks run with everything else
 *
 * With the flag on, every fresh browser gets first-visit tours, so the rest of
 * the suite runs with the flag off.
 */
const ON = process.env.NEXT_PUBLIC_SHOW_CUBBY === "1";

const SEEN = { seen: 1, skipped: false, offered: false };

/** A cuber who has had every tour, last on each page a day ago (so greetings may show). */
async function returningCuber(page: Page, settings: Record<string, unknown> = {}) {
  await page.addInitScript(
    ({ seen, settings }) => {
      if (sessionStorage.getItem("e2e-seeded")) return;
      sessionStorage.setItem("e2e-seeded", "1");
      localStorage.setItem(
        "cubehub.companion.v1",
        JSON.stringify({ settings, tours: { timer: seen, learn: seen, "learn-series": seen, drill: seen, playground: seen } }),
      );
      const dayAgo = Date.now() - 86_400_000;
      localStorage.setItem("cubehub.companion.visits.v1", JSON.stringify({ timer: dayAgo, learn: dayAgo, playground: dayAgo }));
    },
    { seen: SEEN, settings },
  );
}

const dock = (page: Page) => page.locator("[data-cubby-dock-trigger]").filter({ visible: true });
const tour = (page: Page) => page.getByRole("dialog");
/** The dot on the dock that's on screen (the phone dock exists but is hidden on desktop). */
const dot = (page: Page) => page.getByTestId("cubby-dot").filter({ visible: true });

test.describe("Cubby, flag off", () => {
  test.skip(ON, "flag-off build only");

  test("no dock, no tour, and the review page is a 404", async ({ page }) => {
    await page.goto("/timer");
    await expect(page.getByLabel(/^Scramble: /).first()).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(1500);
    await expect(page.locator("[data-cubby-dock]")).toHaveCount(0);
    await expect(page.locator("[data-cubby-tour]")).toHaveCount(0);
    const res = await page.goto("/dev/cubby");
    expect(res?.status()).toBe(404);
  });
});

test.describe("Cubby, flag on", () => {
  test.skip(!ON, "needs a NEXT_PUBLIC_SHOW_CUBBY=1 build");
  test.use({ viewport: { width: 1280, height: 800 } });

  test("the Timer tour starts on a first visit, moves with the keyboard, and Space can't start a solve behind it", async ({ page }) => {
    await page.goto("/timer");
    await expect(tour(page)).toContainText("Hi, I'm Cubby!", { timeout: 15_000 });
    await expect(tour(page).getByRole("heading")).toBeFocused();

    await page.keyboard.press("Space");
    await expect(page.getByText("hold, then release to start")).toBeVisible();

    await page.keyboard.press("ArrowRight");
    await expect(tour(page)).toContainText("Pick your puzzle");
    // An interactive step waits for the real action.
    await page.getByLabel("Event").selectOption("222");
    await expect(tour(page)).toContainText("Sessions keep practice apart");
    await page.keyboard.press("ArrowLeft");
    await expect(tour(page)).toContainText("Pick your puzzle");
  });

  test("the tour hides while a solve runs and comes back after it", async ({ page }) => {
    await page.goto("/timer");
    await expect(tour(page)).toBeVisible({ timeout: 15_000 });
    for (let i = 0; i < 4; i++) await tour(page).getByRole("button", { name: /^(Next|Skip step)$/ }).click();
    await expect(tour(page)).toContainText("Time a solve");

    // Inspection is on by default: the first hold starts it, the second starts the clock.
    for (let i = 0; i < 2; i++) {
      await page.keyboard.down("Space");
      await page.waitForTimeout(700);
      await page.keyboard.up("Space");
      await page.waitForTimeout(300);
    }
    await expect(tour(page)).toHaveCount(0);
    await page.keyboard.press("Space");
    await expect(tour(page)).toContainText("+2, DNF or delete");
  });

  test("Esc skips; the dock offers the tour once more with a dot, and runs it on request", async ({ page }) => {
    await page.goto("/timer");
    await expect(tour(page)).toBeVisible({ timeout: 15_000 });
    await page.keyboard.press("Escape");
    await expect(tour(page)).toHaveCount(0);

    await page.reload();
    await expect(page.getByLabel(/^Scramble: /).first()).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(1500);
    await expect(tour(page)).toHaveCount(0);
    await expect(dot(page)).toBeVisible();

    await dock(page).click();
    await page.getByRole("menuitem", { name: "Tour this page" }).click();
    await expect(tour(page)).toContainText("Hi, I'm Cubby!");
    await tour(page).getByRole("button", { name: "Skip tour" }).click();
    await expect(dot(page)).toHaveCount(0);
  });

  test("a greeting shows once per session, in a polite live region", async ({ page }) => {
    await returningCuber(page);
    await page.goto("/learn");
    const bubble = page.locator("[data-cubby-bubble]");
    await expect(bubble).toBeVisible({ timeout: 10_000 });
    await expect(bubble).toHaveAttribute("aria-live", "polite");
    await expect(bubble.locator(".sr-only")).toHaveText(/Learn/);

    await page.reload();
    await page.waitForTimeout(2500);
    await expect(bubble).toHaveCount(0);
  });

  test("Off hides Cubby everywhere; Ctrl+K → Cubby settings brings it back", async ({ page }) => {
    await returningCuber(page);
    await page.goto("/home");
    await dock(page).click();
    await page.getByRole("menuitem", { name: "Settings…" }).click();
    const sheet = page.getByRole("dialog", { name: "Cubby settings" });
    await sheet.locator("fieldset", { hasText: "Companion" }).getByText("Off", { exact: true }).click();
    await page.keyboard.press("Escape");
    await expect(dock(page)).toHaveCount(0);

    await page.goto("/timer");
    await page.waitForTimeout(1500);
    await expect(dock(page)).toHaveCount(0);

    await page.keyboard.press("Control+k");
    await page.getByRole("combobox", { name: "Search CuberHub" }).fill("cubby settings");
    await page.keyboard.press("Enter");
    await expect(sheet).toBeVisible();
    await sheet.locator("fieldset", { hasText: "Companion" }).getByText("On", { exact: true }).click();
    await page.keyboard.press("Escape");
    await expect(dock(page)).toHaveCount(1);
  });

  test("a new name is used in the tour", async ({ page }) => {
    await page.addInitScript(() => {
      if (!localStorage.getItem("cubehub.companion.v1")) localStorage.setItem("cubehub.companion.v1", JSON.stringify({ settings: { name: "Kubo" }, tours: {} }));
    });
    await page.goto("/timer");
    await expect(tour(page)).toContainText("Hi, I'm Kubo!", { timeout: 15_000 });
    await expect(dock(page)).toHaveAccessibleName(/Kubo/);
  });

  test("with reduced motion, Cubby doesn't animate", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await returningCuber(page);
    await page.goto("/home");
    await expect(dock(page)).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(800);
    const running = await page.evaluate(
      () => document.getAnimations().filter((a) => a.playState === "running" && (a.effect as KeyframeEffect | null)?.target instanceof Element && ((a.effect as KeyframeEffect).target as Element).closest(".cubby-art")).length,
    );
    expect(running).toBe(0);
  });

  test("the review page shows every expression", async ({ page }) => {
    await page.goto("/dev/cubby");
    await expect(page.getByRole("heading", { name: "Cubby v0 review" })).toBeVisible();
    for (const e of ["idle", "happy", "grin", "surprised", "concerned", "focused", "sleepy", "talking"]) {
      await expect(page.locator(`svg[data-expression="${e}"]`).first()).toBeVisible();
    }
  });

  test("the landing page meets Cubby", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Meet Cubby, your practice buddy." })).toBeVisible();
  });

  test("phones get a floating dock above the tab bar", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await returningCuber(page);
    await page.goto("/learn");
    await expect(page.locator('[data-cubby-dock="floating"]')).toBeVisible({ timeout: 10_000 });
  });
});
