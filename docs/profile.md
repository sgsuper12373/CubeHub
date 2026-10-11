# User profiles

The public page that shows a cuber's progress, and the place they manage how they appear.
This file is the plan for the profile work on branch `user_profile`. Tick items as they ship,
as in `timer.md`.

Related: `timer.md` (where PBs come from), `database.md`, `access-control.md`.

---

## What exists today (2026-10-11)

- **`/profile/[username]`** (`src/app/(app)/profile/[username]/page.tsx`, data from
  `src/lib/profile/dal.ts`) shows the avatar, display name, country, WCA ID, a "total solves"
  card, a 3x3 ELO card, and a personal-bests grid.
- **Database:**
  - `profiles` already has `display_name`, `avatar_url`, `bio`, `country` and `wca_id`.
  - `achievements` and `user_achievements` exist but are empty, and nothing reads or writes them.
  - `elo_ratings`, `clubs` and `products` exist for later phases.
- **Read access (RLS):** `profiles`, `personal_bests`, `elo_ratings` and the achievements
  tables are readable by anyone. `solves` and `user_algorithm_bookmarks` are owner-only.

### Problems to fix first
1. **"Total solves" is 0 on everyone else's profile.** It's counted from `solves`, which RLS
   only lets the owner read.
2. **A made-up ELO card.** Everyone sees "1000 · Intermediate" for 3x3, but there is no
   competitive mode yet.
3. **There's no "my profile".** The nav's Profile link opens `/settings`, and nothing lets a
   cuber edit their bio or avatar.

### Ground rule for public data
Anything about someone else's solves or learning is served by **one `SECURITY DEFINER`
function** (`get_profile_stats`).
- It returns aggregates only (counts, dates, streaks, PB progression), never solve rows or
  scrambles.
- It respects the privacy settings from step 2.

The owner-only RLS on `solves` and `user_algorithm_bookmarks` stays exactly as it is.

---

## Step 1: Fix the three problems (done 2026-10-11; migration `20261012000000_profile_stats.sql`)

- [x] **Real public stats.** The new migration adds `get_profile_stats(p_username)`, which returns:
  - total live solves
  - solves per event
  - first and last solve dates

  The DAL calls it instead of counting `solves`. Tested against RLS as another user, as with the
  timer migration.
- [x] **Remove the ELO card and tier badge.** Drop the fake rating, the `getEloTier` badge and the
  `elo_ratings` query from the DAL. The competitive rank comes back with Compete (see Later).
- [x] **"My profile".**
  - New route `/profile`: signed in, it redirects to `/profile/<your username>`; signed out, to
    `/login?next=/profile`.
  - The nav's Profile link points there.
  - The owner sees **Edit profile** and **Settings** buttons on their own page, so `/settings`
    stays one tap away.

## Step 2: Group A, the basics (built 2026-10-11; migration `20261013000000_profile_edit.sql`)

- [x] **A1. Edit profile** (`/profile/edit`, protected):
  - display name (≤ 60) and bio (≤ 500, plain text)
  - country (a select, India first)
  - WCA ID: format check `^\d{4}[A-Z]{4}\d{2}$`, shown as a link to the WCA page and labelled
    as not verified
  - **Avatar upload:** a Supabase Storage bucket `avatars` (public read, owner-only write in
    `avatars/<user id>/…`), created in the migration. The image is resized in the browser to a
    256px square WebP before upload, with a 2 MB limit. A Google sign-in avatar keeps working
    until it's replaced.
  - Username changes stay with the existing username flow.
- [x] **A2. Event tabs:** one tab per timer event the cuber has solves for, chosen with
      `?event=`. Each tab shows single, Mo3, Ao5, Ao12 and Ao100 PBs with their dates. It uses
      the event registry in `src/lib/timer/events.ts`.
- [x] **A3. Public stats:** total solves, solves on the selected event, events practised,
      member since, and last active (a date, never a time).
- [x] **A4. Privacy:** new `profiles` columns:
  - `is_public` (default true)
  - `show_activity` and `show_learning` (both default true)

  The `personal_bests` read policy and `get_profile_stats` respect them.
  - *As built:* only `is_public` was added in Step 2. `show_activity` and `show_learning`
    move to Step 3, so their toggles arrive together with the sections they hide.
  - A private profile shows other people only the name, avatar and "This profile is private".
  - The owner always sees everything, with a note about what others see.
  - The toggles live in Edit profile.

## Step 3: Group B, show progress (built 2026-10-11; migration `20261014000000_profile_progress.sql`)

- [x] **B5. PB timeline:** per event, a step chart of single, Ao5 and Ao12 over time, plus how
      much each improved. `get_profile_stats` builds it from the running best over the
      cuber's solves (averages use per-session windows, as the PB triggers do). That means no
      new history table, and deleted solves drop out on their own.
- [x] **B6. Activity heatmap and streaks:**
  - A calendar of the last 12 months, with current and longest streak and the number of
    active days.
  - Days are counted in India time (`Asia/Kolkata`) for now. A per-user timezone is listed
    under Later.
  - Hidden when `show_activity` is off.
- [x] **B7. Learning progress:** learned/total per algorithm set (e.g. "PLL 21/21 · OLL 34/57
      · CLL 12/42"), from `user_algorithm_bookmarks.learned`. Only sets with progress are
      shown. Hidden when `show_learning` is off.
- [x] **B8. Recent PBs:** the last 5 records across events, with dates. *As built:* "Latest
      records" lists the 5 most recently set PBs that still stand, from the `personal_bests`
      rows the page already loads, so it needs no extra query.

## Step 4: C9, achievements (built 2026-10-12; migration `20261015000000_achievements.sql`)

- [x] **Catalogue:** about 20 achievements seeded into `achievements` with a `condition_type`
      and `condition_value`.
  - **Milestones:** 1, 100, 1,000 and 10,000 solves.
  - **Sub-X singles for 3x3:** sub-60, sub-30, sub-20, sub-15, sub-10.
  - **First solve on each event:** "Pyraminx debut" and so on.
  - **Streaks:** 7 and 30 days.
  - **Learning:** all PLL, all OLL, all of a 2x2 set.
  - **Fun ones**, a few marked `is_hidden`.
- [x] **Awarding:** a `SECURITY DEFINER` function `award_achievements()` for `auth.uid()`.
  - It checks every condition, inserts any new `user_achievements` rows, and returns the
    newly unlocked ones.
  - The timer calls it after a signed-in solve is saved, and Learn calls it after marking a
    set learned. A new unlock shows a toast: "Achievement unlocked: Sub-20".
  - The first call for an existing user backfills everything they already earned.
- [x] **On the profile:** a badge grid. Unlocked badges show their date. Locked ones are dimmed
      and show their description, and hidden ones show "???" until unlocked.
- Signed-out cubers don't earn achievements. The sign-in nudge mentions them.
- *As built:*
  - 20 badges.
  - Typed (manual) times don't count toward speed badges (founder's choice, 2026-10-12).
  - Badges are permanent.
  - The unlock toast has no "View" button: the timer's store has no router.
  - A private profile's badges are hidden by RLS.

## Step 5: C11 and C12, setup, method and level (built 2026-10-12; migration `20261016000000_profile_setup.sql`)

- [x] **C11. My setup:** a new table `user_setups (user_id, puzzle_type, cube_name, product_id
      null → products, note)`, with one main cube per event.
  - Edited in Edit profile, and shown on the event tab ("Main: GAN 12 Maglev").
  - The link to the Shop product appears once `products` has entries; until then it's free text.
- [x] **C12. Method and level:**
  - `profiles.main_method` (Beginner, CFOP, Roux, ZZ, Petrus, Other) and an optional short
    `learning_now` line ("full OLL").
  - A **level badge** per event, worked out from the best Ao12 (sub-60 → sub-40 → sub-30 →
    sub-20 → sub-15 → sub-10 → sub-8). It updates by itself and can't be typed in.
  - *As built:*
    - Every timer event has its own ladder (e.g. 2x2: sub-20 down to sub-3; 4x4: sub-3:00 down
      to sub-30), in `src/lib/profile/level.ts`.
    - The level uses the best **timer-only** Ao12; typed times don't count, as for the speed
      badges.
    - The main cube is free text only (no note); `product_id` waits for the Shop.

---

## Later (not in this branch)

- **Competitive rank and ELO card:** comes back when Compete ships.
- **Official WCA results (C10):** pulled from the WCA API for a linked WCA ID. Worth it once
  real WCA competitors use CubeHub.
- **Social (group D):**
  - a shareable profile card image (reusing the PB share-image code)
  - follow friends, and compare PBs head-to-head
  - city or state leaderboards
  - clubs (the tables already exist)
- **WCA ID verification:** today the ID is only labelled as not verified.
- **Per-user timezone** for streaks and the heatmap.

## How each step is checked

- Each migration runs on a throwaway `supabase/postgres` container (recipe in
  `implementationlog.md`) with a rollback-only SQL test in `supabase/tests/`. The test
  includes RLS checks acting as a second user (`request.jwt.claim.sub`), and is then applied
  on the dashboard by the founder.
- `npm run validate`, `check:colors`, `npm run build` and `npm run test:e2e:prod` pass.
- Screenshots at 1280px and 390px, in both themes, for every new page section.
- One entry per step in `implementationlog.md`, and the items above ticked.
