# To-do

Things waiting on the founder, things to hand to Claude, and improvement ideas.
Written 2026-10-04. Tick items off or delete them as they're done.

---

## Now: social v1 is built, waiting to go live (2026-10-14)

Branch `feat/social-v1`. What it is: `roadmap.md` → Social layer. Decided by the founder on
2026-10-14: one-way follows; **private profiles approve requests**; lists visible to whoever
can see the profile; block, rate limit and report from day one; no DMs; no new nav tab.

### Founder steps, in order

- [ ] **Create the two e2e test accounts.** Sign up twice (e.g. `e2e_alpha`, `e2e_beta`) with
      addresses you control, confirm both, finish onboarding. Then add to `.env.local` **and**
      as GitHub Actions secrets: `E2E_USER_A_EMAIL`, `E2E_USER_A_PASSWORD`,
      `E2E_USER_B_EMAIL`, `E2E_USER_B_PASSWORD`. Never the service-role key.
- [ ] **Apply the migrations** (the CLI is linked):
      ```
      supabase db push --dry-run   # should list 20261018000000 and 20261018000100
      supabase db push
      supabase db query --linked -f supabase/tests/social_test.sql   # every row PASS; rolls back
      ```
      Then re-run `profile_progress_test.sql`, `achievements_test.sql` and
      `profile_setup_test.sql` the same way: `profile_visible()` changed under them.
      **Before deploying the branch:** the profile page calls the new RPCs.
- [ ] **Run the signed-in e2e locally:** `npm run test:e2e:prod` (social spec included).
- [ ] **Merge, push, deploy,** then `npm run check:chunks -- https://pre-cube-hub.vercel.app`.
- [ ] **Check by hand:** the bell on desktop; the Profile-tab dot on a phone; `/friends` at
      phone width; a private profile's request → accept → stats visible.
- [ ] **Read reports** in the Supabase dashboard (`profile_reports`) until there's an admin
      queue (roadmap → Social, later).

### Next after that

1. **Beta with 10–15 real users.** Access tiers and the domain are decided after it.
2. **Social, later** (roadmap): daily scramble with a Friends tab, share cards, clubs, friend
   rooms in Compete, social achievements, PB notifications, an admin report queue.

### Also open

- **Links that read as buttons:** older Learn pages use `Button render={<Link/>}`, which exposes
  links as `role="button"`. Switch them to `<Link className={buttonVariants(...)}>`.
- **Error tracking (Sentry):** deferred by the founder on 2026-10-13. Until then, the error page's
  "Ref" code can be searched in Vercel's runtime logs (about 1 hour of retention on Hobby).

Before any of these, finish the "Check by hand" items in section 2.

---

## 1. Urgent: upgrade Next.js (security)

`next` 16.2.10 has known **critical** vulnerabilities. One is remote code execution in
`next/og` `ImageResponse`, which this site uses in `src/app/opengraph-image.tsx`. Others
include a middleware/proxy bypass and server-action denial-of-service. The fix is
**16.3.8**, a minor release.

- [x] Ask Claude: *"upgrade Next.js to 16.3.8"*. Done 2026-10-08 (see `implementationlog.md`).
- [x] Push and redeploy straight after. (Pushed 2026-10-11.)

`npm audit` still lists issues in dev tools only (`shadcn` and its `proxy-addr` critical,
`braces`, `js-yaml`…). They don't ship to users, so they can wait for a routine `npm audit fix`.

---

## 2. Only you can do these

### Git and CI
- [X] **Push `main`.** It is 4 commits ahead of GitHub: the seed scripts, housekeeping, the
      card diagrams and the category filter. Run `git push`.
- [x] **Add the GitHub secret for the Drill Lab tests.** Go to github.com/sgsuper12373/CubeHub →
      Settings → Secrets and variables → Actions → New repository secret.
      Name it `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and give it the value of that variable in `.env.local`.
      ⚠️ Never add `SUPABASE_SERVICE_ROLE_KEY` as a secret.
- [x] **Then merge branch `ci/drill-e2e-data`.** Done 2026-10-11 (rebased onto `main` first,
      since `main` had moved on). Push to run it. In the next CI run, the 3 drill tests
      should **pass**, not skip.

### Supabase dashboard
- [ ] ~~**Turn on leaked-password protection.**~~ Needs a paid Supabase plan. Skipped for now;
      revisit if the project upgrades.
- [x] **Site URL and redirect allow-list:** (redirect URLs set by the founder 2026-10-11; one Site URL is all Supabase allows.) Authentication → URL Configuration. Both must be
      the live domain, not `http://localhost:3000`, or sign-up confirmation links break.
- [x] **Before ever running `supabase link` + `supabase db push`,** mark the existing migrations
      as applied. Done 2026-10-14: linked, repaired all 17, and `db push` reports "Remote
      database is up to date". Kept for the record:
      ```
      supabase migration repair --status applied 20260718000000 20260721000000 20260726000000 20260726000100 20260730000000 20260805000000 20260814210434 20260914000000 20260930000000 20261011000000 20261012000000 20261013000000 20261013000100 20261014000000 20261015000000 20261015000100 20261016000000
      ```

- [x] **Apply `supabase/migrations/20261011000000_timer_round.sql`** (applied 2026-10-11) in the dashboard SQL
      editor (Mo3 PBs, `manual` solve source, security fixes). Then run
      `supabase/tests/timer_round_test.sql` there: every row should say PASS. Add
      `20261011000000` to the `migration repair` list above.

- [x] **Apply `supabase/migrations/20261012000000_profile_stats.sql`** (applied 2026-10-11) in the dashboard SQL
      editor (public profile stats). Then run `supabase/tests/profile_stats_test.sql` there:
      every row should say PASS. Add `20261012000000` to the `migration repair` list above.
      Until it's applied, profiles show 0 total solves.

- [x] **Profile step 2: two migrations, BEFORE deploying the `user_profile` branch** (both applied 2026-10-11)
      (the new profile page reads `profiles.is_public`; without it every profile 404s).
      Run each file in the SQL editor, then its test (every row PASS):
      1. `supabase/migrations/20261013000000_profile_edit.sql` →
         test `supabase/tests/profile_edit_test.sql` (privacy, WCA ID).
      2. `supabase/migrations/20261013000100_avatars_storage.sql` →
         test `supabase/tests/avatars_storage_test.sql` (avatar uploads).
         If step 2 fails with "must be owner of table objects", the bucket part still needs
         to exist: create it in Storage → New bucket → name `avatars`, **Public**, 2 MB,
         types `image/webp, image/png, image/jpeg`. Then in Storage → Policies → avatars,
         add policies for INSERT, UPDATE, DELETE and SELECT, for `authenticated`, with the
         expression `bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text`.
      Then add `20261013000000 20261013000100` to the `migration repair` list.

- [x] **Profile step 3: apply `supabase/migrations/20261014000000_profile_progress.sql`, BEFORE
      deploying** (the page reads `show_activity` / `show_learning`; without them every profile
      404s). Then run `supabase/tests/profile_progress_test.sql` (14 rows, all PASS) and add
      `20261014000000` to the `migration repair` list. (Applied 2026-10-12.)

- [x] **Profile step 4: apply `supabase/migrations/20261015000000_achievements.sql`** (applied 2026-10-12), then run
      `supabase/tests/achievements_test.sql` (10 rows, all PASS) and add `20261015000000` to the
      `migration repair` list. Safe to deploy before or after: until it's applied the badge
      section stays hidden and the award check quietly finds nothing.

- [x] **Apply `supabase/migrations/20261015000100_remove_legacy_achievements.sql`** (applied 2026-10-12): deletes the
      14 hand-made June achievement rows (duplicates and Compete/club/tutorial badges), keeping
      any that someone has unlocked. Afterwards the profile shows
      20 badges. Add `20261015000100` to the `migration repair` list.

- [x] **Profile step 5: apply `supabase/migrations/20261016000000_profile_setup.sql`, BEFORE
      deploying** (the page reads `main_method` / `learning_now`; without them every profile
      404s). Then run `supabase/tests/profile_setup_test.sql` (11 rows, all PASS) and add
      `20261016000000` to the `migration repair` list.

- [x] **Apply `supabase/DataSeeds/20261017000000_oll_shape_categories.sql`** (applied 2026-10-13;
      57 of 57 OLL cases have a category, in 15 groups). A seed: no `migration repair` entry.

### Vercel
- [x] Build command is `npm run build`, with no override pinning `--webpack`.
- [x] `NEXT_PUBLIC_SITE_URL` set to `https://pre-cube-hub.vercel.app/` (2026-10-13). Checked live:
      `/sitemap.xml` has 233 URLs, all on that origin; `robots.txt` points to it; case pages'
      titles and share images use it.
- [ ] **When there's an official domain:** set `NEXT_PUBLIC_SITE_URL` to it, redeploy, and redirect
      the `vercel.app` URL to it in Vercel. Submit `/sitemap.xml` in Google Search Console only
      then, so it's set up once.
- [x] After a deploy, run `npm run check:chunks -- https://<your-domain>`. Passed 2026-10-14
      against `https://pre-cube-hub.vercel.app` (64 files across 5 pages). Repeat after future deploys.
- [x] **Web Analytics and Speed Insights enabled** (2026-10-13). Both scripts load live (200).

### Check by hand on the live site (signed in)
- [ ] Drill Lab: do a few reps → reload → they're still there. Mark a rep +2 and one DNF. Run
      "weakest first" and check the slowest case comes up first.
      **2026-10-14: reported "reps erased after reload". Under investigation.** The
      "This session" list is in-memory by design and always empties on reload; saved reps show
      in the per-case table (rep count, median) instead. The live DB holds 46 attempts, the
      newest from 2026-10-11 18:41 UTC, so nothing has been saved since. Recheck signed in,
      watching for a "Couldn't save that attempt" toast.
- [ ] Admin case editor: open a case, edit it, save, and check the Learn page shows the change.
      To get there: sign in as `CubeHub_Admin` (the only `is_admin` account) and open
      `/master-access/algorithms`. There is no nav link.
- [x] Learn pages: the 2x2 Beginner, Ortega, CLL, EG-1 and EG-2 sets all appear under `/learn/222`.
- [x] Case pages: Mark Learned on `/learn/333/oll/27` while signed in, and a shared case link shows
      its own preview image.

---

## 3. Decisions waiting on you

- [ ] **Access tiers** (on hold until after a beta with 10–15 real users). Which sets or tutorials are `free` (need an account) and which are
      `premium`? Today the tier is only a badge. Once decided, Claude can make the
      database enforce it (RLS). See `docs/access-control.md`.
- [x] **Case card colours.** Yellow on top everywhere, like the Drill Lab (white is the
      first layer, solved on the bottom). Done 2026-10-11.
- [x] **Theme default.** "System". Done 2026-10-11.
- [ ] **Domain** (on hold until after the beta): `cubehub.in` or `cubehub.io` (roadmap open question 1).

---

## 4. Ready to hand to Claude

Roughly in the suggested order:

- [x] **Next.js upgrade** (section 1).
- [x] **Database security fixes:** shipped in `20261011000000_timer_round.sql`, applied 2026-10-11.
  - Give `is_admin()` a fixed `search_path`.
  - Revoke public `EXECUTE` on the trigger functions `maintain_average_pbs_on_insert`,
    `recompute_pb_on_solve_delete` and `recompute_pb_on_solve_update`. They're only meant to
    run as triggers, but the security advisor shows them as callable through the API.
- [x] **Update `docs/roadmap.md` Phase 3.** Done 2026-10-13.
- [x] **OLL shape categories.** Seed written and applied 2026-10-13.
- [ ] **Theme settings page (step 8).** Then delete the dev theme switcher, and make "System"
      follow OS changes mid-session.
- [ ] **Theme follow-ups:**
  - sticker colours in the cubing.js 3D/2D players
  - ~~a themed `not-found.tsx`~~ (done 2026-10-13, branch `feat/learn-phase3`)
  - remove the hardcoded colours on the stats and profile pages

---

## 5. Improvement ideas (Claude's suggestions)

Ordered by value for effort. Each is a separate piece of work: pick any.

1. ✅ **Make tutorials findable on Google (SEO).** Done 2026-10-13: `sitemap.ts`, `robots.ts`,
   and a page per case such as `/learn/333/oll/27`.

2. ✅ **Error and 404 pages.** Done 2026-10-13: themed `not-found.tsx` and `error.tsx`.

3. **Know when things break (monitoring).** Vercel Analytics + Speed Insights are in
   (2026-10-13). Still to do: an error tracker such as Sentry (free tier) before sharing the
   beta. Otherwise you only learn about bugs when someone complains.

4. **Installable app + offline timer (PWA).** It's in Phase 6, but cheap now. The timer
   already works signed out from local storage, so a manifest and a service worker would
   let cubers "install" CubeHub on their phone and time solves with no signal. That fits
   "phone on the desk" practice exactly.

5. **Daily scramble with a leaderboard.** Everyone gets the same scramble each day, with a
   simple India-wide ranking. It's cheap to build (one table plus a page), gives people a
   reason to come back daily, and starts building the active user base the Arena needs
   before it can work.

6. **Smart cube and Stackmat support.** cubing.js includes Bluetooth support for GAN and
   other smart cubes (popular in India). Connecting one would mean exact timing and move
   recording, and Drill Lab could check a rep automatically. This is a real differentiator,
   but bigger work, and Chrome/Android only.

7. **"What to learn next."** Drill Lab already knows each user's weakest cases. The Learn
   page could suggest the next set to start (e.g. "you know all of PLL: start OLL with the
   Dot cases") using what's marked learned.

8. **Database tidy-up (later).** The performance advisor lists 16 foreign keys without
   indexes and 21 unused indexes. At today's traffic it doesn't matter. Revisit once there
   are real users, starting with `drill_attempts.algorithm_id` and
   `user_algorithm_bookmarks.algorithm_id`.
