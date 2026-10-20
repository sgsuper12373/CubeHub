import { test, expect, type Page } from "@playwright/test";

import { keysForMove, type KeyPress } from "../../src/lib/playground/keymap";

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

/** Press the keys (default notation layout) that do each move. */
async function play(page: Page, moves: string[]) {
  for (const move of moves) {
    const presses = keysForMove(move, "333");
    if (!presses) throw new Error(`no key for ${move}`);
    for (const p of presses) await page.keyboard.press(chord(p));
  }
}

function chord(p: KeyPress): string {
  return p.shiftKey ? `Shift+${p.code}` : p.code;
}

/** Scramble, and wait until it has finished turning onto the cube. */
async function scrambleIt(page: Page): Promise<string> {
  await page.getByRole("button", { name: "Scramble" }).click();
  const scrambleEl = page.locator('[aria-label^="Scramble: "]');
  await expect(scrambleEl).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/^Scrambled, /)).toBeVisible({ timeout: 10_000 });
  return ((await scrambleEl.getAttribute("aria-label")) ?? "").replace("Scramble: ", "");
}

/** Settings live in a popover in the page header. */
async function openSettings(page: Page) {
  await page.getByRole("button", { name: "Settings" }).click();
}

const TPERM = "R U R' U' R' F R2 U' R' U' R U R' F'";

test.describe("Playground", () => {
  test("keys and the move pad turn the cube; undo and redo", async ({ page }) => {
    await page.goto("/playground");
    await expectCubeReady(page);
    const history = page.getByTestId("playground-history");

    await page.keyboard.press("KeyR"); // R
    await page.keyboard.press("KeyU"); // U
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

    const scramble = await scrambleIt(page);

    await play(page, invert(scramble));
    await expect(page.getByText(/Solved in \d+ moves/)).toBeVisible();
  });

  test("a scramble is turned on move by move, and turns wait for it", async ({ page }) => {
    await page.goto("/playground");
    await expectCubeReady(page);
    const history = page.getByTestId("playground-history");

    await page.getByRole("button", { name: "Scramble" }).click();
    await expect(page.getByText("Scrambling…").first()).toBeVisible({ timeout: 30_000 });
    await page.keyboard.press("KeyR");
    await expect(page.getByRole("button", { name: "Turn R", exact: true })).toBeDisabled();
    await expect(page.getByText(/^Scrambled, 0 moves/)).toBeVisible({ timeout: 10_000 });
    await expect(history).toHaveText(/Turn the cube to start/);

    await page.keyboard.press("KeyR");
    await expect(history).toHaveText("R");
  });

  test("Enter scrambles, but not while a button or the alg box has focus", async ({ page }) => {
    await page.goto("/playground");
    await expectCubeReady(page);
    const scrambleEl = page.locator('[aria-label^="Scramble: "]');

    await page.getByRole("textbox", { name: "Algorithm" }).fill("R");
    await page.getByRole("textbox", { name: "Algorithm" }).press("Enter"); // sets up the case
    await expect(page.getByText(/^Case set up/)).toBeVisible({ timeout: 30_000 });
    await expect(scrambleEl).toHaveCount(0);

    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press("Enter");
    await expect(page.getByText(/^Scrambled, 0 moves/)).toBeVisible({ timeout: 30_000 });
    const first = await scrambleEl.getAttribute("aria-label");

    // On a focused button, Enter presses that button instead.
    const practice = page.getByRole("button", { name: "Practice" });
    await practice.focus();
    await page.keyboard.press("Enter");
    await expect(practice).toHaveAttribute("aria-pressed", "true");
    await page.waitForTimeout(500);
    expect(await scrambleEl.getAttribute("aria-label")).toBe(first);
  });

  test("phones: the cube, buttons and a compact pad fit above the bottom nav", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/playground");
    await expectCubeReady(page);
    const pad = page.getByRole("tabpanel", { name: "Move pad" });
    const nav = page.locator("nav.fixed");
    const padBox = await pad.boundingBox();
    const navBox = await nav.boundingBox();
    expect(padBox && navBox && padBox.y + padBox.height <= navBox.y).toBe(true);

    await page.getByRole("button", { name: "Turn U'" }).click();
    await page.getByRole("tab", { name: "Slices & wide" }).click();
    await page.getByRole("button", { name: "Turn M2" }).click();
    await page.getByRole("tab", { name: "Rotations" }).click();
    await page.getByRole("button", { name: "Turn y", exact: true }).click();
    await expect(page.getByTestId("playground-history")).toHaveText("U' M2 y");

    // A 2x2 has no slices tab.
    await page.getByRole("radio", { name: "2x2" }).click();
    await expect(page.getByRole("tab", { name: "Slices & wide" })).toHaveCount(0);
  });

  test("with Animate scrambles off, a scramble is on at once", async ({ page }) => {
    await page.goto("/playground");
    await expectCubeReady(page);
    await openSettings(page);
    await page.getByRole("checkbox", { name: "Animate scrambles" }).uncheck();
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Scramble" }).click();
    await expect(page.getByText(/^Scrambled, 0 moves/)).toBeVisible({ timeout: 30_000 });
    await page.keyboard.press("KeyR");
    await expect(page.getByTestId("playground-history")).toHaveText("R");
  });

  test("?puzzle=222 opens the 2x2, where slice keys do nothing", async ({ page }) => {
    await page.goto("/playground?puzzle=222");
    await expectCubeReady(page);
    await expect(page.getByRole("radio", { name: "2x2" })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByRole("button", { name: "Turn M" })).toHaveCount(0);

    await page.keyboard.press("KeyM"); // M on a 3x3
    await page.keyboard.press("KeyR"); // R
    await expect(page.getByTestId("playground-history")).toHaveText("R");
  });

  test("Shift gives the prime turn; custom keys can be bound and are remembered", async ({ page }) => {
    await page.goto("/playground");
    await expectCubeReady(page);
    const history = page.getByTestId("playground-history");

    await page.keyboard.press("Shift+KeyR");
    await expect(history).toHaveText("R'");

    // Bind I to R, as on csTimer.
    await page.keyboard.press("Shift+Slash");
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Edit keys" }).click();
    await dialog.getByRole("button", { name: "Add a key for R", exact: true }).click();
    await page.keyboard.press("KeyI");
    await expect(dialog.getByRole("button", { name: "Remove I from R", exact: true })).toBeVisible();
    // Space can't be bound.
    await dialog.getByRole("button", { name: "Add a key for U", exact: true }).click();
    await page.keyboard.press("Space");
    await expect(dialog.getByRole("status")).toContainText("reserved");
    await page.keyboard.press("Escape"); // stop listening
    await dialog.getByRole("button", { name: "Done" }).click();
    await page.keyboard.press("Escape"); // close
    await expect(dialog).toHaveCount(0);

    await page.keyboard.press("KeyI");
    await expect(history).toHaveText("R' R");

    await page.reload();
    await expectCubeReady(page);
    await openSettings(page);
    await expect(page.getByText("Using your custom keys.")).toBeVisible();
    await page.keyboard.press("Escape");
    await page.keyboard.press("KeyI");
    await expect(page.getByTestId("playground-history")).toHaveText("R");

    // Reset brings the defaults back.
    await page.keyboard.press("Shift+Slash");
    await page.getByRole("button", { name: "Reset to default" }).click();
    await page.keyboard.press("Escape");
    await page.keyboard.press("KeyI");
    await expect(page.getByTestId("playground-history")).toHaveText("R");
  });

  test("an alg sets up its case, and doing the alg solves it", async ({ page }) => {
    await page.goto("/playground");
    await expectCubeReady(page);

    await page.getByRole("textbox", { name: "Algorithm" }).fill(TPERM);
    await page.getByRole("button", { name: "Set up case" }).click();
    await expect(page.getByText(/^Case set up/)).toBeVisible();

    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByText(/Solved in 14 moves/)).toBeVisible();
  });

  test("a bad alg says why instead of turning the cube", async ({ page }) => {
    await page.goto("/playground");
    await expectCubeReady(page);
    await page.getByRole("textbox", { name: "Algorithm" }).fill("R U %");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByText(/Couldn't read/)).toBeVisible();
    await expect(page.getByTestId("playground-history")).toHaveText(/Turn the cube to start/);
  });

  test("?case= opens with that case set up, ready to solve", async ({ page }) => {
    await page.goto(`/playground?case=${encodeURIComponent("R U R' U'")}`);
    await expectCubeReady(page);
    await expect(page.getByText(/^Case set up/)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("textbox", { name: "Algorithm" })).toHaveValue("R U R' U'");

    await play(page, ["R", "U", "R'", "U'"]);
    await expect(page.getByText(/Solved in 4 moves/)).toBeVisible();
  });

  test("practice mode times a solve from the first turn", async ({ page }) => {
    await page.goto("/playground");
    await expectCubeReady(page);

    await openSettings(page);
    await page.getByRole("checkbox", { name: "15s inspection in practice" }).uncheck();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Practice" }).click();
    const scramble = await scrambleIt(page);
    const timer = page.getByTestId("practice-timer");
    await expect(timer).toContainText("starts on your first turn");

    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await play(page, invert(scramble));
    await expect(timer).toContainText(/\d+ moves · [\d.]+ TPS/);
    await expect(timer.getByRole("button", { name: "Replay solve" })).toBeVisible();
  });
});

test.describe("Learn → Playground", () => {
  test("a case card's Try it opens the playground with that case set up", async ({ page }) => {
    await page.goto("/learn/333/pll");
    const tryIt = page.getByRole("button", { name: "Try it" }).first();
    // Needs seeded algorithm data, which CI doesn't have (see drill.spec.ts).
    const hasData = await tryIt
      .waitFor({ timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
    test.skip(!hasData, "no seeded algorithm data");

    await tryIt.click();
    await expect(page).toHaveURL(/\/playground\?puzzle=333&case=/);
    await expectCubeReady(page);
    await expect(page.getByText(/^Case set up/)).toBeVisible({ timeout: 30_000 });
  });
});
