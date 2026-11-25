# Founder checklist

Everything that needs you: dashboards, accounts, decisions, and checks only a person can do.
Updated 2026-11-25. Tick items as you go, and delete them once they're done.
Work Claude can do without you is in `todo.md`.

---

## 1. Ship what's on `main`

- [ ] **Review, then tell Claude to push `main`.** Local `main` has the rename, app shell, Home,
      the new landing page, the waitlist, the daily scramble, the command palette and the
      2026-11-25 cleanup. Pushing it probably deploys production.
- [ ] After the deploy: `npm run check:chunks -- https://<production URL>`.
- [ ] **Vercel:** set `NEXT_PUBLIC_SITE_URL=https://cuberhub.me` for production and redeploy.
      Redirect the `vercel.app` URL to it, then submit `/sitemap.xml` in Google Search Console.
- [ ] **Supabase → Authentication → URL Configuration:** set the Site URL and redirect URLs to
      `https://cuberhub.me`, so confirmation links don't point at the old domain.
- [ ] **Supabase → Authentication → Emails:** change "CubeHub" to "CuberHub" in the confirm,
      reset and magic-link templates.

## 2. Before the beta

- [ ] **Custom SMTP.** Supabase's built-in email allows only a few emails an hour, so a group
      signing up together hits "email rate limit exceeded".
  - [ ] Pick a sender with a free tier (Resend or Brevo) and verify `cuberhub.me` as the
        sending domain. The same provider can later send the waitlist email.
  - [ ] Supabase → Authentication → Emails → SMTP Settings: host, port, user, password, and
        the sender "CuberHub".
  - [ ] Supabase → Authentication → Rate Limits: raise "emails sent per hour" (30–100).
  - [ ] Sign up with a fresh address and check the confirmation arrives (and isn't in spam),
        then try a password reset.
- [ ] **Content:**
  - [ ] Add real Instagram and YouTube URLs and the Contribute link in `src/content/community.ts`.
  - [ ] Confirm the Contribute wording ("built by a student at IIT Palakkad…").
- [ ] **Legal:** have `/privacy` and `/terms` reviewed, then ask Claude to drop their `noindex`
      and add them to the sitemap.
- [ ] **Clean up test data:**
  - [ ] Delete `qa-test-checklist@example.com` and any other test sign-ups from `waitlist`.
  - [ ] Turn "Cubby's tip" back on for the test account if you want it.
  - [ ] Delete any test posts from `daily_results`.
  - [ ] At the final pre-beta check, remove these together: `testbot1`/`testbot2`, and the
        "E2E Club posts mvchw52f" and "8.8.8.8" clubs. They stay until then, because the e2e
        tests use them.
  - [ ] Delete the old test account `#2nd User` (`user_89946160417c`, with fake PBs like 0.02),
        or make it private.
- [ ] **Read reports** in the Supabase dashboard (`profile_reports`, club reports) until there's
      an admin queue.

## 3. Check by hand (signed in, on the live site after the deploy)

- [ ] **Daily scramble:** solve today's, pick a penalty, then "Post to the leaderboard". You
      should get a rank and your row highlighted on `/home/daily`. Posting again from another
      browser keeps the first result.
- [ ] **Command palette:** search a friend by display name ("Riya") and by username. Display
      names were fixed on 2026-11-25.
- [ ] **Daily mode at laptop width:** the 2D preview shows under the timer (fixed 2026-11-25).
- [ ] **Social:**
  - [ ] The bell on desktop.
  - [ ] The More-tab dot on a phone.
  - [ ] `/people` at phone width.
  - [ ] A private profile's request → accept → stats visible.
- [ ] **Drill Lab:**
  - [ ] Do a few reps, reload, and they're still there.
  - [ ] Mark one rep +2 and one DNF.
  - [ ] "Weakest first" brings up the slowest case.
- [ ] **Admin case editor:** sign in as `CubeHub_Admin`, go to `/master-access/algorithms`
      (there's no link), edit a case, and check the Learn page shows the change.
- [ ] **Real phone pass:** timer, Home, daily scramble and the landing page on an actual
      phone. Desktop browsers kept snapping to narrow widths.

## 4. Two hosts go live (app shell step 9)

- [ ] Vercel: add `app.cuberhub.me` to the project. In DNS, add the CNAME Vercel shows.
- [ ] Vercel: set `NEXT_PUBLIC_APP_URL=https://app.cuberhub.me`.
- [ ] Supabase redirect URLs: add `https://app.cuberhub.me/**`.
- [ ] Google OAuth: add `https://app.cuberhub.me` to the authorised origins.
- [ ] On a deployment with both real domains, check the guest handoff. As a guest on
      `cuberhub.me`, time a solve, then open `cuberhub.me/timer`: you should land on
      `app.cuberhub.me/timer` with the solve still there. This can't be tested on localhost.
- [ ] Run the split-host rows of the smoke test in `docs/architecture.md`.

## 5. Recurring

- [ ] **Daily scrambles run out on 2027-01-23.** Before then:
      `node scripts/generate-daily-scrambles.mjs 2027-01-24 60`, then load the file it writes
      (`supabase db query --linked -f supabase/DataSeeds/20270124000000_daily_scrambles.sql`),
      or ask Claude to do both.
- [ ] After every deploy: `npm run check:chunks -- https://<production URL>`.

## 6. Decisions waiting on you

- [ ] **Access tiers** (after the beta): which sets and tutorials are `free` (need an account)
      and which are `premium`. Claude can then enforce it in the database
      (`docs/access-control.md`).
- [ ] **Error tracking:** add Sentry (free tier) before the beta, or keep relying on Vercel logs?
- [ ] **Branches:** keep, merge or delete `auto-run-1110` (the November Drill Lab auto-run) and
      `experiment/liquid-glass`.
- [ ] **Old press files:** delete `public/brand/cubehub-lockup-*` once you're happy with the
      `cuberhub-lockup-*` set.
- [ ] **Discord:** create a server, or leave the link out.
- [ ] **Meet Cubby** (landing step 10): needs the companion art.
- [ ] **Theme across devices:** the theme is a cookie, shared by `cuberhub.me` and
      `app.cuberhub.me` but not across devices. Saving it to the account needs a new
      `user_settings.theme` column, so a migration. Want it? Claude can write it, and you
      approve applying it.
- [ ] **Reduced motion:** the loading cube still turns slowly (6 s) when "reduce motion" is on.
      This is on purpose, because it signals loading (WCAG allows essential motion). Say if you
      want it stopped completely.

## 7. Cubby and 3x3 BLD (branches `feat/cubby` and `feat/bld-mode`, 2026-11-26)

Merged and pushed; 3x3 BLD is live, Cubby is behind the flag. Details: `docs/run-report-2026-11-26.md`.

- [ ] **Look at Cubby:** `NEXT_PUBLIC_SHOW_CUBBY=1 npm run dev` (checklist:
      `docs/verification-checklist.md` → C).
- [ ] **Decide:** is the v0 art good enough for the beta, or does Cubby wait for the final art?
- [x] Applied `20261126000000_companion.sql` (2026-11-26; SQL test 7/7 on live).
- [x] Applied `20261126000100_bld_memo.sql` (2026-11-26; SQL test 6/6 on live).
- [x] Merged into `main` (2026-11-26).
- [ ] **Turn Cubby on:** Vercel → `NEXT_PUBLIC_SHOW_CUBBY=1`, redeploy (after checking it in `docs/verification-checklist.md` → C).

