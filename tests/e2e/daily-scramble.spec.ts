import { expect, test, type Page } from "@playwright/test";

import { addDays, istDay } from "../../src/lib/daily/day";

/**
 * The daily scramble (docs/home-plan.md → card 2). The guest flow needs the
 * daily tables and today's scramble in the database (migration
 * 20261125000100 plus the DataSeeds file); until they're there it skips,
 * and only the fallbacks are checked. Posting is covered by
 * supabase/tests/daily_scramble_test.sql, so these tests never write.
 */

async function openDaily(page: Page, day: string) {
  await page.goto(`/timer?daily=${day}`);
  await expect(page.getByRole("status", { name: "Loading the daily scramble" })).toHaveCount(0, { timeout: 15_000 });
}

/** One solve with the keyboard: Space starts inspection, a held Space arms and launches, any key stops. */
async function solveOnce(page: Page) {
  await page.keyboard.down("Space");
  await page.keyboard.up("Space");
  await page.keyboard.down("Space");
  await page.waitForTimeout(700); // past the hold threshold
  await page.keyboard.up("Space");
  await page.waitForTimeout(2300); // over the 2.00 s mis-stop floor
  await page.keyboard.press("Space");
}

test("an unreadable daily date falls back to the normal timer", async ({ page }) => {
  await page.goto("/timer?daily=not-a-date");
  await expect(page).toHaveURL(/\/timer$/);
});

test("a long-gone day says so and offers the normal timer", async ({ page }) => {
  await openDaily(page, "2020-01-01");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/No daily scramble today|This daily has closed/);
  await expect(page.getByRole("link", { name: "Open the timer" })).toHaveAttribute("href", "/timer");
});

test("a guest gets one attempt, kept in the browser, and the normal timer is untouched", async ({ page, context }) => {
  const today = istDay();
  // Yesterday's attempt in this browser, so today's makes a two-day streak.
  await page.goto("/home");
  await page.evaluate(
    ([key, day]) => localStorage.setItem(key, JSON.stringify({ [day]: { timeMs: 20_000, penalty: "none", posted: false } })),
    ["cubehub.daily.v1", addDays(today, -1)],
  );
  await openDaily(page, today);
  const unavailable = await page.getByRole("heading", { name: "No daily scramble today" }).count();
  test.skip(unavailable > 0, "no daily scramble in this database yet (migration or seed not applied)");

  await expect(page.getByText(/Daily scramble ·/)).toBeVisible();
  const scramble = (await page.getByLabel(/^Scramble: /).first().getAttribute("aria-label"))!.replace("Scramble: ", "");
  await solveOnce(page);

  const result = page.getByTestId("daily-result");
  await expect(result).toHaveText(/^\d+\.\d{2}\+?$|^DNF$/);
  // Guests aren't posted: no post button, a sign-in link instead.
  await expect(page.getByRole("button", { name: "Post to the leaderboard" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Sign in to get on the leaderboard" })).toBeVisible();
  await expect(page.getByTestId("daily-streak")).toHaveText("2-day streak");

  // Share: copied (headless Chromium has no share sheet) with the day, the result and a link to the same scramble.
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.evaluate(() => {
    (navigator as { share?: unknown }).share = undefined;
  });
  await page.getByRole("button", { name: "Share" }).click();
  await expect(page.getByText("Result copied")).toBeVisible();
  const shared = await page.evaluate(() => navigator.clipboard.readText());
  expect(shared).toContain("CuberHub daily scramble");
  expect(shared).toContain("2-day streak");
  expect(shared).toContain(`/timer?daily=${today}`);

  // A reload doesn't buy a second attempt.
  const shown = await result.textContent();
  await page.reload();
  await expect(page.getByTestId("daily-result")).toHaveText(shown!);
  await expect(page.getByRole("button", { name: /Timer — hold/ })).toHaveCount(0);

  // The normal timer gets its own scramble back and recorded nothing.
  await page.getByRole("link", { name: "Back to the normal timer" }).click();
  await expect(page).toHaveURL(/\/timer$/);
  const normal = page.getByLabel(/^Scramble: /).first();
  await expect(normal).toBeVisible({ timeout: 15_000 });
  expect(await normal.getAttribute("aria-label")).not.toBe(`Scramble: ${scramble}`);
  const solves = await page.evaluate(() => {
    const raw = localStorage.getItem("cubehub.timer.v1");
    return raw ? ((JSON.parse(raw) as { solves?: unknown[] }).solves?.length ?? 0) : 0;
  });
  expect(solves).toBe(0);
});
