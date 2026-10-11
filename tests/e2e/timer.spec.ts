import { test, expect } from "@playwright/test";

/**
 * Timer feature round (docs/timer.md). Signed out, so everything runs against
 * local storage and needs no Supabase data.
 */

const scramble = (page: import("@playwright/test").Page) =>
  page.locator('[aria-label^="Scramble: "]').first();

test("switching event scrambles for it and is remembered after a reload", async ({ page }) => {
  await page.goto("/timer");
  await expect(scramble(page)).toBeVisible({ timeout: 60_000 });
  const before = await scramble(page).getAttribute("aria-label");

  await page.getByLabel("Event").selectOption("pyra");
  // Pyraminx scrambles end with tip moves (lowercase u/l/r/b), which a 3x3
  // scramble never has. Tips are random, so check for a Pyraminx face only.
  await expect(scramble(page)).not.toHaveAttribute("aria-label", before ?? "", { timeout: 60_000 });
  const pyra = (await scramble(page).getAttribute("aria-label")) ?? "";
  expect(pyra).not.toMatch(/\b[DF]/);
  await expect(page.getByRole("button", { name: "New Pyraminx scramble" })).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("Event")).toHaveValue("pyra");
  await expect(scramble(page)).toBeVisible({ timeout: 60_000 });
});

test("megaminx scrambles keep their seven lines and the buttons stay reachable", async ({ page }) => {
  await page.goto("/timer");
  await expect(scramble(page)).toBeVisible({ timeout: 60_000 });
  await page.getByLabel("Event").selectOption("mega");

  await expect(scramble(page).locator("p")).toHaveCount(7, { timeout: 60_000 });
  await expect(page.getByRole("button", { name: "New Megaminx scramble" })).toBeInViewport();
});

/**
 * One full keyboard solve with the default 15s inspection: tap to inspect,
 * hold past the hold threshold, release to start, press to stop.
 */
async function solve(page: import("@playwright/test").Page, ms: number) {
  await page.keyboard.down("Space");
  await page.keyboard.up("Space");
  await page.keyboard.down("Space");
  await page.waitForTimeout(450);
  await page.keyboard.up("Space");
  await page.waitForTimeout(ms);
  await page.keyboard.down("Space");
  await page.keyboard.up("Space");
  // Past the stop debounce, so the next press starts a new attempt.
  await page.waitForTimeout(300);
}

test("session best toast, then an all-time PB card with a share image", async ({ page }) => {
  await page.goto("/timer");
  await expect(scramble(page)).toBeVisible({ timeout: 60_000 });

  await solve(page, 1500);
  await solve(page, 700);
  await expect(page.getByText(/^Session best: Single/)).toBeVisible();

  // After a reload the 0.7s single is history, so beating it is all-time.
  await page.reload();
  await expect(scramble(page)).toBeVisible({ timeout: 60_000 });
  await solve(page, 250);

  const card = page.getByRole("status").filter({ hasText: "New all-time PB" });
  await expect(card).toBeVisible();
  await expect(card).toContainText("Single");

  const share = card.getByRole("button", { name: "Share" });
  await expect(share).toBeEnabled({ timeout: 10_000 });
  const download = page.waitForEvent("download");
  await share.click();
  expect((await download).suggestedFilename()).toBe("cubehub-pb.png");

  // Starting the next solve puts the card away.
  await page.keyboard.down("Space");
  await page.keyboard.up("Space");
  await expect(card).toHaveCount(0);
});

test("clicking Ao5 copies the average as csTimer-style text", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/timer");
  await expect(scramble(page)).toBeVisible({ timeout: 60_000 });

  for (const ms of [400, 500, 600, 700, 800]) await solve(page, ms);

  await page.getByRole("button", { name: /^Copy Ao5 .* as text$/ }).click();
  await expect(page.getByText("Ao5 copied")).toBeVisible();

  const text = await page.evaluate(() => navigator.clipboard.readText());
  const lines = text.split("\n");
  expect(lines[0]).toMatch(/^3x3 Ao5: \d+\.\d{2} · CubeHub · /);
  expect(lines.slice(2)).toHaveLength(5);
  // The fastest (first) and slowest (last) solves are trimmed.
  expect(lines[2]).toMatch(/^1\. \(\d+\.\d{2}\) {3}\S/);
  expect(lines[6]).toMatch(/^5\. \(\d+\.\d{2}\) {3}\S/);
});

test("typing mode saves typed times as manual solves", async ({ page }) => {
  await page.goto("/timer");
  await expect(scramble(page)).toBeVisible({ timeout: 60_000 });

  await page.getByRole("button", { name: "Timer settings" }).click();
  await page.getByRole("radio", { name: "Typing" }).click();
  await page.keyboard.press("Escape");

  const box = page.getByLabel("Time", { exact: true });
  await expect(box).toBeVisible();
  const before = await scramble(page).getAttribute("aria-label");

  await box.fill("1234");
  await box.press("Enter");
  await expect(page.getByText("Saved 12.34")).toBeVisible();
  await expect(box).toHaveValue("");
  // The scramble is spent, so the next one is up.
  await expect(scramble(page)).not.toHaveAttribute("aria-label", before ?? "");

  await box.fill("abc");
  await box.press("Enter");
  await expect(page.getByText('"abc" isn\'t a time')).toBeVisible();

  await box.fill("15.5");
  await page.getByRole("radio", { name: "DNF" }).click();
  await box.press("Enter");
  await expect(page.getByText("Saved DNF")).toBeVisible();

  // Stored locally with source "manual" and the scrambles they were typed on.
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const data = JSON.parse(localStorage.getItem("cubehub.timer.v1") ?? "{}");
        return (data.solves ?? []).map((s: { timeMs: number; penalty: string; source?: string }) =>
          `${s.timeMs}/${s.penalty}/${s.source}`);
      }),
    )
    .toEqual(["12340/none/manual", "15500/dnf/manual"]);

  await page.reload();
  await expect(page.getByLabel("Time", { exact: true })).toBeVisible();
});

test("previous scramble comes back with the button and with ←", async ({ page }) => {
  await page.goto("/timer");
  await expect(scramble(page)).toBeVisible({ timeout: 60_000 });
  const first = await scramble(page).getAttribute("aria-label");

  await page.getByRole("button", { name: "New 3x3 scramble" }).click();
  await expect(scramble(page)).not.toHaveAttribute("aria-label", first ?? "");
  const second = await scramble(page).getAttribute("aria-label");

  await page.getByRole("button", { name: "Previous scramble" }).click();
  await expect(scramble(page)).toHaveAttribute("aria-label", first ?? "");

  // → goes forward again to the one we left, ← back once more.
  await page.keyboard.press("ArrowRight");
  await expect(scramble(page)).toHaveAttribute("aria-label", second ?? "");
  await page.keyboard.press("ArrowLeft");
  await expect(scramble(page)).toHaveAttribute("aria-label", first ?? "");
});

test("a pasted scramble is used, marked custom and saved with the solve", async ({ page }) => {
  await page.goto("/timer");
  await expect(scramble(page)).toBeVisible({ timeout: 60_000 });

  await page.getByRole("button", { name: "Enter your own scramble" }).click();
  const dialog = page.getByRole("dialog", { name: /Enter a 3x3 scramble/ });
  await dialog.getByLabel("Scramble").fill("hello!");
  await dialog.getByRole("button", { name: "Use scramble" }).click();
  await expect(dialog.getByText("That isn't valid move notation")).toBeVisible();

  await dialog.getByLabel("Scramble").fill("  R  U’ F2 ");
  await dialog.getByRole("button", { name: "Use scramble" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(scramble(page)).toHaveAttribute("aria-label", "Scramble: R U' F2");
  await expect(page.getByText("Custom scramble")).toBeVisible();

  await solve(page, 300);
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const data = JSON.parse(localStorage.getItem("cubehub.timer.v1") ?? "{}");
        return (data.solves ?? []).map((s: { scramble: string; scrambleType?: string }) => `${s.scramble}|${s.scrambleType}`);
      }),
    )
    .toEqual(["R U' F2|custom"]);

  // The next scramble is random again.
  await page.keyboard.press("ArrowRight");
  await expect(page.getByText("Custom scramble")).toHaveCount(0);
  await expect(scramble(page)).not.toHaveAttribute("aria-label", "Scramble: R U' F2");
});

test("recently deleted restores a solve, or deletes it forever", async ({ page }) => {
  await page.goto("/timer");
  await expect(scramble(page)).toBeVisible({ timeout: 60_000 });
  await solve(page, 300);
  await solve(page, 400);

  const stored = () =>
    page.evaluate(() => {
      const data = JSON.parse(localStorage.getItem("cubehub.timer.v1") ?? "{}");
      return (data.solves ?? []).map((s: { deletedAt?: string | null }) => (s.deletedAt ? "deleted" : "live"));
    });

  // D deletes the last solve (a soft delete).
  await page.keyboard.press("d");
  await expect.poll(stored).toEqual(["live", "deleted"]);

  await page.getByRole("button", { name: "Recently deleted" }).click();
  const dialog = page.getByRole("dialog", { name: /Recently deleted/ });
  await expect(dialog.getByRole("listitem")).toHaveCount(1);
  await expect(dialog).toContainText("deleted just now");
  await dialog.getByRole("button", { name: /^Restore \d/ }).click();
  await expect(dialog.getByText(/Nothing deleted/)).toBeVisible();
  await expect.poll(stored).toEqual(["live", "live"]);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);

  await page.keyboard.press("d");
  await page.getByRole("button", { name: "Recently deleted" }).click();
  await dialog.getByRole("button", { name: /forever$/ }).click();
  await dialog.getByRole("button", { name: "Delete forever" }).click();
  await expect(dialog.getByText(/Nothing deleted/)).toBeVisible();
  await expect.poll(stored).toEqual(["live"]);
});

test("inspection beeps once at the first warning and twice at the last", async ({ page }) => {
  // Count the tones the page asks Web Audio for.
  await page.addInitScript(() => {
    const w = window as unknown as { __tones: number[] };
    w.__tones = [];
    const create = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function (this: AudioContext) {
      w.__tones.push(Math.round(performance.now()));
      return create.call(this);
    };
  });
  const tones = () => page.evaluate(() => (window as unknown as { __tones: number[] }).__tones.length);

  await page.goto("/timer");
  await expect(scramble(page)).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Timer settings" }).click();
  await page.getByRole("radio", { name: "8s" }).click();
  await page.getByRole("radio", { name: "Beep" }).click();
  await page.keyboard.press("Escape");

  // Start inspection; 8s inspection warns at 4s and 6s.
  await page.keyboard.down("Space");
  await page.keyboard.up("Space");
  await page.waitForTimeout(3_000);
  expect(await tones()).toBe(0);
  await expect.poll(tones, { timeout: 2_000 }).toBe(1);
  await expect.poll(tones, { timeout: 3_000 }).toBe(3);
  await page.keyboard.press("Escape");
});
