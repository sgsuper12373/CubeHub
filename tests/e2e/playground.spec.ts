import { test, expect, type Page } from "@playwright/test";

import { KEYMAP } from "../../src/lib/playground/keymap";

/**
 * The playground in a real browser: keys and the move pad turn the cube, undo
 * and redo work, and solving a worker-generated scramble is detected. Needs no
 * account and no data.
 */

async function expectCubeReady(page: Page) {
  await expect(page.locator("twisty-player").first()).toBeAttached({ timeout: 30_000 });
  await expect(page.getByRole("status", { name: /loading cube/i })).toHaveCount(0, { timeout: 30_000 });
}

/**
 * A WCA scramble is plain face turns, so its inverse is the reverse with each
 * turn's direction flipped. (cubing is ESM-only and Playwright loads specs as
 * CommonJS, so `Alg.invert()` is not available here.)
 */
function invert(alg: string): string[] {
  return alg
    .trim()
    .split(/\s+/)
    .reverse()
    .map((m) => (m.endsWith("2") ? m : m.endsWith("'") ? m.slice(0, -1) : `${m}'`));
}

/** The key that does `move` (`R`, `U'`); a double turn is the key twice. */
function keysFor(move: string): string[] {
  const base = move.replace("2", "");
  const code = Object.keys(KEYMAP).find((c) => KEYMAP[c] === base);
  if (!code) throw new Error(`no key for ${move}`);
  return move.includes("2") ? [code, code] : [code];
}

test.describe("Playground", () => {
  test("keys and the move pad turn the cube; undo and redo", async ({ page }) => {
    await page.goto("/playground");
    await expectCubeReady(page);
    const history = page.getByTestId("playground-history");

    await page.keyboard.press("KeyI"); // R
    await page.keyboard.press("KeyJ"); // U
    await expect(history).toHaveText("R U");
    await page.getByRole("button", { name: "Turn F'" }).click();
    await expect(history).toHaveText("R U F'");
    await expect(page.getByText("3 moves")).toBeVisible();

    await page.getByRole("button", { name: "Undo" }).click();
    await expect(history).toHaveText("R U");
    await page.keyboard.press("Control+KeyY");
    await expect(history).toHaveText("R U F'");

    // Space is the timer's key, never a move. (Blur first: on a focused
    // button Space is a click, which is the browser's job, not ours.)
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press("Space");
    await expect(history).toHaveText("R U F'");
  });

  test("solving a scramble is detected", async ({ page }) => {
    await page.goto("/playground");
    await expectCubeReady(page);

    await page.getByRole("button", { name: "Scramble" }).click();
    const scrambleEl = page.locator('[aria-label^="Scramble: "]');
    await expect(scrambleEl).toBeVisible({ timeout: 30_000 });
    const scramble = ((await scrambleEl.getAttribute("aria-label")) ?? "").replace("Scramble: ", "");
    await expect(page.getByText(/^Scrambled/)).toBeVisible();

    const solution = invert(scramble);
    for (const move of solution) {
      for (const key of keysFor(move)) await page.keyboard.press(key);
    }
    await expect(page.getByText(/Solved in \d+ moves/)).toBeVisible();
  });

  test("?puzzle=222 opens the 2x2, where slice keys do nothing", async ({ page }) => {
    await page.goto("/playground?puzzle=222");
    await expectCubeReady(page);
    await expect(page.getByRole("radio", { name: "2x2" })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByRole("button", { name: "Turn M" })).toHaveCount(0);

    await page.keyboard.press("Digit5"); // M on a 3x3
    await page.keyboard.press("KeyI"); // R
    await expect(page.getByTestId("playground-history")).toHaveText("R");
  });
});
