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
    // Invite links are copied to the clipboard; the invite test reads them back.
    permissions: ["clipboard-read", "clipboard-write"],
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
  // The navbar's Clubs section is lit on club pages.
  await expect(a.getByRole("navigation").getByRole("link", { name: "Clubs" })).toHaveAttribute("aria-current", "page");
  // A's bell names the club and links to its manage page.
  await a.getByRole("button", { name: /^Notifications/ }).click();
  await expect(a.getByRole("link", { name: new RegExp(`asked to join ${NAME}`) })).toHaveAttribute(
    "href",
    `/clubs/${slug}/manage`,
  );
  await a.keyboard.press("Escape");
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

test("posts: text, algorithm and video; edit, pin, delete; outsiders read a public club", async ({ browser }) => {
  const a = await signedIn(browser, "a");
  const b = await signedIn(browser, "b");
  const name = `E2E Club posts ${Date.now().toString(36)}`;

  // A makes a public club; B joins.
  await a.goto("/clubs/new");
  await a.getByLabel("Name").fill(name);
  await pick(a, "radio", "City");
  await a.getByRole("button", { name: "Create club" }).click();
  await expect(a).toHaveURL(/\/clubs\/e2e-club-posts-[a-z0-9-]+$/);
  const slug = a.url().split("/").pop()!;

  await b.goto(`/clubs/${slug}`);
  await b.getByRole("button", { name: "Join" }).click();
  await confirmDialog(b, "Join");
  await expect(b.getByRole("button", { name: "Leave" })).toBeVisible();

  // Posts count toward 10 a day per account, across every run: A posts one
  // and B two, so the spec can run 5 times a day before hitting the limit.
  const aFeed = a.getByRole("region", { name: "Posts" });
  const feed = b.getByRole("region", { name: "Posts" });
  const aComposer = a.getByRole("form", { name: "New post" });
  const composer = b.getByRole("form", { name: "New post" });

  // A: text, kept as typed with its line break.
  await a.reload();
  await aComposer.getByLabel("Post text").fill("Meetup on Sunday?\nBring your cubes.");
  await aComposer.getByRole("button", { name: "Post" }).click();
  await expect(aFeed.getByText("Meetup on Sunday?")).toBeVisible();

  // B: bad notation is refused before posting, then a good algorithm.
  await b.reload();
  await composer.getByRole("tab", { name: "Algorithm" }).click();
  await composer.getByLabel("Algorithm").fill("R U Q");
  await composer.getByRole("button", { name: "Post" }).click();
  await expect(composer.getByRole("alert")).toContainText("standard notation");
  await composer.getByLabel("Algorithm").fill("R U R' U R U2 R'");
  await composer.getByLabel(/Caption/).fill("Sune");
  await composer.getByRole("button", { name: "Post" }).click();
  await expect(feed.getByText("R U R' U R U2 R'", { exact: true })).toBeVisible();
  await feed.getByRole("button", { name: "Show on cube" }).click();
  await expect(feed.locator("twisty-player")).toHaveCount(1, { timeout: 15_000 });

  // B: other video sites are refused; YouTube shows a thumbnail.
  await composer.getByRole("tab", { name: "Video" }).click();
  await composer.getByLabel("Video link").fill("https://vimeo.com/123");
  await composer.getByRole("button", { name: "Post" }).click();
  await expect(composer.getByRole("alert")).toContainText("YouTube and Instagram");
  await composer.getByLabel("Video link").fill("https://youtu.be/dQw4w9WgXcQ");
  await composer.getByRole("button", { name: "Post" }).click();
  await expect(feed.getByRole("button", { name: "Play YouTube video" })).toBeVisible();
  // On A's post, B can only report: no edit, pin or delete.
  await feed.getByRole("listitem").filter({ hasText: "Meetup on Sunday?" }).getByRole("button", { name: "Post actions" }).click();
  await expect(b.getByRole("menuitem")).toHaveText(["Report"]);
  await b.keyboard.press("Escape");

  // A edits the text post within 15 minutes.
  await a.reload();
  const textPost = aFeed.getByRole("listitem").filter({ hasText: "Meetup on Sunday?" });
  await textPost.getByRole("button", { name: "Post actions" }).click();
  await a.getByRole("menuitem", { name: "Edit" }).click();
  const editForm = aFeed.getByRole("form", { name: "Edit post" });
  await editForm.getByLabel("Post text").fill("Meetup on Saturday instead.");
  await editForm.getByRole("button", { name: "Save" }).click();
  await expect(aFeed.getByRole("listitem").filter({ hasText: "Meetup on Saturday instead." })).toContainText("edited");

  // A pins it and deletes B's video.
  await aFeed.getByRole("listitem").filter({ hasText: "Saturday instead" }).getByRole("button", { name: "Post actions" }).click();
  await a.getByRole("menuitem", { name: "Pin as announcement" }).click();
  await expect(aFeed.getByRole("listitem").first()).toContainText("Pinned");
  await expect(aFeed.getByRole("listitem").first()).toContainText("Saturday instead");

  // B reacts to A's post, takes one back, and comments.
  await b.reload();
  const bPinned = feed.getByRole("listitem").filter({ hasText: "Saturday instead" }).first();
  await bPinned.getByRole("button", { name: /^Fire, 0$/ }).click();
  await expect(bPinned.getByRole("button", { name: /^Fire, 1$/ })).toHaveAttribute("aria-pressed", "true");
  await bPinned.getByRole("button", { name: /^Clap, 0$/ }).click();
  await bPinned.getByRole("button", { name: /^Clap, 1$/ }).click();
  await expect(bPinned.getByRole("button", { name: /^Clap, 0$/ })).toHaveAttribute("aria-pressed", "false");
  await bPinned.getByLabel("Write a comment").fill("Count me in!");
  await bPinned.getByLabel("Write a comment").press("Enter");
  await expect(bPinned.getByRole("region", { name: "Comments" })).toContainText("Count me in!");

  // B reports A's post (reports go with the club when it's deleted).
  await bPinned.getByRole("button", { name: "Post actions" }).click();
  await b.getByRole("menuitem", { name: "Report" }).click();
  await b.getByRole("dialog").getByLabel("Spam or scam").check();
  await b.getByRole("dialog").getByRole("button", { name: "Send report" }).click();
  await expect(b.getByText("Thanks. We'll take a look.")).toBeVisible();

  // A sees it all, is notified of the comment, and deletes it as the owner.
  await a.reload();
  const aPinned = aFeed.getByRole("listitem").filter({ hasText: "Saturday instead" }).first();
  await expect(aPinned.getByRole("button", { name: /^Fire, 1$/ })).toHaveAttribute("aria-pressed", "false");
  await expect(a.getByRole("button", { name: /Notifications, \d+ unread/ })).toBeVisible();
  const comment = aPinned.getByRole("region", { name: "Comments" }).getByRole("listitem").filter({ hasText: "Count me in!" });
  await comment.getByRole("button", { name: "Delete" }).click();
  await confirmDialog(a, "Delete");
  await expect(aPinned.getByRole("region", { name: "Comments" })).not.toContainText("Count me in!");

  await aFeed
    .getByRole("listitem")
    .filter({ has: a.getByRole("button", { name: "Play YouTube video" }) })
    .getByRole("button", { name: "Post actions" })
    .click();
  await a.getByRole("menuitem", { name: "Delete" }).click();
  await confirmDialog(a, "Delete");
  await expect(aFeed.getByRole("button", { name: "Play YouTube video" })).toHaveCount(0);

  // Signed out: a public club's posts are readable, with no composer.
  const anon = await (await browser.newContext()).newPage();
  await anon.goto(`/clubs/${slug}`);
  await expect(anon.getByText("Saturday instead")).toBeVisible();
  await expect(anon.getByRole("form", { name: "New post" })).toHaveCount(0);
  // Counts are visible, but outsiders can't react or comment.
  await expect(anon.getByRole("button", { name: /^Fire, 1$/ })).toBeDisabled();
  await expect(anon.getByLabel("Write a comment")).toHaveCount(0);

  await deleteClub(a, slug, name);
});

test("invite links: preview signed out, join a private club, used up, revoked", async ({ browser }) => {
  const a = await signedIn(browser, "a");
  const b = await signedIn(browser, "b");
  const name = `E2E Club invite ${Date.now().toString(36)}`;

  await a.goto("/clubs/new");
  await a.getByLabel("Name").fill(name);
  await pick(a, "radio", "School");
  await pick(a, "radio", /Private/);
  await a.getByRole("button", { name: "Create club" }).click();
  await expect(a).toHaveURL(/\/clubs\/e2e-club-invite-[a-z0-9-]+$/);
  const slug = a.url().split("/").pop()!;

  // A makes a single-use link; it's copied to the clipboard.
  await a.goto(`/clubs/${slug}/manage`);
  await a.getByLabel("Max uses").fill("1");
  await a.getByRole("button", { name: "Make invite link" }).click();
  const links = a.getByRole("list", { name: "Invite links" });
  await expect(links.getByRole("listitem")).toHaveCount(1);
  await expect(links).toContainText("0 uses of 1");
  const url = await a.evaluate(() => navigator.clipboard.readText());
  expect(url).toMatch(/\/clubs\/join\/[0-9a-f]{64}$/);
  const path = new URL(url).pathname;

  // Signed out: the club is shown, and they're asked to sign in.
  const anon = await (await browser.newContext()).newPage();
  await anon.goto(path);
  await expect(anon.getByRole("heading", { name })).toBeVisible();
  await expect(anon.getByRole("link", { name: "Sign in to join" })).toHaveAttribute("href", `/login?next=${encodeURIComponent(path)}`);

  // B joins the private club through the link.
  await b.goto(path);
  await b.getByRole("button", { name: `Join ${name}` }).click();
  await expect(b).toHaveURL(new RegExp(`/clubs/${slug}$`));
  await expect(b.getByRole("button", { name: "Leave" })).toBeVisible();
  await b.goto(path);
  await expect(b.getByText("You're already a member.")).toBeVisible();

  // The link is used up for anyone else; A sees that in the list.
  await anon.reload();
  await expect(anon.getByText("This invite link has been used up.")).toBeVisible();
  await a.reload();
  await expect(links).toContainText("Used up");

  // A second link, revoked, stops working.
  await a.getByRole("button", { name: "Make invite link" }).click();
  await expect(links.getByRole("listitem")).toHaveCount(2);
  const second = new URL(await a.evaluate(() => navigator.clipboard.readText())).pathname;
  await links.getByRole("listitem").first().getByRole("button", { name: "Revoke" }).click();
  await confirmDialog(a, "Revoke");
  await expect(links.getByRole("listitem").first()).toContainText("Revoked");
  await anon.goto(second);
  await expect(anon.getByText("This invite link was turned off.")).toBeVisible();

  // A link that never existed.
  await anon.goto(`/clubs/join/${"0".repeat(64)}`);
  await expect(anon.getByText("This invite link doesn't exist")).toBeVisible();

  await deleteClub(a, slug, name);
});
