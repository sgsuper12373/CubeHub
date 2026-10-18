import { test, expect, type Page } from "@playwright/test";

/**
 * Stats, signed out: everything runs over local storage, so each test seeds
 * its own solves and needs no Supabase data.
 */

const KEY = "cubehub.timer.v1";

/** Local storage as the timer leaves it: sessions and solves for 3x3. */
async function seed(page: Page, sessions: { id: string; name: string; active: boolean; times: number[] }[]) {
  const data = {
    misstopsChecked: true,
    sessions: sessions.map((s, i) => ({ id: s.id, puzzle: "333", name: s.name, isActive: s.active, orderIndex: i })),
    solves: sessions.flatMap((s, si) =>
      s.times.map((ms, i) => ({
        id: `${s.id}-${i}`,
        sessionId: s.id,
        puzzle: "333",
        timeMs: ms,
        penalty: "none",
        effectiveTimeMs: null,
        scramble: "R U R' U'",
        notes: null,
        createdAt: new Date(Date.now() - (si * 100 + (s.times.length - i)) * 60_000).toISOString(),
      })),
    ),
  };
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [KEY, JSON.stringify(data)] as const);
}

test("a new cuber sees one onboarding panel, not a card per chart", async ({ page }) => {
  await page.goto("/stats");
  await expect(page.getByRole("heading", { name: "Time 5 3x3 solves to unlock your stats" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open the timer" })).toHaveAttribute("href", "/timer");
  await expect(page.getByRole("button", { name: "Import from csTimer" })).toBeVisible();
  // No chart cards, and no range filter to fiddle with yet.
  await expect(page.getByText("Times over time")).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Range" })).toHaveCount(0);
  await expect(page.getByRole("radio", { name: "3x3, 0 solves" })).toBeChecked();
});

test("event pills show solve counts; This session narrows to the active session", async ({ page }) => {
  await seed(page, [
    { id: "a0000000-0000-4000-8000-000000000001", name: "Old", active: false, times: [21000, 22000, 23000, 24000] },
    { id: "a0000000-0000-4000-8000-000000000002", name: "Now", active: true, times: [19000, 20000] },
  ]);
  await page.goto("/stats");
  await expect(page.getByRole("radio", { name: "3x3, 6 solves" })).toBeChecked();
  await expect(page.getByRole("radio", { name: "2x2, 0 solves" })).toBeVisible();
  await expect(page.getByText("6 solves in this range")).toBeVisible();

  await page.getByRole("group", { name: "Range" }).getByRole("button", { name: "This session" }).click();
  await expect(page.getByText("2 solves in this range")).toBeVisible();

  // Another event with no solves: the onboarding panel for it.
  await page.getByRole("radio", { name: "2x2, 0 solves" }).click();
  await expect(page.getByRole("heading", { name: "Time 5 2x2 solves to unlock your stats" })).toBeVisible();
});

test("import and export live in the ⋯ menu; import previews before writing", async ({ page }) => {
  await seed(page, [
    { id: "a0000000-0000-4000-8000-000000000003", name: "Main", active: true, times: [20000, 21000, 22000, 23000, 24000] },
  ]);
  await page.goto("/stats");
  await expect(page.getByRole("radio", { name: "3x3, 5 solves" })).toBeChecked();

  await page.getByRole("button", { name: "Import and export" }).click();
  await expect(page.getByRole("menuitem", { name: "Export 3x3 as CSV" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Export 3x3 as JSON" })).toBeVisible();
  await page.keyboard.press("Escape");

  // A csTimer export with three solves.
  const cstimer = JSON.stringify({
    session1: [
      [[0, 15320], "R U R' U'", "", 1700000000],
      [[0, 14200], "F R U", "", 1700000050],
      [[0, 16000], "D2 L2", "", 1700000100],
    ],
  });
  await page.getByTestId("import-file").setInputFiles({
    name: "cstimer.txt",
    mimeType: "text/plain",
    buffer: Buffer.from(cstimer),
  });
  const dialog = page.getByRole("dialog", { name: "Import 3 solves into 3x3?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Import 3" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("radio", { name: "3x3, 8 solves" })).toBeChecked();
});
