# To-do

Things waiting on the founder, things to hand to Claude, and improvement ideas.
Written 2026-10-04. Tick items off or delete them as they're done.

---

## 1. Urgent: upgrade Next.js (security)

`next` 16.2.10 has known **critical** vulnerabilities. One is remote code execution in
`next/og` `ImageResponse`, which this site uses in `src/app/opengraph-image.tsx`. Others
include a middleware/proxy bypass and server-action denial-of-service. The fix is
**16.3.8**, a minor release.

- [ ] Ask Claude: *"upgrade Next.js to 16.3.8"*. That means bumping `next` and
      `eslint-config-next`, reading the release notes in `node_modules/next/dist/docs/`,
      running `npm run validate`, building, and running the e2e suite.
- [ ] Push and redeploy straight after.

`npm audit` also lists high-severity issues in dev tools (`shadcn`, `braces`,
`js-yaml`…). They don't ship to users, so they can wait for a routine `npm audit fix`.

---

## 2. Only you can do these

### Git and CI
- [ ] **Push `main`.** It is 4 commits ahead of GitHub: the seed scripts, housekeeping, the
      card diagrams and the category filter. Run `git push`.
- [ ] **Add the GitHub secret for the Drill Lab tests.** Go to github.com/sgsuper12373/CubeHub →
      Settings → Secrets and variables → Actions → New repository secret.
      Name it `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and give it the value of that variable in `.env.local`.
      ⚠️ Never add `SUPABASE_SERVICE_ROLE_KEY` as a secret.
- [ ] **Then merge branch `ci/drill-e2e-data`.** Ask Claude, or run
      `git merge --ff-only ci/drill-e2e-data`, then push. In the next CI run, the 3 drill tests
      should **pass**, not skip.

### Supabase dashboard
- [ ] **Turn on leaked-password protection:** Authentication → Settings → Password
      security. It checks new passwords against HaveIBeenPwned. Flagged by Supabase's
      security advisor. (It may need a paid plan; if so, skip it.)
- [ ] **Site URL and redirect allow-list:** Authentication → URL Configuration. Both must be
      the live domain, not `http://localhost:3000`, or sign-up confirmation links break.
- [ ] **Before ever running `supabase link` + `supabase db push`,** mark the existing migrations
      as applied. The live migration history is empty, because every migration was applied by hand:
      ```
      supabase migration repair --status applied 20260718000000 20260721000000 20260726000000 20260726000100 20260730000000 20260805000000 20260814210434 20260914000000 20260930000000
      ```

### Vercel
- [ ] Build command is `npm run build`, with no override pinning `--webpack`.
- [ ] `NEXT_PUBLIC_SITE_URL` is set to the live domain. Without it, share-preview (Open Graph) links point at localhost.
- [ ] After a deploy, run `npm run check:chunks -- https://<your-domain>`.

### Check by hand on the live site (signed in)
- [ ] Drill Lab: do a few reps → reload → they're still there. Mark a rep +2 and one DNF. Run
      "weakest first" and check the slowest case comes up first.
- [ ] Admin case editor: open a case, edit it, save, and check the Learn page shows the change.
- [ ] Learn pages: the 2x2 Beginner, Ortega, CLL, EG-1 and EG-2 sets all appear under `/learn/222`.

---

## 3. Decisions waiting on you

- [ ] **Access tiers.** Which sets or tutorials are `free` (need an account) and which are
      `premium`? Today the tier is only a badge. Once decided, Claude can make the
      database enforce it (RLS). See `docs/access-control.md`.
- [ ] **Case card colours.** Cards show white on top; Drill Lab shows yellow on top. Make
      them match? It's a one-line change, but every card would look different.
- [ ] **Theme default.** When there's no theme cookie, use "System" or "Slate"?
- [ ] **Domain:** `cubehub.in` or `cubehub.io` (roadmap open question 1).

---

## 4. Ready to hand to Claude

Roughly in the suggested order:

- [ ] **Next.js upgrade** (section 1).
- [ ] **Database security fixes:** one small migration, applied via the dashboard.
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
  - a themed `not-found.tsx`
  - remove the hardcoded colours on the stats and profile pages

---

## 5. Improvement ideas (Claude's suggestions)

Ordered by value for effort. Each is a separate piece of work: pick any.

1. **Make tutorials findable on Google (SEO).** The roadmap calls tutorials "the main
   organic-traffic and sign-up driver", but the site has no `sitemap.xml` or `robots.txt`,
   and no page per case. Add `sitemap.ts` + `robots.ts`, and pages like
   `/learn/333/oll/27` with their own title ("OLL 27 (Sune) algorithms").
   People search for exactly "OLL 27 algorithm".

2. **Error and 404 pages.** There's no `error.tsx` or `not-found.tsx`. Today a crash or a
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
