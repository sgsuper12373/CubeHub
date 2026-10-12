# To-do

Things waiting on the founder, things to hand to Claude, and improvement ideas.
Written 2026-10-04. Tick items off or delete them as they're done.

---

## Next session: start here (suggested 2026-10-12)

The timer round and all five profile steps are done and pushed (see `timer.md`,
`profile.md`). Suggested next work, most valuable first:

1. **Make tutorials findable on Google:** a sitemap, plus one page per case such as
   `/learn/333/oll/27`. Details in section 5, idea 1.
2. **Error tracking and analytics before sharing the beta:** Vercel Analytics plus Sentry.
   Section 5, idea 3.
3. ✅ **Error and 404 pages:** (done 2026-10-13) a themed `error.tsx` and `not-found.tsx`. Section 5, idea 2.
4. **Daily scramble with an India-wide leaderboard:** section 5, idea 5. It can reuse the
   profile and achievement work. Leave typed times out with `solves.source = 'manual'`, as
   the speed badges and levels already do.
5. **A sign-in test account for e2e tests:**
   - Every signed-in flow (profile editing, photo upload, privacy, achievements, typed
     solves in the cloud, Learn "mark learned") is checked by hand today.
   - The fix is a dedicated test user, plus a Playwright setup that signs in once and
     reuses the session, with CI secrets for its email and password.
   - It needs its own throwaway data, cleaned up after each run, and must never use the
     service-role key.

Before any of these, finish the post-deploy checks in section 2 (Vercel and "Check by hand").

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
- [ ] **Before ever running `supabase link` + `supabase db push`,** mark the existing migrations
      as applied. The live migration history is empty, because every migration was applied by hand:
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

### Vercel
- [x] Build command is `npm run build`, with no override pinning `--webpack`.
- [ ] `NEXT_PUBLIC_SITE_URL` is set to the live domain. Without it, share-preview (Open Graph) links point at localhost.
- [ ] After a deploy, run `npm run check:chunks -- https://<your-domain>`.

### Check by hand on the live site (signed in)
- [ ] Drill Lab: do a few reps → reload → they're still there. Mark a rep +2 and one DNF. Run
      "weakest first" and check the slowest case comes up first.
- [ ] Admin case editor: open a case, edit it, save, and check the Learn page shows the change.
- [ ] Learn pages: the 2x2 Beginner, Ortega, CLL, EG-1 and EG-2 sets all appear under `/learn/222`.

---

## 3. Decisions waiting on you

- [ ] **Access tiers** (on hold). Which sets or tutorials are `free` (need an account) and which are
      `premium`? Today the tier is only a badge. Once decided, Claude can make the
      database enforce it (RLS). See `docs/access-control.md`.
- [x] **Case card colours.** Yellow on top everywhere, like the Drill Lab (white is the
      first layer, solved on the bottom). Done 2026-10-11.
- [x] **Theme default.** "System". Done 2026-10-11.
- [ ] **Domain** (on hold): `cubehub.in` or `cubehub.io` (roadmap open question 1).

---

## 4. Ready to hand to Claude

Roughly in the suggested order:

- [x] **Next.js upgrade** (section 1).
- [x] **Database security fixes:** shipped in `20261011000000_timer_round.sql`, applied 2026-10-11.
  - Give `is_admin()` a fixed `search_path`.
  - Revoke public `EXECUTE` on the trigger functions `maintain_average_pbs_on_insert`,
    `recompute_pb_on_solve_delete` and `recompute_pb_on_solve_update`. They're only meant to
    run as triggers, but the security advisor shows them as callable through the API.
- [ ] **Update `docs/roadmap.md` Phase 3.** It still says the live database has 1 case and no
      `algorithm_subsets`. Both are out of date.
- [ ] **OLL shape categories.** Rewrite OLL descriptions as "Dot · Run", "Cross · Sune"… so
      the new category chips appear on `/learn/333/oll` (Dot, Line, Small L, Cross…).
- [ ] **Theme settings page (step 8).** Then delete the dev theme switcher, and make "System"
      follow OS changes mid-session.
- [ ] **Theme follow-ups:**
  - sticker colours in the cubing.js 3D/2D players
  - ~~a themed `not-found.tsx`~~ (done 2026-10-13, branch `feat/learn-phase3`)
  - remove the hardcoded colours on the stats and profile pages

---

## 5. Improvement ideas (Claude's suggestions)

Ordered by value for effort. Each is a separate piece of work: pick any.

1. **Make tutorials findable on Google (SEO).** The roadmap calls tutorials "the main
   organic-traffic and sign-up driver", but the site has no `sitemap.xml` or `robots.txt`,
   and no page per case. Add `sitemap.ts` + `robots.ts`, and pages like
   `/learn/333/oll/27` with their own title ("OLL 27 (Sune) algorithms").
   People search for exactly "OLL 27 algorithm".

2. ✅ **Error and 404 pages.** Done 2026-10-13. There's no `error.tsx` or `not-found.tsx`. Today a crash or a
   bad link shows Next.js's default page, which isn't themed and has no way back. These
   are small and make the site feel finished.

3. **Know when things break (monitoring).** There's no error tracking or analytics. Before
   sharing the beta, add Vercel Analytics + Speed Insights (free, a few lines) and an error
   tracker such as Sentry (free tier). Otherwise you only learn about bugs when someone
   complains.

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
