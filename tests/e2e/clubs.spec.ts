import { test, expect, type Browser, type Page } from "@playwright/test";

import { E2E_USERS, hasE2eUsers } from "./users";

/**
 * Clubs step 2 end to end, with two real accounts: create a private club,
 * request and approve, ban and unban, switch to public, join and leave, then
 * delete. The database rules are covered by supabase/tests/clubs_test.sql.
 *
 * Writes to the real database, so every club it makes is named "E2E Club …"
 * and deleted again; leftovers from a failed run are deleted first.
 */

test.skip(!hasE2eUsers(), "E2E_USER_A/B credentials not set");
test.describe.configure({ mode: "serial" });
// Two signed-in browsers and ~25 server round trips: well past the 30s default.
test.setTimeout(120_000);

const NAME = `E2E Club ${Date.now().toString(36)}`;

async function signedIn(browser: Browser, id: "a" | "b"): Promise<Page> {
  const ctx = await browser.newContext({
    storageState: E2E_USERS.find((u) => u.id === id)!.state,
    viewport: { width: 1280, height: 900 },
  });
  return ctx.newPage();
}

/** The type, tag and visibility inputs are sr-only inside their labels; click the label like a person would. */
async function pick(page: Page, role: "radio" | "checkbox", name: string | RegExp) {
  await page.getByRole(role, { name }).locator("xpath=ancestor::label[1]").click();
  await expect(page.getByRole(role, { name })).toBeChecked();
}

async function confirmDialog(page: Page, label: string) {
  await page.getByRole("alertdialog").getByRole("button", { name: label }).click();
}

/** Deletes a club A owns, through the manage page. */
async function deleteClub(page: Page, slug: string, name: string) {
  await page.goto(`/clubs/${slug}/manage`);
  await page.getByLabel(/Type .* to confirm/).fill(name);
  await page.getByRole("button", { name: "Delete club" }).click();
  await expect(page).toHaveURL(/\/clubs$/);
}

test("private club: create, request, approve, ban, unban, go public, join, leave, delete", async ({ browser }) => {
  const a = await signedIn(browser, "a");
  const b = await signedIn(browser, "b");

  // Start clean: no blocks between the accounts (an interrupted social spec
  // can leave one, and a block hides members from each other)…
  for (const page of [a, b]) {
    await page.goto("/settings");
    while (await page.getByRole("button", { name: "Unblock" }).first().isVisible()) {
      await page.getByRole("button", { name: "Unblock" }).first().click();
      await confirmDialog(page, "Unblock");
      await page.waitForLoadState("networkidle");
    }
  }

  // …and no clubs from an earlier failed run (A can own only 3).
  await a.goto("/clubs?q=E2E+Club");
  const leftovers = await a
    .getByRole("link", { name: /^E2E Club / })
    .evaluateAll((links) => [...new Set(links.map((l) => l.getAttribute("href")!))]);
  for (const href of leftovers) {
    const slug = href.split("/").pop()!;
    await a.goto(`/clubs/${slug}`);
    if (await a.getByRole("link", { name: /Manage/ }).isVisible()) {
      const name = (await a.getByRole("heading", { level: 1 }).textContent())!.trim();
      await deleteClub(a, slug, name);
    }
  }

  // ── A creates a private club ─────────────────────────────────────────────
  await a.goto("/clubs/new");
  await a.getByLabel("Name").fill(NAME);
  await a.getByLabel("Description").fill("Made by the e2e test. Deleted at the end.");
  await pick(a, "radio", "Online");
  await pick(a, "checkbox", "3x3");
  await pick(a, "radio", /Private/);
  await a.getByRole("button", { name: "Create club" }).click();
  await expect(a).toHaveURL(/\/clubs\/e2e-club-[a-z0-9-]+$/);
  const slug = a.url().split("/").pop()!;
  await expect(a.getByRole("heading", { level: 1, name: NAME })).toBeVisible();
  await expect(a.getByText("You're the owner")).toBeVisible();

  // ── B finds it, sees nothing inside, and asks to join ───────────────────
  await b.goto(`/clubs?q=${encodeURIComponent(NAME)}`);
  await b.getByRole("link", { name: new RegExp(NAME) }).click();
  await expect(b.getByText("This club is private")).toBeVisible();
  await expect(b.getByRole("link", { name: "Members" })).toHaveCount(0);
  await b.getByRole("button", { name: "Request to join" }).click();
  await b.getByLabel("Message to the club's admins").fill("Hi from the e2e test");
  await b.getByRole("button", { name: "Send request" }).click();
  await expect(b.getByRole("button", { name: "Requested" })).toBeVisible();

  // ── A approves ───────────────────────────────────────────────────────────
  await a.reload();
  await expect(a.getByRole("link", { name: /Manage\s*1/ })).toBeVisible();
  await a.goto(`/clubs/${slug}/manage`);
  const requests = a.getByRole("region", { name: "Join requests" });
  await expect(requests.getByText("Hi from the e2e test")).toBeVisible();
  await requests.getByRole("button", { name: "Approve" }).click();
  await expect(a.getByRole("region", { name: "Members" }).getByRole("listitem")).toHaveCount(2);

  // ── B is in: members and activity are visible ───────────────────────────
  await b.reload();
  await expect(b.getByRole("button", { name: "Leave" })).toBeVisible();
  await b.getByRole("link", { name: "Members" }).click();
  await expect(b.getByRole("region", { name: "Owner" }).getByRole("listitem")).toHaveCount(1);
  await b.getByRole("link", { name: "Activity" }).click();
  await expect(b.getByText(/solves this week/)).toBeVisible();

  // ── A bans B, then unbans ────────────────────────────────────────────────
  await a.reload();
  await a.getByRole("button", { name: /^Manage / }).click();
  await a.getByRole("menuitem", { name: "Ban" }).click();
  await confirmDialog(a, "Ban");
  const banned = a.getByRole("region", { name: "Banned" });
  await expect(banned.getByRole("listitem")).toHaveCount(1);

  await b.goto(`/clubs/${slug}`);
  await expect(b.getByText("This club is private")).toBeVisible();

  await banned.getByRole("button", { name: "Unban" }).click();
  await expect(a.getByRole("region", { name: "Banned" })).toHaveCount(0);

  // ── A makes it public; B joins and leaves ────────────────────────────────
  await pick(a, "radio", /Public/);
  await a.getByRole("button", { name: "Save changes" }).click();
  await expect(a.getByText("Settings saved.")).toBeVisible();

  await b.goto(`/clubs/${slug}`);
  await b.getByRole("button", { name: "Join" }).click();
  await expect(b.getByRole("alertdialog")).toContainText("solves you do each week");
  await confirmDialog(b, "Join");
  await expect(b.getByRole("button", { name: "Leave" })).toBeVisible();
  await b.getByRole("button", { name: "Leave" }).click();
  await confirmDialog(b, "Leave");
  await expect(b.getByRole("button", { name: "Join" })).toBeVisible();

  // ── A deletes it ─────────────────────────────────────────────────────────
  await deleteClub(a, slug, NAME);
  await a.goto(`/clubs/${slug}`);
  await expect(a.getByText(/not found|doesn't exist/i).first()).toBeVisible();
});
