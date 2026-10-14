import { test, expect, type Browser, type Page } from "@playwright/test";

import { E2E_USERS, hasE2eUsers } from "./users";

/**
 * Follows, notifications, compare and block, with two real signed-in
 * accounts. Private-profile requests and the database rules behind all of
 * this are covered by supabase/tests/social_test.sql.
 */

test.skip(!hasE2eUsers(), "E2E_USER_A/B credentials not set");
test.describe.configure({ mode: "serial" });

async function signedIn(browser: Browser, id: "a" | "b"): Promise<{ page: Page; username: string }> {
  const ctx = await browser.newContext({
    storageState: E2E_USERS.find((u) => u.id === id)!.state,
    viewport: { width: 1280, height: 800 },
  });
  const page = await ctx.newPage();
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/profile\/[A-Za-z0-9_]+$/);
  const username = new URL(page.url()).pathname.split("/").pop()!;
  return { page, username };
}

/** Clicks through the confirm dialog that guards unfollow, block and so on. */
async function confirmDialog(page: Page, label: string) {
  await page.getByRole("alertdialog").getByRole("button", { name: label }).click();
}

test("follow, get notified, compare, unfollow", async ({ browser }) => {
  const a = await signedIn(browser, "a");
  const b = await signedIn(browser, "b");

  await a.page.goto(`/profile/${b.username}`);
  // Start clean if an earlier run left a follow behind.
  const following = a.page.getByRole("button", { name: /^(Following|Requested)$/ });
  if (await following.isVisible()) {
    const label = (await following.textContent())?.includes("Requested") ? "Cancel request" : "Unfollow";
    await following.click();
    await confirmDialog(a.page, label);
  }

  await a.page.getByRole("button", { name: /^(Follow|Follow back)$/ }).click();
  await expect(a.page.getByRole("button", { name: /^(Following|Requested)$/ })).toBeVisible();

  // B hears about it.
  await b.page.goto("/timer");
  await expect(b.page.getByRole("button", { name: /Notifications, \d+ unread/ })).toBeVisible();
  await b.page.getByRole("button", { name: /Notifications/ }).click();
  await expect(b.page.getByText(/started following you|asked to follow you/).first()).toBeVisible();

  // A private B gets a request instead; accept it so the rest runs either way.
  await b.page.goto("/people?tab=requests");
  const accept = b.page.getByRole("button", { name: "Accept" });
  if (await accept.first().isVisible()) await accept.first().click();

  await a.page.goto(`/profile/${b.username}/compare`);
  await expect(a.page.getByRole("heading", { name: /Head to head/i })).toBeVisible();

  await a.page.goto(`/profile/${b.username}`);
  await a.page.getByRole("button", { name: "Following" }).click();
  await confirmDialog(a.page, "Unfollow");
  await expect(a.page.getByRole("button", { name: /^(Follow|Follow back)$/ })).toBeVisible();
});

test("block hides each profile from the other; unblock in Settings", async ({ browser }) => {
  const a = await signedIn(browser, "a");
  const b = await signedIn(browser, "b");

  await a.page.goto(`/profile/${b.username}`);
  await a.page.getByRole("button", { name: "More actions" }).click();
  await a.page.getByRole("menuitem", { name: "Block" }).click();
  await confirmDialog(a.page, "Block");
  await expect(a.page).toHaveURL(/\/friends/);

  const res = await b.page.goto(`/profile/${a.username}`);
  expect(res?.status()).toBe(404);

  await a.page.goto("/settings");
  await a.page.getByRole("button", { name: "Unblock" }).first().click();
  await confirmDialog(a.page, "Unblock");
  await expect(a.page.getByText("You haven't blocked anyone")).toBeVisible();

  const again = await b.page.goto(`/profile/${a.username}`);
  expect(again?.status()).toBe(200);
});

test("People opens its tabs and finds the other account as you type", async ({ browser }) => {
  const a = await signedIn(browser, "a");
  const b = await signedIn(browser, "b");
  for (const [tab, text] of [
    ["feed", /Activity/],
    ["find", /Find people/],
  ] as const) {
    await a.page.goto(`/people?tab=${tab}`);
    await expect(a.page.getByRole("link", { name: text })).toHaveAttribute("aria-current", "page");
  }
  // No Enter: results arrive a moment after typing stops.
  await a.page.getByLabel("Search cubers").fill(b.username);
  await expect(a.page.getByRole("link", { name: new RegExp(`@${b.username}`) })).toBeVisible();
});

test("the old /friends address lands on People", async ({ browser }) => {
  const a = await signedIn(browser, "a");
  await a.page.goto("/friends?tab=find");
  await expect(a.page).toHaveURL(/\/people\?tab=find/);
});
