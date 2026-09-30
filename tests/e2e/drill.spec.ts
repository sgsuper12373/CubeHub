import { test, expect, type Page } from "@playwright/test";

/**
 * Drill Lab, as a guest: the case renders from the algorithm, a tap starts and
 * a tap stops, the next tap moves on to a different case, and the recognition
 * split works. Guests record nothing server-side, so this needs no account.
 * The old timer train links must land here.
 */

/**
 * The drill needs seeded algorithm data. CI builds against a placeholder
 * Supabase key and gets none, so these skip there with a reason instead of
 * failing; run them against a seeded database (see implementationlog.md).
 */
async function skipWithoutData(page: Page) {
  const empty = await page.getByText("Nothing to drill here").isVisible();
  test.skip(empty, "no seeded algorithm data in this environment");
}

async function expectCaseRendered(page: Page) {
  await expect(page.locator("twisty-player").first()).toBeAttached({ timeout: 30_000 });
  await expect(page.getByRole("status", { name: /loading cube/i })).toHaveCount(0, { timeout: 30_000 });
}

test.describe("Drill Lab", () => {
  test("guest drills a set: start, stop, next case", async ({ page }) => {
    await page.goto("/learn/333/drill?set=pll&order=random");
    await skipWithoutData(page);
    await expectCaseRendered(page);

    const name = page.getByTestId("drill-case-name");
    const time = page.getByTestId("drill-time");
    const first = (await name.textContent())?.trim();
    expect(first).toBeTruthy();

    await page.keyboard.press("Space"); // start
    await page.waitForTimeout(350);
    await page.keyboard.press("Space"); // stop
    await expect(time).not.toHaveText("0.00");
    await expect(page.getByTestId("drill-session-list").locator("li")).toHaveCount(1);

    await page.waitForTimeout(250); // past the stop debounce
    await page.keyboard.press("Space"); // next case
    await expect(name).not.toHaveText(first!);
    await expectCaseRendered(page);
  });

  test("recognition split: hidden, reveal, execute, stop", async ({ page }) => {
    await page.goto("/learn/333/drill?set=pll&order=random");
    await skipWithoutData(page);
    await expectCaseRendered(page);

    await page.getByLabel("Recognition split").check();
    await expect(page.getByTestId("drill-case-hidden")).toBeVisible();

    await page.keyboard.press("Space"); // reveal
    await expect(page.getByTestId("drill-case-hidden")).toHaveCount(0);
    await page.waitForTimeout(200);
    await page.keyboard.press("Space"); // recognised → executing
    await page.waitForTimeout(200);
    await page.keyboard.press("Space"); // stop

    // Space drove the drill, not the focused checkbox.
    await expect(page.getByLabel("Recognition split")).toBeChecked();
    // The session row shows the recognition time before the result.
    await expect(page.getByTestId("drill-session-list").locator("li").first()).toContainText("+");
  });

  test("per-variant evidence produces a switch recommendation", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/learn/333/drill?set=pll&order=random");
    await skipWithoutData(page);

    // Custom set of one case that has two variants.
    await page.getByRole("button", { name: "Custom set" }).click();
    await page.getByLabel("Include Ua Perm").check();
    await page.getByRole("button", { name: "Drill 1 selected" }).click();
    await expect(page).toHaveURL(/cases=/);
    await expectCaseRendered(page);
    await expect(page.getByTestId("drill-case-name")).toHaveText("Ua Perm");

    const variants = page.getByRole("region", { name: "Algorithm variants" }).getByRole("button");
    const rep = async (ms: number) => {
      await page.keyboard.press("Space"); // start
      await page.waitForTimeout(ms);
      await page.keyboard.press("Space"); // stop
      await page.waitForTimeout(220); // stop debounce
      await page.keyboard.press("Space"); // next (the same case: it is the whole set)
    };

    // 10 slow reps on the main variant, 10 fast ones on the alternative.
    await variants.nth(0).click();
    for (let i = 0; i < 10; i++) await rep(700);
    await variants.nth(1).click();
    for (let i = 0; i < 10; i++) await rep(250);

    // Back on the slow variant, the evidence says switch.
    await variants.nth(0).click();
    const banner = page.getByRole("region", { name: "Algorithm variants" }).getByRole("status");
    await expect(banner).toContainText("10 times");
    await expect(banner).toContainText("Consider switching.");
    await banner.getByRole("button", { name: "Switch to it" }).click();
    await expect(variants.nth(1)).toHaveAttribute("aria-pressed", "true");
  });

  test("old timer train links redirect to the drill, and the timer has no train UI", async ({ page }) => {
    await page.goto("/timer?train=pll&puzzle=333");
    await expect(page).toHaveURL(/\/learn\/333\/drill\?set=pll/);

    await page.goto("/timer");
    await expect(page).toHaveURL(/\/timer$/);
    await expect(page.getByText(/^Drill:/)).toHaveCount(0);
    await expect(page.getByTitle("Exit drill mode")).toHaveCount(0);
  });
});
