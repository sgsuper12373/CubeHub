import { test, expect, type Page } from "@playwright/test";

/**
 * Stats, signed out: everything runs over local storage, so each test seeds
 * its own solves and needs no Supabase data.
 */

const KEY = "cubehub.timer.v1";

/** Local storage as the timer leaves it: sessions and solves for 3x3. */
async function seed(
  page: Page,
  sessions: { id: string; name: string; active: boolean; times: number[]; daysAgo?: number }[],
) {
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
        createdAt: new Date(
          Date.now() - (s.daysAgo ?? 0) * 86_400_000 - (si * 100 + (s.times.length - i)) * 60_000,
        ).toISOString(),
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

test("Now strip, PB solves and what the next solve needs", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await seed(page, [
    // 40 days ago: Ao5 25.00.
    { id: "a0000000-0000-4000-8000-000000000004", name: "Old", active: false, daysAgo: 40, times: [25000, 25000, 25000, 25000, 25000] },
    // Now, oldest first: Ao5 = mean(21, 22, 23) = 22.00.
    { id: "a0000000-0000-4000-8000-000000000005", name: "Now", active: true, times: [20000, 21000, 22000, 23000, 24000] },
  ]);
  await page.goto("/stats");

  const nowStrip = page.getByRole("region", { name: "Now" });
  await expect(nowStrip).toContainText("22.00");
  await expect(nowStrip).toContainText("down 3.00 s");
  await expect(nowStrip).toContainText("Needs 12 solves");

  // What the next solve needs, in the active session: under the 20.00 single;
  // the Ao5 can't improve (a fast fifth is trimmed, leaving 22.00 again).
  const single = page.getByRole("button", { name: /^Single personal best 20\.00/ });
  await expect(single).toContainText("Next: < 20.00");
  const ao5 = page.getByRole("button", { name: /^Ao5 personal best 22\.00/ });
  await expect(ao5).toContainText("Next: N/A");

  await ao5.click();
  const dialog = page.getByRole("dialog", { name: "3x3 Ao5 22.00" });
  await expect(dialog).toBeVisible();
  const rows = dialog.getByTestId("pb-solves").getByRole("listitem");
  await expect(rows).toHaveCount(5);
  await expect(rows.first()).toContainText("(20.00)");
  await expect(rows.last()).toContainText("(24.00)");

  await dialog.getByRole("button", { name: "Copy as text" }).click();
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text.split("\n")[0]).toMatch(/^3x3 Ao5: 22\.00 · CubeHub · /);
});

test("trend chart: stars, hollow mis-stops, open a solve, by date, drag to zoom", async ({ page }) => {
  const sessionId = "a0000000-0000-4000-8000-000000000006";
  const times = [22000, 21000, 23000, 20000, 24000, 22500, 21500, 23500, 20500, 22000];
  const solves = times.map((ms, i) => ({
    id: `t-${i}`,
    sessionId,
    puzzle: "333",
    timeMs: ms,
    penalty: "none",
    effectiveTimeMs: null,
    scramble: "R U R' U'",
    notes: null,
    createdAt: new Date(Date.now() - (times.length - i + 1) * 3_600_000).toISOString(),
  }));
  // The newest solve: a flagged mis-stop.
  solves.push({
    ...solves[0],
    id: "t-misstop",
    timeMs: 400,
    createdAt: new Date(Date.now() - 60_000).toISOString(),
    // @ts-expect-error extra fields on the seeded solve
    excluded: true,
    excludedReason: "auto_misstop",
  });
  const data = {
    misstopsChecked: true,
    sessions: [{ id: sessionId, puzzle: "333", name: "Main", isActive: true, orderIndex: 0 }],
    solves,
  };
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [KEY, JSON.stringify(data)] as const);
  await page.goto("/stats");

  const chart = page.getByTestId("trend-chart");
  await expect(chart).toBeVisible();
  await expect(page.getByTestId("trend-misstop")).toHaveCount(1);
  await expect(page.getByTestId("trend-pb-single")).toHaveCount(1);

  // Keyboard: focus starts on the newest point (the mis-stop); Enter opens it.
  await chart.focus();
  await page.keyboard.press("Enter");
  const counts = page.getByRole("switch", { name: /Counts for records/ });
  await expect(counts).not.toBeChecked();
  await expect(page.getByText(/looks like a mis-stop/)).toBeVisible();
  await counts.check();
  await expect(counts).toBeChecked();
  await page.getByRole("button", { name: "Close" }).first().click();
  // Counted now: no hollow point, and it's the new single PB.
  await expect(page.getByTestId("trend-misstop")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Single personal best 0\.40/ })).toBeVisible();

  await page.getByRole("group", { name: "X axis" }).getByRole("button", { name: "By date" }).click();
  await expect(chart).toBeVisible();

  // Drag across the left half to zoom in, then reset.
  const box = (await chart.boundingBox())!;
  await page.mouse.move(box.x + 50, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height / 2, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByRole("button", { name: "Reset zoom" })).toBeVisible();
  await expect(page.getByText(/solves in view/)).toBeVisible();
  await page.getByRole("button", { name: "Reset zoom" }).click();
  await expect(page.getByRole("button", { name: "Reset zoom" })).toHaveCount(0);
});
