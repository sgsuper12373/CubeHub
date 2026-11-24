# Run report: 2026-11-25

Unattended batch on **`feat/next-batch`**, branched from `origin/feat/landing-polish`. All seven
steps are done, one commit per step. Nothing was merged or deployed, `main` was not pushed, and no
dashboard was touched. The live database wasn't touched either: the migrations are files only. The
`auto-run-1110` branch was left alone. Every judgement call is in `docs/decisions.md`, and every
step has an entry in `implementationlog.md`.

## Commits

| # | Commit | Step |
| --- | --- | --- |
| 1 | `d219171` | Waitlist "Notify me" form on the landing roadmap section and `/roadmap` |
| 2 | `863c352` | Docs: brand, architecture (routes, hosts, cookies, smoke test), roadmap, timer; plan steps marked done |
| 3 | `fd3199a` | `public_stats()` migration + SQL test; RealStats reads it and hides when it's missing |
| 4 | `bada87e` | `cuberhub-lockup-*` press assets (SVG, PNG, WebP) and `scripts/render-lockups.mjs` |
| 5 | `e1e4970` | `playground-swipe` flake fixed (not quarantined) |
| 6 | `8aa254f` | Daily scramble: migration, SQL test, 60 seeded days, daily timer, Home card, leaderboard |
| 7 | `ce039f9` | Ctrl/⌘+K command palette |

## What each step does

**1. Waitlist form.** The form is a client island over the existing `joinWaitlist()`, and the
pages around it stay static. It has four outcomes:
- **Success:** the form is replaced by "You're on the list". A duplicate address gets the same message.
- **Invalid address:** the field is marked invalid.
- **Rate limited:** an alert, and the field is not marked.
- **Error:** an alert, and the field is not marked.

It also shows "One email when something ships. No spam." and a Privacy link. The e2e test drives
only the invalid path, so test runs never write to the real list.

**2. Docs.**
- `architecture.md` now has the full route tree (marketing pages, `/home`, `/home/daily`, `/clubs`,
  handoff, per-host robots and sitemaps).
- It also has a **Hosts** section with the routing table, a **Cookies** table, and a smoke test for
  single-host and split-host setups.
- `roadmap.md`: the domain is marked decided, and the November rows are added.
- `brand.md`: how to write the name, and the new lockup files.
- `timer.md`: the daily mode, and the sidebar lock while a solve runs.
- The three plan files have ✅ on every finished step.

**3. `public_stats()`.**
- A security-definer function that returns only three totals: solves (not in Recently deleted),
  cubers, and cases drilled.
- RealStats renders nothing when the function is missing or returns nothing.
- New minimum before "cases drilled" shows: 1,000.

**4. Press lockups.** Five variants, each as SVG, PNG (2400×1112) and lossless WebP.
- Each file keeps the old background and mark. Only the text is re-set: Outfit, outlined as paths,
  so the SVGs need no font.
- The wordmark is about 9% smaller than "cubehub" was, because "cuberhub" has one more letter.
- The old `cubehub-lockup-*` files are untouched. The script reads them as its source.

**5. Playground flake.**
- **Cause:** under parallel load, cubing's WebGL canvas hadn't drawn when the test took its
  screenshot. Reproduced: 13 of 24 runs failed at 8 workers.
- **Fix:** the tests wait for the first frame. The camera is set through cubing's own orbit request
  and checked before the screenshot. The pixel checks retry until the frame matches (a wrong
  projection still fails) instead of using fixed sleeps.
- **Second bug found:** one test's "back to the default camera" had silently been 7° off.
- **Result:** 56/56 at 8 workers × 4 repeats, and 162/162 for both Playground specs at 12 workers × 6.

**6. Daily scramble.**
- **Where:** `/timer?daily=yyyy-mm-dd`, a "Daily scramble" card on Home (first for members and
  returning guests), and the leaderboard at `/home/daily`.
- **Rules:** WCA inspection and one attempt. The attempt is saved in the browser as soon as the
  timer stops, so reloading doesn't give another try. Guests' results stay in the browser.
- **Posting:** a signed-in cuber checks the penalty (they can't pick one lighter than inspection
  gave), then posts once through `submit_daily_result()`.
- **Leaderboard:** the top 10 and your rank. +2 times are ranked with the penalty added; DNFs count
  as "solved" but aren't ranked.
- **The normal timer is untouched:** the daily screen restores the session's scramble and settings
  when you leave, and nothing is recorded into a session.
- **Scrambles:** pre-generated with the same cubing.js scrambler the timer uses, running in Node.
  The first seed covers 2026-11-25 to 2027-01-23.

**7. Command palette.**
- **Opens with:** Ctrl/⌘+K, or the search button next to the sidebar logo.
- **Finds:** pages, Learn series, cases ("OLL 33", "Gb perm"), cubers by username, and themes.
- **Safety:** it can't open while a solve is running, and Space typed into it never reaches the timer.
- **Not built:** "switch puzzle" and "new session". Both would mean driving the timer's session
  store from outside the timer (see decisions.md).

## Checks

| Check | Result |
| --- | --- |
| `npm run validate` after each step | Passed every time. The unit tests went from 672 to 689. The one lint warning (`_alg`) was already on `main` |
| `npm run check:colors` after each step | Passed every time |
| `npm run test:e2e:prod` at the end | **108 passed, 1 skipped, 0 failed.** The skip is the daily guest-flow test, which skips itself because the live project has no daily tables yet. The clubs posting test passed this time |
| SQL tests, local only | `public_stats_test.sql` 7/7 and `daily_scramble_test.sql` 14/14 PASS. Run on a throwaway local `supabase/postgres` container with every migration applied, never the live project |
| Daily flow on a local stack | 3/3 e2e, including the full guest flow, plus screenshots of the card and leaderboard. Run against `next dev` with a local PostgREST behind a small proxy |

The server printed "The destination stream closed early" about 38 times during the e2e run. That's
known, harmless noise: a page closed mid-stream, as logged on 2026-10-13.

## What you need to do by hand

In order, before this branch reaches production:

1. **Apply the waitlist migration** `20261124000100_waitlist.sql`. The form is live on this branch,
   and until the migration is applied every real submit shows "Couldn't sign you up just now". Then
   run `supabase/tests/waitlist_test.sql`.
2. **Apply `20261125000000_public_stats.sql`**, then run
   `supabase db query --linked -f supabase/tests/public_stats_test.sql`. Expect 7 PASS.
3. **Apply `20261125000100_daily_scramble.sql`**, then run `supabase/tests/daily_scramble_test.sql`.
   Expect 14 PASS.
4. **Load today's scrambles:**
   `supabase db query --linked -f supabase/DataSeeds/20261125000000_daily_scrambles.sql`. Without
   them, the Home card stays hidden.
5. **Before 2027-01-23:** run `node scripts/generate-daily-scrambles.mjs 2027-01-24 60` and load the
   new file.
6. **Still open from the last report:** the `home_layout` migration, `NEXT_PUBLIC_SITE_URL` in
   Vercel, the Supabase email templates, community links, a legal review of `/privacy` and `/terms`,
   and app-shell go-live (step 9).
7. **When you're ready:** delete `public/brand/cubehub-lockup-*`. If you also want to keep
   re-rendering, move `render-lockups.mjs`'s background-and-mark source to another file first.

## How to look at it

```bash
git fetch origin && git worktree add ../cuberhub-next feat/next-batch
cd ../cuberhub-next && cp ../cubehub/.env.local . && npm ci && npm run dev
```

- **`/roadmap` and `/#roadmap`:** the Notify me form. An invalid address shows the error; a real
  address errors until migration 1 is applied.
- **Ctrl+K anywhere in the app:** try "oll 21", "gb", "paper" and a username.
- **`/timer?daily=<today>`, `/home/daily` and the Home card:** these show "not available" or stay
  hidden until migrations 3 and 4 are applied.
- **`public/brand/cuberhub-lockup-*.png`:** the new lockups.
- **`npx playwright test playground-swipe --repeat-each=4 --workers=8`** (with `E2E_PROD=1` after a
  build): the flake is gone.
