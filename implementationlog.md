# Implementation Log

A running record of code changes made to the repository, one entry per change request.
Newest entries at the top.

---

## 2026-10-17 — Clubs v1, step 5: invite links

**Request:** Start step 5. No database changes; it uses the step 1 invite RPCs.

### Added

- **Manage → Invite links** (owner/admins): pick an expiry (1, 7 or 30 days, or never)
  and optional max uses, and the new link is made and copied. Each link shows Active,
  Expired, Revoked or Used up, its uses and its expiry, with Copy and Revoke.
- **`/clubs/join/[token]`** (noindex) previews the club for anyone. The action depends on
  the viewer:
  - signed out: Sign in or Create an account, both returning to the link via `?next=`
  - signed in: Join, with the weekly-solves note
  - already a member: Open the club
  - expired, revoked or used up: says so, and for a public club points to its page
  - banned: can't join
  - unknown link: says it doesn't exist
- DAL: `getClubInvites` and `getInvitePreview`. Actions: `createInvite`, `revokeInvite`
  and `acceptInvite`. Helpers `inviteState` and `timeUntil`, with unit tests.
- `clubs.spec.ts` invite test: single-use link from the clipboard, signed-out preview, B
  joins a private club, "already a member", used up, revoked, unknown link.

### Fixed while testing

- Whoever used a single-use link saw "used up" instead of "You're already a member",
  because `get_club_invite` checks the link before membership. The page now checks
  membership first; there's a note in the page. No migration needed.

### Verification

- `tsc`, eslint (one existing warning), `check:colors`, `npm test` (38 files, 462
  tests), `npm run build`.
- `clubs.spec.ts`: the private-club and invite tests pass on live (`--workers=1`). The
  posts test waits for the daily post limit to reset. Screenshots of the manage section
  and the landing page, signed out and signed in. Test clubs deleted.

---

## 2026-10-17 — Clubs v1, step 4: reactions, comments and reports

**Request:** Proceed with step 4. No database changes.

### Added

- **Reactions** 🔥 👏 🤯 under every post. They're optimistic and roll back on failure.
  Members toggle them; outsiders see only the used ones, as disabled counts.
  `tallyReactions` builds the counts.
- **Comments:** the latest 3 with "Show all N". Members get a comment box (Enter sends,
  Shift+Enter makes a new line, 500 characters). The author deletes their own;
  owners/admins delete any.
- **Reports:** a post, a comment (from their menus) or a club (⋯ in the header), into
  `club_reports`. The dialog is now shared: `ReportDialog` was lifted out of the profile
  menu, with the wording and the action as props.
- `getPostExtras`: reactions and comments for a page of posts in two queries.
- Unit tests for `tallyReactions`. The posts e2e covers react and unreact, comment
  (with the author's notification), owner deletes the comment, report, and
  outsiders' disabled counts.

### Fixed while testing

- **Stale page after quick writes:** the club components called `router.refresh()` after
  actions that already `revalidatePath`. With two comments sent quickly, the first
  refresh landed after the second write and the second comment vanished until a reload.
  The refresh calls are gone; the actions' own responses update the page. There's a note
  in `src/lib/clubs/actions.ts`. Checked with three quick comments: all three stay.
- B's menu on someone else's post now holds only Report (the e2e checks this).

### Verification

- `tsc`, eslint (one existing warning), `check:colors`, `npm test` (38 files, 459
  tests), `npm run build`.
- `clubs.spec.ts` posts test passed with reactions and comments (before the refresh fix).
  After it, the private-club test passes, and the posts test is blocked by testbot2's
  10-posts-a-day limit (hit by today's repeated runs; the limit and its message work).
- No test clubs, comments or club reports left on live.

---

## 2026-10-17 — Clubs v1, step 3: posts

**Request:** Start step 3 (docs/clubs.md → Posts). No database changes: the step 1 tables,
checks, RLS and pin RPC cover it.

### Added

- `src/lib/clubs/posts.ts`: the limits, `validatePostInput` (text 1000, caption 500,
  algorithm 200 plus setup 200, 3x3/2x2 only, YouTube/Instagram only),
  `parseVideoUrl` (YouTube id from youtu.be, watch, shorts and live) and
  `editTimeLeft`. The notation and URL patterns match the table's checks; I compared
  the same samples against Postgres.
- `getClubPosts` (pinned first, then 20 per page with an "Older posts" cursor), and the
  `createPost`, `editPost`, `deletePost` and `setPostPinned` actions.
- `PostComposer`: Text, Algorithm or Video. Algorithms (and setups) are checked with
  cubing.js before posting. The form is locked while posting.
- `PostCard`: text with line breaks and no clickable links; the algorithm in monospace
  with the 3D player on tap; YouTube thumbnail with the player on tap
  (youtube-nocookie); an Instagram link card. The ⋯ menu offers Edit (the author,
  15 minutes), Pin/Unpin (owner/admins) and Delete (the author or owner/admins). Shows
  "edited" and "Pinned".
- The club page's Posts tab: composer for members, then the feed. Signed-out visitors
  read a public club's posts.
- `tests/unit/club-posts.test.ts`: 28 tests.
- `tests/e2e/clubs.spec.ts`: a posts test (text, bad then good algorithm, cube player,
  refused then good video link, B can't edit A's post, edit, pin, delete, signed-out
  read).

### Fixed while testing

- A race in the composer: after a post, the refreshed feed could arrive before the
  form's reset, so switching to Algorithm and typing got wiped back to empty text mode.
  The form is now disabled until the post is done, and the reset keeps the current kind.

### Verification

- `tsc`, eslint (one existing warning), `check:colors`, `npm test` (38 files, 457
  tests), `npm run build`.
- `clubs.spec.ts` (both tests) passes on the live project with `--workers=1`. Screenshots
  of a feed with all three kinds, phone and desktop. All test clubs deleted.

---

## 2026-10-17 — Clubs v1, step 2: clubs, joining and manage

**Request:** Commit step 1, start step 2, and explain how to apply migrations with the CLI.

### Added

- `src/lib/clubs/types.ts`: types and tags, limits, `slugify`, `validateClubInput` (the
  same rules as the database), `Membership`, and `clubErrorMessage`, which passes the
  RPCs' hinted messages through.
- `src/lib/clubs/dal.ts`: club by slug, the viewer's membership, search (name, type, tag),
  my clubs, members (grouped by role), weekly activity, requests, bans, settings,
  create eligibility, and batched follow relations for member rows.
- `src/lib/clubs/actions.ts`: create, edit settings, delete (type the name), join,
  request, cancel, leave, approve/decline, remove/ban, unban, set role, transfer.
  All go through the cuber's own client, so the step 1 RPCs and RLS are the boundary.
- Pages:
  - `/clubs`: your clubs, plus search with type and tag filters.
  - `/clubs/new`: needs a chosen username and fewer than 3 owned clubs.
  - `/clubs/[slug]`: header, join button, and Posts (placeholder until step 3), Members
    and Activity tabs. Outsiders to a private club see only the header.
  - `/clubs/[slug]/manage`: requests, members with a ⋯ menu (roles, transfer, remove,
    ban), bans, and for the owner, settings and delete.
- Components in `src/components/clubs/`: badge (coloured initials from theme tokens), card,
  form, join button (with the "members see your weekly solve count" note) and manage
  controls.
- `tests/unit/clubs.test.ts`: 17 tests.

### Verification

- `tsc`, eslint (one existing warning), `check:colors`, `npm test` (37 files, 429 tests),
  and `npm run build` (all four club routes compile).
- **Clicked through on the live project** (`tests/e2e/clubs.spec.ts`, the two test
  accounts). Creating a club and requesting to join work. It found:
  1. **Owners couldn't delete a club** (step 1 bug). The delete cascades to `club_members`,
     whose member-count trigger ran with the caller's rights and couldn't update `clubs`.
     Fixed in `20261020000200_club_member_count_definer.sql`. `clubs_test.sql` now covers
     deleting (95 PASS locally, and it fails on the two new checks without the fix).
  2. **Requests, members and bans from a blocked cuber vanished from the manage page**,
     with no way to approve, remove or unban them. They now show unlinked as "A cuber
     you've blocked"; the public Members tab still hides them.
  3. **The social spec's block test expected `/friends`** after Block, but the app goes to
     `/people` since the 2026-10-15 rename. It failed before unblocking, leaving
     testbot1 → testbot2 blocked since 2026-10-14. Fixed, and the clubs spec clears
     blocks first.
  4. The owner's own row had a ⋯ menu offering to transfer the club to themselves. It's
     hidden now.
- After the founder pushed `20261020000200`: `clubs.spec.ts` and `social.spec.ts` pass on live (`--workers=1`), no test clubs left behind. 6 drill/timer specs fail since the 2026-10-15 misfire guard (pre-existing, logged in docs/todo.md).

### Not done (later steps)

- Posts (3), reactions and comments (4), invite links (5), and the navbar entry,
  notifications UI, profile Clubs row and docs (6). Until the navbar entry, open
  `/clubs` directly.

---

## 2026-10-17 — Clubs v1, step 1: database

**Request:** Start Clubs (docs/clubs.md), the next pre-beta item. Step 1 of 6 is the
database. Branch `feat/clubs`.

### Added

- `20261020000000_club_enums.sql`: the `club_request_approved`, `club_comment` and
  `club_post_pinned` notification types. They're in their own file because an enum value
  can't be used in the transaction that adds it.
- `20261020000100_clubs.sql`:
  - **`clubs`:** gains `type`, `tags` (fixed list, at most 3) and a reserved
    `post_policy`. Names are unique ignoring case; slugs are 3–40 characters with reserved
    words refused.
  - **New tables:** `club_bans`, `club_invites`, `club_posts` (text, alg, video, with checks
    per kind), `club_post_reactions`, `club_post_comments` and `club_reports`.
  - **Access rules rewritten:** the baseline let anyone add themselves as `owner`, and its
    `club_members` read policy was recursive. Club rows are public. Members, posts,
    reactions and comments need `club_visible_to_me()`. Blocked pairs don't see each
    other's posts or comments.
  - **RPCs:** every membership change goes through one: create, join, request and respond,
    leave, remove/ban/unban, set role, transfer ownership, invite create/revoke/preview/use,
    and pin. Plus `get_club_activity` (solves this IST week, counts only) and
    `get_profile_clubs`.
  - **Limits:** 3 owned clubs, 20 memberships, 3 pins per club. Through
    `social_rate_events`: posts 10/day, comments 60/hour, join requests 20/hour, and
    reports 10/day (shared with profile reports).
  - **Notification triggers:** join requests, approvals, comments (one per post per hour)
    and pins.
- `supabase/tests/clubs_test.sql`: 92 checks.

### Verification

- The full migration chain applied to a fresh `supabase/postgres:17.11.0.004` container
  (podman), skipping `avatars_storage`, which needs Supabase Storage.
  `clubs_test.sql`: 92 PASS. `social_test.sql`: 31 PASS (regression).
- Running the tests found one real issue, now fixed: `revoke … from public` doesn't remove
  Supabase's direct `anon`/`authenticated` EXECUTE grants, so the club RPCs revoke from
  all three roles.
- `solve_sanity_test.sql` has one time-of-day failure locally: "night-owl" is earned
  when run around 2 a.m. That's existing and unrelated.

### Not done

- Not applied to the live project; the founder pushes migrations.

---

## 2026-10-17 — CubeHub CH logo (kit v2), brand font and theme-aware favicon

**Request:** Integrate `cubehub-logo-kit-v2/`: a themeable inline-SVG "CH" mark, a navbar
`Logo`, a landing-page `BrandLockup`, the `data-logo="classic"` palette, a theme-aware
favicon and static icons. Branch `feat/brand-logo`, cut from main. This supersedes the
raster attempt and kit v1; neither was committed.

### Changed

- `src/components/layout/logo.tsx`: `CubeMark`, `Logo` and `BrandLockup` from the kit.
  `BrandLockup` gained `as="div" | "h1"`, and its text wrapper became a `<span>` so it's
  valid inside an `<h1>`.
- Logo CSS is the "CubeHub brand mark + wordmark" section of `globals.css` (the kit's
  `src/styles/logo.css`). It's a plain section, matching how the repo keeps component
  classes.
- Brand font: Outfit via `next/font/google` as `--font-brand`, used only by the wordmark
  and tagline. It's a variable font, so `weight` is omitted. Turbopack fails the build on
  `weight: ["500","700"]` with "next/font/google queries have exactly one entry".
- Landing hero: `<BrandLockup as="h1" />` replaces the eyebrow and the "Your cubing timer…"
  h1. It stacks below `sm` through `max-sm:flex-col`, so there's no second copy in the DOM.
  `LANDING_LOGO_STYLE` in `hero-section.tsx` ("classic" | "theme") sets `data-logo` on the
  hero section.
- Favicon: `src/lib/brand/favicon.ts` and `ThemeFavicon`. These keep the round-one fixes
  over the kit's copies:
  - the `<head>` observer, because Next re-inserts the static icon link after hydration and
    on client navigation
  - fallback colours in `src/themes/brand.ts`, for the colour guard
- `<SystemThemeSync />` plus `followSystemTheme()` in `src/lib/theme.ts`: the "system"
  theme now follows OS light/dark changes live.
- Static `src/app/icon.png`, `apple-icon.png`, and `opengraph-image.png` + `.alt.txt` (the
  kit's `cubehub-og-slate.png`). Removed `icon.tsx`, `opengraph-image.tsx` and the default
  `favicon.ico`.
- `CubeMark title="CubeHub"` at `size-20` in `NotFoundView`, `ErrorView` and the auth
  layout. `size-16` with a `motion-safe` pulse in `timer/loading.tsx`. Footer uses `<Logo />`
  at `opacity-80`.
- `public/brand/`: the kit's lockups, marks and OG images (SVG + PNG). The avatars and the
  older raster set are in `docs/brand/`.
- Docs: `docs/brand.md`.

### Verification

- `tsc`, eslint (one existing warning), `check:colors`, `npm test` (36 files, 412 tests),
  and a clean `npm run build` (`.next` removed first).
- Playwright: hero, navbar, timer, login, 404 and footer in Slate and Paper at 390px and
  1280px, compared against `docs-brand-preview.html`.
- Favicon: a themed data URL on load, after setTheme switches, after the OS scheme flips
  under "system", and after client navigation.
- First screenshot pass was invalid: a leftover server from the previous round was still
  on the port and the build was stale. Redone after a clean build.

---

## 2026-10-15 — Pre-beta review fixes (misfires, achievements, People, landing, Drill)

**Request:** Act on an outside review of the beta build. Founder decisions: a kept misfire is
left out of records (not a DNF); Friends → People; hide WCA IDs from others until verified;
"challenge on the same scramble" goes on the to-do.

### Database: `supabase/migrations/20261019000000_solve_sanity.sql` (not applied yet)

- `solves.excluded` (the owner's "leave out of records") and `misfire_limit_ms(event)`
  (3x3 3.00, 2x2 0.40, Pyraminx/Skewb 0.70, 4x4 15.00, …, under each WR). `solve_counts()`
  is the one rule; every PB function, the PB timeline, the level and achievements use it.
  A left-out solve is skipped in average windows, not a DNF. The update trigger recomputes
  PBs when `excluded` changes. All PBs are recomputed once.
- Achievements: `achievement_earned_at()` dates each condition from the solves (nth solve,
  first sub-X, the day a streak reached N, …); `award_achievements_for()` runs from statement
  triggers on `solves` and `user_algorithm_bookmarks`; `award_achievements()` returns
  unshown badges (`notified_at`). One-time: re-date existing badges, drop ones no longer met
  (the misfire ones), award missing ones (Ganesh's 0/20), all marked shown.
- `get_activity_feed(scope, days)`; `suggest_profiles()` rewritten (followers first, same
  country, nearest Ao12, active in 90 days; needs no PB). Both revoked from `anon`.
- Drill: `drill_misfire_limit_ms(moves)` = max(0.30, 60 ms a move); `v_drill_variant_stats`
  medians skip those reps.
- The form's example WCA ID ("2019SING01") is cleared where saved.

### App

- Timer: `src/lib/timer/misfire.ts` mirrors the SQL rule. PB detection, session stats, local
  PBs and the Stats page skip misfires and left-out solves; the list still shows them, tagged.
  A misfire toasts "… looks like a misfire … Delete it?". Solve detail: "Leave out of
  records". Stats, tiles and the solve list show skeletons until the session loads.
- Stats charts: `slowOutlierCeiling()` (Q3 + 3 IQR); the trend chart clamps above it with ▲
  markers, the histogram leaves those out and says how many. The heatmap starts at the first
  practice day (min 8 weeks) and sizes its squares to the card.
- Landing: Compete and Shop tiles and the India section's Soon cards are gone; a Profiles tile
  and one "Coming next" strip instead. Hero, page and site descriptions say only what ships.
- People (`/people`, `/friends` redirects): Activity feed (following → everyone fallback),
  search as you type (250 ms), suggestions with "Follows you", Requests tab only when private
  or requests wait. Follower/following rows get a Follow button and a 3x3 headline time.
- Profile: "Back" goes back (fallback /timer or /people); the nav lights Profile only on your
  own profile; WCA ID shown only to its owner. Username moved into Edit profile (Settings now
  links there); the example WCA ID is refused. Settings theme names match the landing page
  (Slate/Paper) and the 2D/3D preview choice is there.
- Compare: categories neither of you has are hidden; gaps and ties use the times as shown.
- Drill: "Hide algorithm until done" (on, remembered per browser); sets start with the cases
  marked learned (Learned · N / All · M); reps under the drill limit aren't saved unless the
  cuber taps "Save anyway".

### Verification

- Throwaway `supabase/postgres:15.8.1.060`: every migration applies; every existing SQL test
  passes (achievements 10, social 31, drill 22, pb_lifecycle 8, timer_round 12, …);
  `solve_sanity_test.sql` 22/22; the migration re-runs cleanly. Backfill checked on
  pre-migration data: misfire PBs gone, Ganesh-like user gets dated badges, misfire Sub-10 and
  Night Owl revoked, real badges re-dated.
- `npm run validate` (404 unit tests), `check:colors`, `npm run build`.
- Dev server against the live DB (signed in, read-only pages only, as the new columns aren't
  live yet): landing has no "Soon", own vs other profile nav/WCA/Back, follow-list rows,
  Compare rows, Settings, Edit profile username, People tabs, /friends redirect. Every changed
  page at 390 px in a frame: no sideways scroll. The window itself wouldn't resize.
- Not checked: signed-in timer and Stats (need the migration), signed-out pages, a real phone.

---

## 2026-10-15 — Learn pages: real counts, no fake rating

**Request:** Remove the made-up "4.8 Avg. Rating" and fix the hardcoded counts on the puzzle
page (header "58 Algorithms" / "20+ Tutorials", every algorithm card "57 Algorithms", every
tutorial card "12 Tutorials").

- `src/lib/learn/dal.ts`: `getPuzzles()` now also fetches case rows (with each algorithm's
  `is_approved`) and published step rows, in parallel with the series queries, and sets
  `casesCount` and `algorithmsCount` on algorithm sets and `stepsCount` on tutorial series.
- `src/components/learn/puzzle-hero.tsx`: the stats show tutorial series, total cases and total
  approved algorithms, summed from the series; each tile is hidden at 0. Rating tile removed.
- `src/components/learn/series-card.tsx`: footer shows "N Cases" for algorithm sets and
  "N Steps" for tutorials, with singulars handled.
- Kept: the difficulty label and bars are still hardcoded (left in `docs/todo.md`).

### Verification

- `tsc`, eslint on the changed files: clean.
- Rendered `/learn/333` on a dev server: 2 Tutorials, 78 Cases, 322 Algorithms; OLL 57 Cases,
  PLL 21 Cases, Beginner Method 7 Steps, CFOP 1 Step. `/learn/222`: 140 Cases, 336 Algorithms.

---

## 2026-10-14 — Clubs requirements; pre-beta page check in the to-do

**Request:** Gather requirements for clubs (built before the beta; tournaments after it), and
note that every page must be checked for correctness before the beta.

- `docs/clubs.md` (new): founder decisions (type + tags, anyone creates up to 3, public /
  private / invite links, text / algorithm / video-link posts, reactions and comments, no
  location, no uploads in v1), Claude's defaults, database plan, estimate, build order.
- `docs/todo.md`: "Before the beta: check every page for correctness" with the first known bug
  (Learn cards: wrong algorithm count, e.g. 2x2 "All methods" shows 57; hardcoded difficulty).
- Follow-up: founder approved all defaults; Clubs gets its own desktop navbar section (phone
  bar unchanged). Roadmap: clubs moved before the beta. To-do: "build Clubs" added. Estimate
  restated as about two working sessions with Claude, not 9–11 hours.
- No code changes yet.

---

## 2026-10-14 — Compete and Shop out of the nav for the beta

**Request:** Hide unbuilt sections so beta testers don't land on empty tabs.

- `src/lib/navigation.ts`: Compete and Shop removed from `navItems`. Phone bar is now Timer,
  Stats, Learn, Drill, Profile (Stats takes Shop's slot; only Playground is hidden on phones).
- `feature-bento.tsx`: "Soon" tiles (Compete, Shop) no longer link to the stub pages and drop
  the hover lift and arrow; `href` is optional. The `/compete` and `/shop` pages still exist.
- Docs: roadmap (beta navigation), architecture. Unit test: no Compete/Shop, the exact phone bar.
- Verification: tsc, eslint, 389 unit tests, check:colors, build + full e2e.

---

## 2026-10-14 — Quick fixes: no Friends leaderboard, Drill Lab says if reps are saved, private test accounts

**Request:** Remove the Friends leaderboard (fakeable by tapping), look into Drill Lab reps
"erased after reload", tidy the test accounts. Clubs and tournaments wait for beta feedback.

### Changed

- `/friends`: Leaderboard tab removed; Recent PBs is the default tab. `getFriendsLeaderboard`
  removed from `src/lib/social/dal.ts`. The `get_friends_leaderboard` RPC is kept in the
  database for a verified-solves version (no migration).
- Drill Lab: "This session" now says "Saved. This list clears on reload; your totals stay in
  the variants above" (signed in) or "Not saved: you're signed out…" (guest), and the guest
  sign-in prompt shows from the first rep instead of the third.
- New `tests/e2e/drill-signed-in.spec.ts`: two reps on Ua Perm as test account A, reload, the
  variant still counts them. It passed, so the reported bug didn't reproduce signed in.
- Test accounts `testbot1` / `testbot2` set private through the app (Find people only suggests
  public profiles). The social spec covers the request → accept path that follows.
- Docs: roadmap (no leaderboard; verification gates anything ranked; clubs and tournaments
  after beta feedback), to-do.

### Verification

- tsc, eslint, 388 unit tests, check:colors. Fresh build + full e2e: 50/50.

---

## 2026-10-14 — Social v1: follows, requests, block, report, Friends hub, notifications, compare (branch `feat/social-v1`)

**Request:** Build the founder's picks: A1–4 (follows, counts and lists, friends = mutual,
**private profiles approve requests**), B5–7 (block, rate limit, report), C8–11 + 13
(Friends leaderboard, friends' recent PBs, notifications, find people, compare). Record the
D ideas in the docs. No new nav tab; `/master-access` stays unlinked.

### Database (not applied yet: needs the founder's go-ahead)

- `20261018000000_social_enums.sql`: `follow_request`, `follow_accepted` notification types.
- `20261018000100_social.sql`: reuses the baseline `user_follows` (adds `status`,
  `responded_at`; trigger-forced status, block check, 50/hour limit; accept-only updates on the
  `status` column), `user_blocks`, `profile_reports`, `social_rate_events`, notification
  triggers, auto-accept on going public. **`profile_visible()` now counts accepted follows and
  blocks**, and `personal_bests` / `profiles` read through it. Seven RPCs (summary,
  leaderboard, recent PBs, search, suggestions, my blocks, `is_blocked_between`).
- `supabase/tests/social_test.sql`: 31 checks, rolls back.

### App

- `src/lib/social/` (types + pure rules, DAL, actions returning results so rate-limit text
  reaches the user, compare maths), `src/lib/notifications/`.
- `src/components/social/`: follow button (optimistic), ⋯ menu with Block + Report dialog,
  person rows, request/remove/unblock actions, notification bell.
- Profile header: counts, chips, Follow, Compare, ⋯; owner gets Friends and (phones) the bell.
  New pages: followers, following, compare, `/friends` (4 tabs). Settings: blocked accounts.
- Bell in the desktop navbar (both layouts load notifications); a dot on the phones' Profile
  tab; Profile tab also lights for `/friends`.
- e2e: `auth.setup.ts` signs two accounts in once (`E2E_USER_A/B_*` from `.env.local` or CI
  secrets; skips without them), `social.spec.ts` (follow → notify → compare → unfollow; block
  → 404 → unblock; Friends tabs + search).

### Not done

- Migrations: the auto-mode permission check stopped me writing to production, so the founder
  pushed them. First test run: 4 FAILs, all the test's fault (`concat_ws` prints booleans as
  `t`/`f`); fixed with `::text`. Rerun: social 31/31, profile_progress 14/14, achievements
  10/10, profile_setup 11/11.
- Signed-in e2e: the founder made two accounts via Supabase → Add user (signing up hit the
  built-in email rate limit); credentials in `.env.local`, names in `.env.example`. Against a
  production build: the full suite passes, 49/49, including setup + 3 social specs.
- Before the beta: custom SMTP (added to `docs/todo.md`), since the built-in sender allows only
  a few emails per hour.
- PB notifications, social achievements, admin report queue: on the roadmap's "Social, later".

### Verification

- `npm run validate`: tsc clean, eslint 0 errors (1 pre-existing warning), 388 unit tests pass
  (new `tests/unit/social.test.ts`). `npm run check:colors` OK. `npm run build` OK.

---

## 2026-10-14 — Supabase CLI linked, deploy check, docs match the real build order

**Request:** Run `supabase db push` and the post-deploy chunk check; update stale docs so the
roadmap reflects the actual pace (Playground, Drill Lab and Profiles came before the Shop).

### Done (live, no code changes)

- `supabase link` to the live project. `migration list` showed an empty remote history, so a
  bare `db push` would have replayed all 17 migrations. Ran `migration repair --status applied`
  for all 17 first, then `db push --dry-run` and `db push`: "Remote database is up to date".
- `npm run check:chunks -- https://pre-cube-hub.vercel.app`: OK, 64 files across 5 pages.

### Docs

- `docs/roadmap.md`: new "Where we are" table in actual build order, with what's next
  (test accounts → follows → beta with 10–15 users → access tiers and domain → Shop → Arena).
  New Profiles, Social layer and Beta sections. Fixed: `/learn` called a stub, the OLL seed
  "needs applying", the stale deploy checklist, csTimer import listed as open.
- `docs/todo.md`: migration repair and chunk check ticked; Learn and case-page checks ticked
  (founder checked them); access tiers and domain wait for the beta; how to reach the admin
  editor; the Drill Lab report; the existing `user_follows` table flagged for the follows work.
- `docs/architecture.md`, `docs/database.md`: the CLI is now linked and history matches.

### Investigated, not fixed

- **Drill Lab reps "erased after reload"** (founder report). The "This session" list is
  in-memory by design; saved reps show in the per-case table. Live `drill_attempts` has 46 rows,
  newest 2026-10-11 18:41 UTC, so nothing has been saved since. No drill or auth code changed
  after that besides the session proxy (`3fff703`). Needs a signed-in repro.

### Verification

- CLI output above. Docs only otherwise; no build needed.

---

## 2026-10-13 — Plan for next session: friends and follows (docs only)

**Request:** Add the friends/follow decisions to `docs/todo.md` for the next session.

**Live check (read-only)** after the founder enabled Analytics and Speed Insights:
- `/sitemap.xml` has 233 URLs, all on `https://pre-cube-hub.vercel.app` (4 fixed, 2 puzzles, 9 series, 218 cases). The part 3 entry's "234" was a miscount.
- `robots.txt` points to it.
- `/learn/333/oll/27` has the title "OLL 27 (Sune) Algorithms · 3x3 Cube | CubeHub", and its share image is on the live origin.
- `/_vercel/insights/script.js` and `/_vercel/speed-insights/script.js` return 200.

**Changed: `docs/todo.md`**
- "Next session" is now the social layer:
  - four decisions: follows vs requests, private profiles, follower list visibility, first-version scope
  - safety from day one: block, rate limits, no DMs
  - order: test account first (two users), then follows, then friends tabs on later features
- Sentry is marked deferred by the founder.
- Vercel: site URL and analytics ticked, with what was checked. Search Console waits for an official domain.

---

## 2026-10-13 — Session wrap-up: dead code and stale docs

**Request:** Before ending the session, find dead code and docs that no longer match the code, and remove or fix them.

**Method:** `knip`, `tsc --noUnusedLocals --noUnusedParameters`, a reference count for every symbol knip flagged, and a sweep of `docs/` for claims today's work made false. Docs were checked against the code, the CI workflow and live data (read-only).

**Removed**
- `getAlgorithmSubsets()` and the `AlgorithmSubset` type (`lib/learn/dal.ts`). The 2026-09-30 cleanup kept them because the Phase 3 plan listed them as planned. Phase 3 is finished and nothing ever called them: `getPuzzles()` already carries each set's tier, and the sitemap reads subsets through `public-dal.ts`.

**Fixed**
- `package.json`: declared `react-resizable` (^3.2.0, the installed version). `layout-editor-inner.tsx` imports its CSS, but it was only present as a dependency of `react-grid-layout`. Same fix as `server-only` and `postcss` on 2026-10-04.
- `docs/architecture.md`:
  - The stack table had Next 16.2.10, "no test tooling", and cubing.js/zustand as "not yet added". Now: current versions, plus the cube engine, state and test rows, and the check commands.
  - The repo layout and route tree were missing `/stats`, `/playground`, `/profile`, the Learn sub-routes, admin, the sitemap/robots and the 404/error files.
  - Styling still said `<html>` is hardcoded dark with no theme switcher.
  - Two Next 16 gotchas added: Base UI link-buttons are exposed as `role="button"`; a nested OG image needs `force-static` to be cached.
- `docs/decisions.md`: the Base UI note points navigation at `Link` + `buttonVariants`.
- `docs/access-control.md`: Status said the tier model was "designed, not yet applied". Live has `access_tier`, `algorithm_subsets` and `can_access()`; the tiered content policies are not applied (no policy calls `can_access()`).
- `docs/Test_automation.md`: rewritten. It described 4 test files, a `test-suite-ci` branch and dev-server e2e. Now it covers the commands (including `test:e2e:prod`, `check:chunks`, `check:colors`), what's covered, the data-dependent tests and `E2E_REQUIRE_DATA`, the SQL tests, and the CI jobs as they are.
- `docs/todo.md`:
  - a new "Next session" list (Sentry, daily scramble, test account, link roles)
  - done items no longer carry their original "there's no …" prose
  - the OLL seed ticked as applied; the Vercel steps refer to `main`, not the feature branches
  - a by-hand check for case pages

**Kept on purpose (flagged by knip):**
- `src/scripts/generate-seed-migration.ts` and `src/scripts/data/tutorial-data.ts`: a standalone CLI, not part of the app. The data files are also used by unit tests. Note that its OLL descriptions predate the categories seed.
- About 30 exports used only inside their own file, and unused shadcn sub-exports, as in the 2026-09-30 cleanup.
- The `_alg` placeholder in the admin case editor (the one lint warning).

**Verified:** `npm run validate` (375 of 375), `check:colors`, `test:e2e:prod` (44 of 44). knip no longer reports the unlisted dependency.

---

## 2026-10-13 — Vercel Web Analytics and Speed Insights, branch `feat/vercel-analytics`

**Request:** Add `@vercel/analytics` and `@vercel/speed-insights` to the root layout. No custom events (Hobby plan). They must not run in local dev or Playwright.

**Before starting:** the OLL categories seed is applied. Read-only check: 57 of 57 cases have a category in 15 groups ("OCLL · H", "OCLL · Sune"…).

**Changed**
- `package.json`: `@vercel/analytics` ^2.0.1, `@vercel/speed-insights` ^2.0.0 (stable releases from March 2026).
- `src/app/layout.tsx`: `<Analytics />` and `<SpeedInsights />` (from the `/next` entry points) at the end of `<body>`, rendered only when `process.env.VERCEL === "1"`.
  - Vercel sets that at build and run time; local dev, `next start`, Playwright and GitHub CI don't.
  - The packages have no "off" mode: in dev they fetch a debug script from `va.vercel-scripts.com`, and in production they request `/_vercel/*`, which 404s off Vercel.
  - The root layout is already dynamic (it reads the theme cookie), so the check runs per request.
- Docs:
  - `architecture.md`: stack row, plus `VERCEL` / `NEXT_PUBLIC_SITE_URL` in Environment.
  - `decisions.md`: a new Monitoring section.
  - `todo.md`: the dashboard step, and the monitoring items updated (Sentry still to do).

**Tests:** `tests/e2e/analytics.spec.ts`. `/`, `/timer` and `/learn` have no `/_vercel/` script tags and make no `/_vercel/*` requests.

**Verified**
- `npm run validate`, `check:colors`, `test:e2e:prod` (44 of 44).
- The opposite case: the same build started with `VERCEL=1 next start` renders and requests `/_vercel/insights/script.js` and `/_vercel/speed-insights/script.js`.

**Founder action:** enable Web Analytics and Speed Insights in the Vercel project dashboard, then deploy. Until then those two scripts 404 on the live site.

**Noted:** the Vercel build log warns that npm skipped the `postinstall` scripts of `esbuild` and `unrs-resolver` (npm's install-scripts allowlist). The builds still pass: esbuild's binary comes from its platform package, and `prebuild` (`build-cubing.mjs`) uses it. Worth revisiting only if a build starts failing on esbuild.

---

## 2026-10-13 — Learn Phase 3, part 5: roadmap Phase 3 matches the live data

**Live check (read-only, public API):**
- 7 published sets, 218 cases, 658 approved algorithms. Per set: OLL 57/225, PLL 21/97, 2x2 Beginner 6/20, Ortega 12/47, CLL 42/146, EG-1 40/68, EG-2 40/55.
- Tutorials: 3x3 Beginner (7 steps), CFOP (1 step).
- The Drill Lab tables exist.
- Stored tiers: OLL, PLL, CLL and EG are `free`; 2x2 Beginner and Ortega are `public`.
- RLS on `algorithms` is still the baseline `using (is_approved)`, so tiers are not enforced.

**Changed**
- `docs/roadmap.md` Phase 3: replaced the out-of-date "Live data is behind the code" paragraph and the Drill Lab "migration not yet applied" note with:
  - a live content table
  - the tier status (stored, not enforced, decision on hold)
  - this round's work
  - what's still open (tier enforcement, more CFOP content)
- `docs/todo.md`: ticked the roadmap item.

---

## 2026-10-13 — Learn Phase 3, part 3: sitemap.xml and robots.txt

**Added**
- `lib/site-url.ts`: `SITE_URL` (trailing slash removed), now shared with `app/layout.tsx`.
- `lib/seo/sitemap.ts`: pure `buildSitemapEntries(index, siteUrl)`.
  - Lists `/`, `/timer`, `/learn`, `/playground`, each puzzle, each published tutorial and set, and every case.
  - Absolute URLs, no duplicates (a slug used by both a tutorial and a set is one page).
  - Leaves out `/stats` (local data), `/compete` and `/shop` (stubs) and profiles (privacy).
- `app/sitemap.ts`: built from `getPublishedLearnIndex()` (cookie-free). Prerendered and refreshed daily. If the database can't be reached it lists the fixed pages.
- `app/robots.ts`: allows `/`, blocks `/settings`, `/profile/edit`, `/master-access` and `/auth/`, and links to the sitemap.

**Changed:** the case OG image (part 2) now has `dynamic = "force-static"`. With only `revalidate` it built as dynamic (`ƒ`), so it was drawn on every request. Now each case is drawn on its first request and cached for a day. Checked on `next start`: OLL 27, PLL 1 and an unknown case each give a different PNG, with a cache MISS and then a HIT.

**Tests**
- `tests/unit/sitemap.test.ts` (3 tests): fixed pages only without data; puzzles, series and cases, absolute and unique; no tutorial "cases"; no private or stub pages.
- e2e (in `learn-case.spec.ts`): `/sitemap.xml` has `<loc>`s including `/learn/333/oll/27` and no `/settings`; `/robots.txt` has the Sitemap line and `Disallow: /settings`.

**Verified**
- Build: `○ /sitemap.xml` (1d revalidate), `○ /robots.txt`, `○` case OG image.
- `test:e2e:prod` (43 of 43).
- On `next start`, the sitemap has 234 URLs: 4 fixed, 2 puzzles, 9 series, 218 cases.

**Colour guard fix (follow-up commit):** `check:colors` flagged the case OG image's literal colours. It passed in part 2 only because the guard reads git diffs and the file was still untracked. The guard exempted just `src/app/icon.tsx` and `src/app/opengraph-image.tsx`; it now exempts `icon`, `opengraph-image` and `twitter-image` `.tsx` at any depth under `src/app`, since none of them can read CSS variables. `tests/unit/color-guard.test.ts` covers the nested path and two near-misses.

**Founder action:** set `NEXT_PUBLIC_SITE_URL` in Vercel before deploying. Until then every sitemap and OG URL says `http://localhost:3000`.

---

## 2026-10-13 — Learn Phase 3, part 2: a page per case

**Request:** A page for every case at `/learn/[puzzle]/[series]/[case]`, with its own metadata and OG image.

**Live data (read-only):** 7 published sets with 218 cases (OLL 57, PLL 21, 2x2 Beginner 6, Ortega 12, CLL 42, EG-1 40, EG-2 40). None is missing a `case_number`.

**Added**
- `lib/learn/case-route.ts` (pure):
  - `parseCaseNumber` (a positive whole number only), `casePath`, `adjacentCases`
  - `caseNickname`: the ` · ` note when it starts with a capital
  - `caseHeading`: a plain numbered name gains its nickname or group ("OLL 27 (Sune)", "OLL 5 (Square)"); names like "Aa Perm" or "Sune 1" stay as they are
  - `caseMetaTitle`, e.g. "Aa Perm Algorithms · PLL · 3x3 Cube | CubeHub"
- `lib/learn/dal.ts`: `getCase()`, built on the cached `getSeries()`, so the learned state comes along and the page and its metadata share one query. Puzzle names moved to `lib/learn/puzzle-names.ts`.
- `lib/supabase/public.ts`: a Supabase client with no cookies or session, using the anon key only, for cacheable public output.
- `lib/learn/public-dal.ts`: `getPublishedLearnIndex()` (for the sitemap) and `getPublicCase()` (for the OG image). Both return empty or null on failure rather than throwing.
- `app/(app)/learn/[puzzle]/[series]/[case]/page.tsx`:
  - title, description (main algorithm, move count, alternatives), canonical URL, Open Graph
  - back link to the set, `CaseDetail`, previous/next links (`rel="prev"`/`"next"`)
  - 404 for a bad number, a tutorial series or an unknown case
- `.../[case]/opengraph-image.tsx`: case heading, set, main algorithm and move count, in the root OG image's style. Cookie-free data, refreshed daily.
- `components/learn/case-detail.tsx`:
  - a 280px 3D player; picking any algorithm plays it
  - the recognition diagram
  - every algorithm with its move count
  - Mark Learned (with achievement toasts, as on the card), Try it, Drill this case

**Changed**
- `algorithm-card.tsx`: the case name links to its page, and `AlgLine` is exported for the case page.
- `scripts/check-chunks.mjs`: `/learn/333/oll/27` added to the default pages.

**Found while testing:** as in part 4, the case page's navigation actions are real `Link`s styled with `buttonVariants`. The existing Learn pages still use `Button render={<Link/>}`, which exposes their links as `role="button"`; that's a follow-up.

**Tests**
- `tests/unit/case-route.test.ts` (7 tests).
- `tests/e2e/learn-case.spec.ts` (6 tests), with the drill tests' `E2E_REQUIRE_DATA` pattern:
  - title, heading and canonical URL; the player loads; picking an algorithm
  - the Drill link; previous/next
  - a PLL card name opens its page
  - 404s for `999`, `abc`, `0` and a tutorial series
  - the OG image is a PNG
  - no sideways scroll at 390px

**Verified**
- `npm run validate` (372 of 372; the one lint warning is the old `_alg` placeholder).
- `check:colors`; `test:e2e:prod` (42 of 42).
- `check:chunks` on `next start`: 72 files across 5 pages.
- Screenshots: Slate at 1280px, Paper at 390px, and the PLL 1 share image.

**Not verified:** Mark Learned while signed in on the case page (it needs an account; the action is the card's). The live OLL headings read "OLL 27" until the part 1 seed is applied, then "OLL 27 (Sune)".

---

## 2026-10-13 — Learn Phase 3, part 1: OLL shape categories seed

**Request:** OLL descriptions in the ` · ` form, so the category chips appear on `/learn/333/oll`.

**Live check (read-only, public API):** all 57 OLL descriptions are still the seeded values (`Dot, Run`, `Kite`, `Square shape`…), with a comma instead of ` · `.

**Checked on the cube before writing:** every case's main algorithm was run through cubing.js to read which top edges and corners are oriented. This found three errors in the old descriptions:
- 9 and 10 ("Kite") are Fish cases.
- 28 ("Arrow") and 57 ("Line") are the two cases with all corners oriented.
- 21 is H, and 22 is Pi (21 was labelled Pi). 19 was labelled "Diagonal", but its oriented corners are adjacent.

**Added**
- `supabase/DataSeeds/20261017000000_oll_shape_categories.sql`:
  - `Group · note` for all 57 cases, in the 15 standard groups.
  - The note is a nickname when it starts with a capital letter (Sune, Pi, Kite, Zamboni…). Otherwise it's a fact: "mirror of OLL n", "symmetric", "all corners oriented"… I didn't write nicknames from memory where they weren't reliable.
  - It only updates rows still holding the seeded text; hand edits are left alone.
  - One check result (the SQL editor shows only the last one).
- `tests/unit/oll-categories.test.ts`: parses the seed and checks:
  - all 57 cases have a category, in the 15 groups
  - each group's shape is true on a KPuzzle (Dot: no top edges oriented, OCLL: all four, …)
  - every note is true ("mirror of OLL n" and "symmetric" compare patterns up to AUF; corner and edge counts)
  - It uses the older algorithms in `src/scripts/data/oll-data.ts`, independent of the live ones I analysed, and agrees. A deliberately wrong note ("mirror of OLL 8" on OLL 5) makes it fail.

**Verified on a throwaway Postgres** (all migrations, then the PLL and OLL refresh seeds, then this one):
- 15 groups adding up to 57.
- A hand-edited OLL 40 was left alone and listed under `left_alone`.
- After resetting it: the first run updated 1 row, the second updated 0.

**Not changed:** the descriptions in `src/scripts/data/oll-data.ts` (the generator's source for the 2026-07-30 baseline seed) keep the old text.

**Founder action:** run the seed in the SQL editor (`docs/todo.md` §2).

---

## 2026-10-13 — Learn Phase 3, part 4: themed 404 and error pages, branch `feat/learn-phase3`

**Request:** Finish Learn Phase 3 (plan: `~/.claude/plans/steady-orbiting-sketch.md`). Part 4 of 5 is the themed `not-found.tsx` and `error.tsx`.

**Added**
- `components/layout/not-found-view.tsx`: "This page doesn't exist" with links to Home, Timer and Learn. Theme tokens only.
- `components/layout/error-view.tsx`: "Something went wrong", **Try again** (`retry()`, stable since Next 16.3) and Home. It shows `error.digest` as "Ref: …" and never `error.message`.
- `app/not-found.tsx`: unknown URLs, without the navbar (it sits outside the `(app)` group).
- `app/(app)/not-found.tsx`: `notFound()` from learn and profile pages, with the navbar kept.
- `app/error.tsx`, `app/(app)/error.tsx`: client boundaries that render `ErrorView`.
- No `global-error.tsx`: it has to render its own `<html>` without the theme, and the root layout doesn't throw.

**Found while testing:** the Base UI `Button` with `render={<Link/>}` gives the link `role="button"`, so it isn't exposed as a link. The navigation actions are plain `Link`s styled with `buttonVariants`.

**Tests**
- `tests/unit/error-view.test.tsx`: Try again calls `retry`, the digest shows, the message doesn't.
- `tests/e2e/errors.spec.ts`: `/no-such-page` is a 404 with the heading, no sideways scroll at 390px, and Home works. `/learn/no-such-puzzle` is a 404 with the navbar.

**Verified:** tsc, eslint, `check:colors`, `npm run test:e2e:prod` (36 of 36). By hand on `next dev`, with a temporary throwing route (deleted, not committed): the error boundary renders inside the navbar with a Ref. Screenshots of both pages in Slate and Paper at 390 and 1280px.

**Noticed, not changed:** in Paper, the shared `outline` button variant has almost no visible border.

---

## 2026-10-12 — PLL seed script moved into `supabase/DataSeeds/`

**Request:** Move the PLL seed script into DataSeeds.

**Found:** `20261003000000_pll_algorithm_refresh.sql` existed only on the local branch `claude/adoring-feynman-x4btyg`, in a stray `supabase/dataSeeding/` folder. It isn't on `main` and was never pushed. The OLL seed in `DataSeeds/` refers to it as the PLL counterpart.

**Live check (read-only):** it was already applied. There are 97 PLL algorithms live, exactly the script's 97 target rows, and the Aa main (`x L2 D2 L' U' L D2 L' U L' x'`) and corrected Ab main (`x R2 D2 R U R' D2 R U' R x'`) match.

**Changed:** the file now lives at `supabase/DataSeeds/20261003000000_pll_algorithm_refresh.sql`, unchanged except the header. The `migration repair` line is replaced by a note that this is a seed (no repair entry) and is already applied.

---

## 2026-10-12 — Profile steps 4–5 checked on live data

**Live checks** (the founder applied `20261015000100` and `20261016000000`):
- The catalogue now has 20 rows; the legacy rows are gone.
- The founder holds 8 badges, awarded by the owner's-profile check: First Turn, Century, Sub-60/30/20/15, Consistent and Night Owl.
- `get_profile_stats.levels` = `{"333": 20850}`.
- `/profile/sgsueper12373` signed out at 1280px dark and 390px light shows the level chip "Sub-30 · Ao12" and Achievements 8/20.
  - Unlocked badges are dated 12 Oct 2026.
  - Marathon shows as "???".
- No page errors and no sideways scroll.
- Method and main cubes aren't set yet, so the page correctly shows nothing for them.

---

## 2026-10-12 — Profile step 5: main cube per event, method, level

**Request:** Step 5 (C11 and C12) of `docs/profile.md`, the last profile step. Planned in `~/.claude/plans/spicy-jumping-feather.md`.

**Changed**
- **New migration `20261016000000_profile_setup.sql`**:
  - `profiles.main_method` (checked against six methods) and `profiles.learning_now` (≤ 80 characters).
  - New table `user_setups` (one main cube per event; `product_id` for later). RLS: read through `profile_visible`; write own rows only.
  - `get_profile_stats` gains `levels`: the best timer-only Ao12 per event, via `best_timer_average`. The rest of the function is unchanged.
- **New `lib/profile/level.ts`**: a level ladder for each of the 8 events, `levelFor` ("Sub-20", minutes past 60 s such as "Sub-1:30"), and `METHODS`.
- **`validate.ts`**: method and learning line, plus `validateSetups` (name or clear; an over-long name gives an error naming the event).
- **`actions.ts`**: saves the method and learning line with the profile, then upserts named cubes and deletes cleared ones.
- **`dal.ts`**: `mainMethod`, `learningNow`, `stats.levels`, `getSetups()`; `EditableProfile.setups`.
- **Edit profile**: new "How I cube" (method select, learning now) and "My setup" (a main-cube input per event) sections.
- **Profile page**:
  - The header shows a method chip and "Learning: …".
  - The selected event shows a level chip ("Sub-20 · Ao12", with a tooltip giving the Ao12 and the rung) and "Main cube: …".
  - All of it is hidden for a private profile's visitors.

**Tests**
- New `supabase/tests/profile_setup_test.sql`, 11 of 11:
  - the owner adds, changes and removes cubes; another user's update and delete change nothing, and their insert is refused
  - hidden when private
  - method and learning checks
  - the level ignores a typed 9.00 and equals the timer-only Ao12 (18.00)
  - no Ao12 means no level
- All 17 migrations apply on the throwaway DB, and every earlier test still passes (10, 14, 11, 7, 3).
- New `tests/unit/profile-level.test.ts`: ladder boundaries (20.00 isn't sub-20), minute labels, null cases, every event's ladder strictly falling. Validation tests extended.

**Verified:** `npm run validate` (357 of 357), `check:colors`, `npm run build`, `npm run test:e2e:prod` (34 of 34).

**Not yet verified:** the live page, which needs the migration. Apply it BEFORE deploying, because the page reads the new columns.

---

## 2026-10-12 — Remove the legacy hand-made achievements

**Found:** after the founder applied the achievements migration, the live catalogue had 34 rows. 14 were hand-made on 2026-06-26, before the repo's migrations:
- 7 duplicated the new badges under older slugs
- 7 were for Compete, clubs and tutorials, which don't exist yet

None could be earned: their condition formats aren't read by `award_achievements`. The profile grid would have shown duplicates and impossible badges.

**Founder decision:** delete them.

**Changed:** new migration `20261015000100_remove_legacy_achievements.sql` deletes those 14 slugs, but only rows with no `user_achievements`, because a delete would cascade the unlock away.

**Verified** on a throwaway DB with three legacy rows, one of them unlocked: 23 rows before, 21 after. The unlocked one stays.

---

## 2026-10-12 — Profile step 4: achievements

**Request:** Step 4 (C9) of `docs/profile.md`, planned in `~/.claude/plans/spicy-jumping-feather.md`.
**Founder decision:** typed (manual) times don't count toward speed badges.

**Changed**
- **New migration `20261015000000_achievements.sql`**:
  - The `user_achievements` read policy now goes through `profile_visible`.
  - It seeds 20 badges: milestones, 3x3 sub-60/30/20/15/10 singles, Ao5 sub-20, Ao12 sub-15, 4 and 8 events, 7- and 30-day streaks, PLL and OLL Master, 2x2 Specialist, plus Night Owl and Marathon (hidden). The seed is an idempotent upsert.
  - `award_achievements()` computes the caller's facts once, inserts every newly met badge and returns them.
  - Internal helpers: `best_timer_average`, which works like `best_average_of_n` but skips `source = 'manual'`, and `learned_sets`. Neither is callable through the API.
  - `award_achievements` is executable by `authenticated` only.
- **New `lib/profile/achievements.ts`**:
  - `checkAchievements()` shares one check between overlapping calls, and treats failures as "nothing new".
  - `unlockMessage` and `announceUnlocks`: one badge is named, several are counted. There's no View button, because the store has no router.
  - `toUnlocks`.
- **New `lib/profile/achievement-icons.ts`**: lucide icons and the display order, by slug.
- **`session-store.ts`**: after a signed-in solve is saved, the check runs without being awaited.
- **`learn/actions.ts`**: `toggleAlgorithmBookmark` awards after marking a case learned and returns the unlocks, which `algorithm-card.tsx` announces.
- **Profile:**
  - `getAchievements()` in the DAL.
  - New `achievements-section.tsx`: a grid with an "N/20" count; locked badges show their goal, hidden ones show "???". The section has the `#achievements` anchor.
  - New `achievement-check.tsx` on the owner's profile awards anything already earned (the backfill) and refreshes the page.
- **`sign-in-nudge.tsx`**: "…and earn achievements".

**Tests**
- New `supabase/tests/achievements_test.sql`, 10 of 10:
  - one solve gives First Turn plus Sub-60, and nothing is awarded twice
  - a typed 9.00 is ignored while a timed 18.00 gives Sub-30/20
  - an Ao5 under 20 s, a 7-day IST streak and a 03:00 IST solve each award their badge
  - a set gives nothing at half learned and its badge when complete
  - anon can't call it; the helpers aren't exposed; badges are visible while public and hidden when private
- Two wrong expectations in my first draft (alphabetical order, and 8 badges rather than 9) were corrected.
- Every earlier profile test still passes.
- New `tests/unit/achievements.test.ts`:
  - every seeded slug, read from the migration file, has an icon and a place in the order
  - toast wording
  - parsing, which caught a crash on a `null` row (now fixed)
  - throttle and failure handling

**Verified:** `npm run validate` (348 of 348), `check:colors`, `npm run build`, `npm run test:e2e:prod` (34 of 34).

**Not yet verified:** badges on the live profile, and the toasts signed in. Both need the migration applied.

---

## 2026-10-12 — Profile step 3 checked on live data; timeline edge labels

**Live check** (migration applied by the founder): `/profile/sgsueper12373` signed out at 1280px dark and 390px light shows:
- 446 solves; current streak 1 day, longest 6, 26 active days; the heatmap Jul–Oct
- a timeline of Single 23.21 → 14.41, Ao5 26.02 → 19.34, Ao12 24.51 → 20.85
- 5 latest records; Learning "3x3 OLL 1/57"
- no page errors and no sideways scroll

**Fixed:** the timeline's last x label ("Oct 26") was clipped at the right edge. `XLabels` (`stats/chart/axes.tsx`) takes an optional per-label `anchor`, and the timeline anchors its first label at start and its last at end. A check reports no `<text>` outside the chart at 390 or 1280px.

---

## 2026-10-11 — Profile step 3: PB timeline, activity and streaks, learning progress, latest records

**Request:** Step 3 (Group B) of `docs/profile.md`, planned in `~/.claude/plans/spicy-jumping-feather.md`.

**Changed**
- **New migration `20261014000000_profile_progress.sql`**:
  - `profiles.show_activity` and `profiles.show_learning` (default true).
  - `profile_visible(p_user)` is now the single privacy check.
  - `get_profile_stats` gains `activity` (IST day counts for the last 371 days; current streak, which survives until a full day passes without a solve; longest streak by gaps-and-islands; active days) and `learning` (published sets with at least one learned case; a case counts as learned when any of its algorithms is, as in Learn). Each is `null` for a non-owner when hidden.
  - New `get_pb_progression(p_user, p_puzzle)`: the single running min plus Ao5/Ao12 improvements. The averages come from `average_progression`, which uses the same session-window maths as `best_average_of_n`. That helper is not callable through the API.
- **`lib/profile/dal.ts`**: `activity`, `learning`, `showActivity`/`showLearning`, and `getPbProgression()` (React `cache`, run only for the selected event).
- **`stats/chart/heatmap.tsx`** now takes `days` (day counts) instead of solves. `/stats` passes `dailyCounts(filtered)` and looks the same.
- **New `lib/profile/timeline.ts`** (pure): `stepPath`, `timelineExtent`, `improvement`.
- **New components in `components/profile/`:**
  - `pb-timeline.tsx`: a step chart in the `/stats` chart style, with a legend, a table view, point tooltips and a "from → to since" summary. It ends at the cuber's last active IST day; React's purity rule rejects `Date.now()` in render.
  - `activity-section.tsx`: three streak cards plus the heatmap.
  - `learning-section.tsx`: progress bars that link to each set.
  - `latest-records.tsx`.
- **Profile page** section order: header, stats, Activity, Personal bests (tabs, cards, timeline), Latest records, Learning. The owner sees "Hidden from others" on hidden sections.
- **Edit profile**: "Show my practice activity" and "Show my learning progress". They're disabled while the profile is private, and a hidden input keeps their values.

**Tests**
- New `supabase/tests/profile_progress_test.sql`, 14 of 14 on the throwaway DB:
  - single and Ao5 progressions match hand-computed values, and their last points equal the stored PBs; Ao12 is empty with too few solves
  - streaks across the IST date line; an ended streak
  - learning 1/3 via a second algorithm, with an untouched set left out
  - toggles hide sections from others but not the owner
  - a private profile has no progression for visitors
  - the helper isn't exposed
- The earlier profile tests still pass (7, 11, 3).
- New `tests/unit/profile-progress.test.tsx` (timeline maths, and the Heatmap rendered from counts).

**Verified:** `npm run validate` (343 of 343), `check:colors`, `npm run build`, `npm run test:e2e:prod` (34 of 34).

**Not yet verified:** the page with real data, which needs the migration live first.

---

## 2026-10-11 — Profile step 2 checked on live data; phone stat-card fix

**Live checks** (after the founder applied both migrations and the tests passed in the SQL editor):
- `profiles.is_public` is readable.
- The `avatars` bucket exists: a missing file returns `NoSuchKey`, where a missing bucket returns `NoSuchBucket`.
- `/profile/sgsueper12373` signed out shows 505 total solves (3x3 501 + 2x2 4), 2 events, member since Jul 2026 and last active 11 Oct 2026.
- The 3x3 tab is selected by default, as the most practised; `?event=222` shows 2x2.
- No page errors and no sideways scroll at 390px.

**Fixed**
- On phones the stat cards cut "11 Oct 2026" off. The icon now sits above the text below `sm`, with smaller value text. A script checking every `p.truncate` reports nothing clipped at 360, 390, 640 or 1280px.
- PB labels lost the `uppercase` style, which showed "MO3" and "AO5". They now read "Mo3" and "Ao5".

**Still to check by hand (signed in):** the Edit profile form, a photo upload, and the private toggle.

**Verified:** `npm run validate` (337 of 337), `check:colors`, `npm run build`, `npm run test:e2e:prod` (34 of 34).

---

## 2026-10-11 — Profile step 2 follow-up: avatars Storage split into its own migration

**Why:** The founder's SQL editor runs showed the profile migration never landed (no `is_public`, no bucket). The SQL editor runs a file as one transaction, and newer hosted projects can refuse `create policy … on storage.objects` ("must be owner"). One refusal rolls back everything, including the column the page needs.

**Changed**
- `20261013000000_profile_edit.sql` now holds only the profile part (`is_public`, the PB policy, `get_profile_stats`, the WCA ID check).
- New `20261013000100_avatars_storage.sql` holds the bucket and the four `storage.objects` policies.
- The tests are split to match: `profile_edit_test.sql` (11 checks) and a new `avatars_storage_test.sql` (3 checks). Each refuses to run before its own migration, with a clear message.
- `docs/todo.md` has the run order and a dashboard fallback (create the bucket and policies through Storage) in case the policies are refused.

**Verified** on a throwaway DB:
- With only the first migration: `profile_edit_test` 11 of 11, and the avatar test stops with "Apply … first".
- After the second: `avatars_storage_test` 3 of 3.

---

## 2026-10-11 — Profile step 2: edit profile, avatars, event tabs, public stats, privacy; session proxy switched on

**Request:** Step 2 (Group A) of `docs/profile.md`.

**Changed**
- **New migration `20261013000000_profile_edit.sql`**:
  - `profiles.is_public` (default true).
  - The `pbs_read` policy now allows public profiles, or your own.
  - `get_profile_stats` (now plpgsql) returns `{private: true}` with no numbers for someone else's private profile.
  - A `profiles_wca_id_format` check (`NOT VALID`, so old rows aren't re-checked).
  - The `avatars` bucket: public, 2 MB, webp/png/jpeg, where the columns exist; a bare bucket on older Storage schemas.
  - Owner-only insert, update, delete and select policies on `storage.objects`, limited to `avatars/<uid>/…`.
- **New `lib/profile/validate.ts`** (pure, shared by the form and the server action):
  - Field rules (name ≤ 60, bio ≤ 500 with blank lines collapsed, ISO country, WCA ID `^\d{4}[A-Z]{4}\d{2}$`).
  - Country options (India first, names from `Intl.DisplayNames`) and flag emoji.
  - `isOwnAvatarUrl` (only a file in your own folder of the public bucket).
  - Reserved usernames (`edit`, `settings`, `me`, `new`). They're now refused by `updateProfile`, which is used by onboarding and Settings, because `/profile/edit` would shadow them.
- **New `lib/profile/actions.ts`**: `saveProfileDetails` (validates, updates and redirects to the profile; a duplicate WCA ID gets a clear error) and `setAvatarUrl`.
- **New `lib/profile/avatar.ts`**: centre-crop to a 256px WebP in the browser (falling back to PNG where WebP can't be encoded). Raw photos over 15 MB are refused.
- **New components** in `components/profile/`:
  - `profile-avatar.tsx`.
  - `avatar-uploader.tsx`: uploads straight to Storage, saves the URL, then deletes older files in the folder.
  - `profile-edit-form.tsx`: photo, display name, bio with a counter, country select, WCA ID, and a Public profile toggle.
- **New `(protected)/profile/edit/page.tsx`**.
- **`profile/[username]/page.tsx` rebuilt**:
  - Side padding; header with avatar, name, @username, flag and country, WCA link (marked unverified) and bio. The owner gets Edit profile and Settings buttons.
  - A private-profile notice for the owner, and a "This profile is private" panel for others.
  - Four stats: total solves, events, member since, last active.
  - **Event tabs** (`?event=`, defaulting to the most-practised event) with Single, Mo3, Ao5, Ao12 and Ao100 PB cards and their IST dates. The old sideways-scrolling table is gone.
- **`lib/profile/dal.ts`**: adds `bio` and `isPublic`, `stats.hidden`, and `getEditableProfile()`.

**Found and fixed: the session proxy had never run.**
- `proxy.ts` sat at the repo root since 2026-07-17. Next only picks it up beside `app/`, which here is `src/`, so the build's middleware manifest was empty.
- **Effects:** Supabase sessions were only refreshed by the browser client, and the protected layout never received `x-pathname`, so every login from a protected page returned to `/settings`.
- **Moved to `src/proxy.ts`.** `lib/supabase/proxy.ts` now forwards `x-pathname` on a fresh `Headers` object, as the Next 16 docs show. Mutating `request.headers` in place is not forwarded.
- It uses `getClaims()` instead of `getUser()`: local verification with asymmetric keys, refreshing when the session is near expiry.
- **Verified on `next start`:** `/profile/edit` → `/login?next=%2Fprofile%2Fedit`, and `/settings?x=1` keeps its query. Signed-out `/timer` stays at 10–14 ms, the same as before.

**Tests**
- New `supabase/tests/profile_edit_test.sql`, 14 of 14 on the throwaway DB:
  - public by default
  - another user sees PBs and stats of a public profile but not a private one; anon too
  - the owner still sees everything
  - the WCA ID format
  - avatar writes limited to your own folder, and another user can't delete them
- `profile_stats_test.sql` still passes 7 of 7.
- `timer_round_test.sql` now SKIPs its source check on an empty DB, where it used to report a false FAIL.
- New `tests/unit/profile-validate.test.ts` (13 tests).
- An e2e test: `/profile/edit` signed out goes to login with the right `next`.

**Verified**
- `npm run validate`: 337 of 337 unit tests. `check:colors` is OK. `npm run build` lists the Proxy. `npm run test:e2e:prod` passed 34 of 34.

**Not yet verified:** the page and the edit and avatar flow with real data. The live DB needs the migration first (see `docs/todo.md`; the page 404s without `is_public`).

---

## 2026-10-11 — Profile step 1: real public stats, no ELO, "My profile" (branch `user_profile`)

**Request:** Step 1 of `docs/profile.md`, planned in `~/.claude/plans/spicy-jumping-feather.md`.

**Found**
- "Total solves" counted `solves` rows, which RLS (`solves_all`) lets only the owner read, so everyone else's profile showed 0.
- The page showed a made-up ELO badge and card.
- The nav's Profile tab opened `/settings`.

**Changed**
- **New migration `20261012000000_profile_stats.sql`**: `get_profile_stats(p_user)`.
  - It's `SECURITY DEFINER` and `stable`, with `search_path ''`.
  - Returns only `total_solves`, `by_event`, and `first_solve_on`/`last_solve_on` as IST calendar dates (never times).
  - Executable by `anon` and `authenticated`. RLS on `solves` is unchanged.
- **`lib/profile/dal.ts`**: the stats come from the RPC (`stats: ProfileStats`, falling back to zeros if it fails). The `elo_ratings` query, `eloRating` and `peakEloRating` are gone.
- **`profile/[username]/page.tsx`**:
  - Removed `getEloTier`, the tier badge and the ELO card.
  - The four cards are now Total solves, 3x3 best single, 3x3 best Ao5 and Last active, in a new `StatCard` that uses role tokens.
  - The owner gets a Settings button.
  - The metadata no longer mentions competitive ranking.
- **New `profile/page.tsx`**: "My profile" redirects to `/profile/<username>`, or to `/login?next=%2Fprofile` when signed out.
- **`lib/navigation.ts`**: Profile is now `/profile`, and it matches `/profile…` and `/settings`.
- **`user-menu.tsx`**: the name links to `/profile`.
- **Tests:**
  - New `supabase/tests/profile_stats_test.sql`. It rolls back and creates two throwaway users, then checks counts, deleted solves excluded, the per-event split, IST dates across midnight UTC, the visitor still unable to read rows, zeros for a user with no solves, and anon access.
  - The nav unit test.
  - New `tests/e2e/profile.spec.ts`: the signed-out redirect, a 404 with no ELO, and the nav href.

**Left for Step 2:** the page has no side padding (cards touch the screen edge on phones), and the PB table scrolls sideways at 390px. Step 2 rebuilds this page with event tabs.

**Founder action:** apply the migration and run its test (see `docs/todo.md`). Until then the live RPC returns 404, profiles show 0 solves, and the dev overlay shows the logged error.

**Verified**
- All 11 migrations apply on a throwaway `supabase/postgres`, and `profile_stats_test.sql` passes 7 of 7.
- `npm run validate`: 324 of 324 unit tests. `check:colors` is OK. `npm run build` passes. `npm run test:e2e:prod` passed 33 of 33.
- Screenshots of a real profile, signed out, at 1280px (dark) and 390px (light): no ELO, and the Profile tab is highlighted.

---

## 2026-10-11 — Edit layout button moves to the top bar

**Request:** The Edit layout button took a whole row above the grid. Move it to the top line, beside the settings buttons.

**Changed**
- **`layout-shell.tsx`**: the button row is gone. A new exported `LayoutControls` holds the controls.
  - At rest it's an icon-only "Edit layout" button (LayoutGrid icon, with a tooltip), matching its icon neighbours.
  - While editing it shows text "Reset" and "Done" buttons, so the mode stays obvious.
  - It stays desktop-only (`hidden md:flex`).
- **`timer-screen.tsx`**: renders `<LayoutControls />` before the background and settings buttons in the top bar.

**Verified**
- Screenshots at 1280px, at rest and while editing: the grid starts about 35px higher. Done brings the icon back, and the button stays hidden at 390px.
- `npm run validate`: 323 of 323 unit tests. `check:colors` is OK. `npm run build` passes. `npm run test:e2e:prod` passed 30 of 30.

---

## 2026-10-11 — Timer round, step 7: inspection beeps (round complete)

**Request:** Step 7 of `docs/timer-plan.md`, the last one.

**Changed**
- **`TimerSettings.voiceEnabled` is now `inspectionAlert: "voice" | "beep" | "off"`** (client-only).
  - `loadClientSettings` migrates old saves (`voiceEnabled: true` becomes voice, `false` becomes off), and the old key drops away on the next save.
  - `CLIENT_DEFAULTS` is exported, so the landing page's server snapshot can't drift from it again (it was a hand-written copy).
- **New `lib/timer/beep.ts`**: an 880 Hz sine beep with a short fade, made with Web Audio.
  - The audio context is unlocked on the first tap or key press (capture phase), because iOS refuses audio that doesn't start in a gesture, and the 8s beep fires from an animation frame.
- **`time-display.tsx`**: at the existing callout marks (8s/12s, or 4s/6s in 8s mode), it either speaks or beeps once for the first warning and twice for the last.
  - The plan said 15s and 17s. I kept the same marks as the voice instead, so the two alert types stay comparable.
- **Quick settings and `/settings`**: the voice switch is now an Inspection alert control (Voice / Beep / Off).
- **Tests:**
  - New `tests/unit/inspection-alert.test.ts`: the migration, junk values, the old key dropping on save, beeps staying silent until unlocked, and two beeps 0.2 s apart (fake AudioContext).
  - New e2e test: 8s inspection with Beep. Counting real Chromium oscillators gives 0 at 3 s, 1 by 4 s and 3 by 6 s.

**Verified**
- `npm run validate`: 323 of 323 unit tests; lint has the one pre-existing warning. `check:colors` is OK.
- `npm run build` passes. `npm run test:e2e:prod` passed 30 of 30.

**The timer round is complete** (`docs/timer.md`: all 7 items ticked).

---

## 2026-10-11 — Timer round, step 6: recently deleted

**Request:** Step 6 of `docs/timer-plan.md`.

**Changed**
- **`lib/timer/repo.ts`**: `loadDeletedSolves(puzzle, limit = 100)` and `purgeSolves(ids)`, plus `RECENTLY_DELETED_DAYS = 30` and `recentlyDeletedSince()`.
  - **Cloud:** reads `deleted_at >= now − 30 days` (newest deletion first) and maps `deleted_at` back. The purge is `delete … where id in (…) and user_id = me and deleted_at is not null`, so a stray id can never hard-delete a live solve.
  - **Local:** the same filters on the localStorage rows.
- **`session-store.ts`**: `loadDeletedSolves()` and `purgeSolves()` for the current puzzle.
- **New `components/timer/recently-deleted.tsx`**: a modal (overlay lock, Escape closes).
  - Each row shows time, session name, "deleted 5 minutes ago" (`Intl.RelativeTimeFormat`) and the scramble.
  - Row actions are Restore (reusing `restoreSolves`, which also refreshes the list and PBs) and a bin icon that turns into Keep / Delete forever. That inline confirm avoids stacking a second dialog.
  - Restore all, and an empty state.
- **`session-switcher.tsx`**: a "Recently deleted" button (ArchiveRestore icon).
- **Not done:** the automatic purge of rows older than 30 days stays deferred (listed in `docs/timer.md`). Old rows simply stop appearing.
- **Tests:**
  - New `tests/unit/recently-deleted.test.ts`: the local list's window and order; purge ignores live ids; restore; the relative-time wording.
  - A new e2e test: D deletes, the dialog lists it as "deleted just now", Restore brings it back, delete again, then Delete forever, and storage keeps only the other solve.

**Verified**
- **Cloud path against RLS** on a throwaway `supabase/postgres` with all migrations, acting as user A (`request.jwt.claim.sub`):
  - A sees exactly their 1 soft-deleted solve.
  - A purge given A's deleted id, A's live id and B's deleted id removed only the first.
- `npm run validate`: 318 of 318 unit tests; lint has the one pre-existing warning. `check:colors` is OK.
- `npm run build` passes. `npm run test:e2e:prod` passed 29 of 29.

---

## 2026-10-11 — Timer round, step 5: previous scramble and custom scramble

**Request:** Step 5 of `docs/timer-plan.md`.

**Changed**
- **`stores/timer-store.ts`**: the scramble state (`ScrambleSlots`) gains `prev` and `custom`.
  - `moveOn()` is shared by advance and skip, and remembers the current scramble as `prev`.
  - New `previousScramble()`: works when idle or stopped; after a solve it repeats the scramble just solved. An unused random scramble goes back into `next`.
  - New `setCustomScramble()`: the random scramble waits in `next`. `setPuzzle` clears every slot.
- **New `lib/timer/custom-scramble.ts`**: tidies pasted input (spacing, typographic quotes, keeps Megaminx line breaks, 500-character cap) and syntax-checks it with cubing's `Alg`. It accepts R++/D-- and Pyraminx tips.
- **New `components/timer/custom-scramble-dialog.tsx`**: the same hand-rolled modal as the shortcuts list, with the overlay lock so Space can't start the timer behind it. Enter uses the scramble; Shift+Enter adds a line.
- **`scramble-bar.tsx`**: Previous, New, Copy and "Enter your own scramble" buttons, plus a "Custom scramble" label. "New" after a solve now moves on instead of doing nothing.
- **`touch-stage.tsx`**: `←` previous and `→` new scramble (between solves), also listed in the shortcuts overlay.
- **`Solve.scrambleType`** is optional; `"custom"` is set from the store. `repo-supabase.ts` and the sign-in sync send `scramble_type`.
- **Tests:**
  - New `tests/unit/scramble-slots.test.ts` (11 tests: transitions and the checker against the real cubing parser).
  - Two e2e tests: Previous via the button and the arrow keys; a pasted scramble (junk is rejected, then a tidied scramble is used, labelled, and the solve is stored with `scrambleType: "custom"`, and the next scramble is random).

**Verified**
- `npm run validate`: 316 of 316 unit tests; lint has the one pre-existing warning. `check:colors` is OK.
- `npm run build` passes. `npm run test:e2e:prod` passed 28 of 28.
- Phone screenshots of the dialog and of the bar with the custom label.

---

## 2026-10-11 — Timer round, step 4: manual time entry (typing mode)

**Request:** Step 4 of `docs/timer-plan.md`. Stackmat support stays deferred until users ask.

**Changed**
- **New `lib/timer/parse-time.ts`**: `parseTypedTime()` reads input the way csTimer does.
  - `12.34`, `12.345`, `1:02.34`, `1:00:00`.
  - Digits only: `1234` → 12.34, `10234` → 1:02.34.
  - `+` suffix is +2; `DNF` and `DNF(12.34)` are DNF (a bare DNF stores 1 ms, because the DB requires time > 0).
  - Rejects zero, invalid clock values (`1:75`) and anything of 24 h or more, with a message for the UI.
- **New `components/timer/typing-entry.tsx`**: replaces the touch stage while typing mode is on, so Space types into the box and the timer's shortcuts are inactive.
  - A big timer-font box. Enter saves; Escape blurs.
  - OK/+2/DNF buttons (phone keypads have no `+`); a marker typed in the box wins over the button.
  - Shows "Saved 12.34" after each save, or an inline error.
- **Settings:** `inputMode: "timer" | "typing"` is client-only (`settings-persistence.ts`), with an "Enter times by" toggle in quick settings. Switching to typing after a timed solve moves to a fresh scramble.
- **`Solve.source`** is optional; `"manual"` is set for typed times. `repo-supabase.ts` and the sign-in sync send it (the migration already allows `manual`).
- **`timer-screen.tsx`**:
  - The record-and-announce logic is now one `recordSolve(timeMs, penalty, source)`, used by the timer (through `useEffectEvent`, so the stop effect keeps `[phase]` deps) and by typing mode. Typed solves get session bests and PB cards too.
  - The PB card is now keyed to the solve id, since a typed solve has no stop timestamp.
- **Tests:**
  - New `tests/unit/parse-time.test.ts` (25 cases).
  - New e2e test: switch to Typing, `1234` → "Saved 12.34" and a new scramble, `abc` is rejected, DNF button, localStorage has both solves with `source: "manual"`, and the mode survives a reload.

**Fixed while checking:** the timer-size setting was an inline `font-size` on the input, which overrode its `em` size and made typed digits small. It now sits on a wrapper, as in TimeDisplay.

**Verified**
- `npm run validate`: 305 of 305 unit tests; lint has the one pre-existing warning. `check:colors` is OK.
- `npm run build` passes. `npm run test:e2e:prod` passed 26 of 26.
- Screenshots of typing mode at 1280px and 390px.

---

## 2026-10-11 — Timer round, step 3: copy an average as text

**Request:** Step 3 of `docs/timer-plan.md`.

**Changed**
- **New `lib/timer/share-text.ts`**: `formatAverageText()` and `formatSingleText()`, both pure.
  - Output is csTimer-style: `3x3 Ao5: 12.33 · CubeHub · 11 Oct 2026`, a blank line, then `1. 11.20   <scramble>` oldest first.
  - Trimmed solves are in brackets (reusing `trimmedIndices`). Megaminx scrambles are flattened to one line.
- **New `lib/timer/copy-text.ts`**: `copyWithToast()` and `copyAverage()`. The clipboard write shows a "… copied" toast, or an error toast.
- **`session-stats.tsx`**: the Mo3, Ao5 and Ao12 rows become buttons once their window is full. A copy icon appears on hover or focus, and the button blurs after a click so Space still reaches the timer.
- **`stat-tiles.tsx` / `stats-panel.tsx`**: the same for the mobile drawer tiles.
- **`pb-celebration.tsx`**: a "Copy text" button. `recordText()` in `pb-detect.ts` gives a single with its scramble, or the whole window.
- **Tests:**
  - New `tests/unit/share-text.test.ts` (7 tests, exact text).
  - New e2e test: 5 solves, click Ao5, read the real clipboard, check the header, 5 lines, and trimmed first and last.

**Verified**
- `npm run validate`: 280 of 280 unit tests; lint has the one pre-existing warning. `check:colors` is OK.
- `npm run build` passes. `npm run test:e2e:prod` passed 25 of 25.
- Light-theme screenshot: the Ao5 hover state and the PB card with Copy text and Share.

---

## 2026-10-11 — Timer round, step 2: session best vs all-time PB, celebration, share image

**Request:** Step 2 of `docs/timer-plan.md`. The founder's direction: say "session best" for
the session and "all-time PB" for an overall best, add a real celebration, and let people
share it as an image.

**Found:** the old "New PB!" toast compared within the session only, so any new session's
second solve could claim a PB. It also checked on the next microtask after `addSolve`, which
waits on hydration first, so it could read the solve list from before the new solve.

**Changed**
- **New `lib/timer/pb-detect.ts`**: `detectRecords(previous, solve, known)`, a pure function.
  - Covers single, Mo3, Ao5 and Ao12. Only windows ending at the new solve are checked.
  - It is an all-time PB only against a *confirmed* best, meaning one loaded from history.
    A best first set during this visit counts as a session best until a reload. This stops
    confetti on a brand-new cuber's second solve.
- **`session-store.ts`**:
  - `knownBests` is loaded with the event (through `repo.loadPersonalBests`).
  - It's re-read after a delete, penalty, restore, clear or session delete, which can move a best either way.
  - `setKnownBests` stores what the detector learned.
- **`timer-screen.tsx`**:
  - Builds the solve, runs the detector against the solves *before* it, then adds the solve.
  - Session bests get a "Session best: …" toast. All-time bests get the new card. Both get the existing glow on the digits.
- **New `components/timer/pb-celebration.tsx`**: a non-modal card (it doesn't trap focus or keys).
  - Shows each record, the improvement and the previous best, with confetti in the sticker colours.
  - The share image is pre-drawn, so Share calls `navigator.share` inside the tap (Safari needs that).
  - It's tied to the stop that earned it, so it disappears when the next solve begins (derived, not an effect).
- **New `lib/timer/share-card.ts`**:
  - A 1080×1350 canvas image in theme colours (`readTokenRgb`) and theme fonts.
  - Shows the wordmark, a sticker row, event and category, the time, the improvement, the window's solves with trimmed ones in brackets, other records hit by the same solve, the date and the host.
  - `shareImage()` uses the share sheet when files can be shared; otherwise it downloads the PNG and copies it to the clipboard.
- **`stats.ts`**: `trimmedIndices()` (a stable sort, so tied times still trim two different solves).
- **Dependency:** `canvas-confetti` 1.9.3 (+ types), loaded only when a PB happens and skipped under reduced motion.
- **Tests:**
  - New `tests/unit/pb-detect.test.ts` (13 tests).
  - The e2e test in `timer.spec.ts` covers the session toast, then a reload and an all-time card, then Share downloads `cubehub-pb.png`, then the next solve closes the card.

**Verified**
- `npm run validate`: tsc, lint (the one pre-existing warning), and 273 of 273 unit tests. `check:colors` is OK.
- `npm run build` passes. `npm run test:e2e:prod` passed 24 of 24.
- In the browser, 5 solves, a reload and 3 faster solves gave an all-time Mo3 and Ao5 card. Screenshots at 1280px and 390px. The downloaded image was checked by eye: Ao5 headline, `1.21 (1.41) 0.61 (0.51) 0.56`, "Also new: Mo3".

---

## 2026-10-11 — Timer round, step 1: event dropdown and Mo3, branch `timer-page`

**Request:** Step 1 of `docs/timer-plan.md`. Popular events in a dropdown, and Mo3 for every event.

**Changed**
- **New `lib/timer/events.ts`**: the registry for 3x3, 2x2, 4x4, 5x5, 3x3 OH, Pyraminx, Skewb and Megaminx.
  - Each event has its label, cubing.js event id (`mega`→`minx`, `pyra`→`pyram`) and twisty puzzle.
  - It also holds the last-used event in localStorage (`cubehub.timer.event`).
  - `TimerPuzzle` is now the registry's id union.
- **`scrambler.ts`** maps to the cubing.js event id.
- **`session-switcher.tsx`**: the 3×3/2×2 buttons became an "Event" `<select>`. `timer-screen.tsx` restores the last event on first load and saves it on change.
- **Labels from the registry:** `/stats` (its toggle is now a select too), profile page, export filename, the scramble button label, and the csTimer/backup importer. The importer needed no `scrType` mapping: the user picks the event before importing.
- **`scramble-bar.tsx`**:
  - Megaminx scrambles keep their 7 WCA lines.
  - Scrambles over 30 moves use a smaller size.
  - The move list scrolls inside the panel, so the shuffle and copy buttons are never pushed out (the panel previously overflowed on Megaminx).
- **Mo3:**
  - `stats.ts` gains `meanOfN`, `windowStat` and Mo3 support in `bestAverageOfN`.
  - Mo3 is shown in the session stats, mobile tiles and `/stats` PB row.
  - `PbCategory` gains `mean3`, read from the cloud and computed locally.
- **New migration `20261011000000_timer_round.sql`**:
  - `mean3` in `best_average_of_n`, `recompute_average_pbs` and `ratchet_average_pbs_for_solve` (n = 3 means a plain mean; any DNF means no PB), plus a backfill.
  - `'manual'` added to `solves.source`.
  - `is_admin()` gets `search_path = ''`.
  - `EXECUTE` revoked on the three PB trigger functions.
- **Tests**:
  - New `supabase/tests/timer_round_test.sql` (rolls back; safe on production).
  - New `tests/unit/timer-events.test.ts`, using the same numbers as the SQL test.
  - New `tests/e2e/timer.spec.ts`: Pyraminx scrambles and is remembered after a reload; Megaminx has 7 lines and a visible shuffle button.

**Kept on purpose**
- `/stats` still opens on 3x3. Reading localStorage there would cause a hydration mismatch.
- Ao5 stays the headline average. None of the chosen events uses mo3 as its WCA format.

**Founder action:** apply the migration on the dashboard, then run `timer_round_test.sql` (see `docs/todo.md`).

**Verified**
- Migrations: all 10 applied in order on a throwaway `supabase/postgres:15.8.1.060` container. `timer_round_test.sql` passed 12 of 12, and the existing `pb_lifecycle_test.sql` passed 8 of 8.
- `npm run validate`: tsc, lint (the one pre-existing warning), and 260 of 260 unit tests. `check:colors` is OK.
- `npm run build` passes. `npm run test:e2e:prod` passed 23 of 23.
- In the browser, every event produced a real scramble (4x4 took about 1.5 s, the others under 0.1 s) and a preview, with no page errors. Megaminx and 5x5 were checked at 1280px and 390px.

---

## 2026-10-11 — Merge `ci/drill-e2e-data`; yellow-on-top case cards; "System" as default theme

**Request:** Merge the CI branch (the fast-forward was failing). Founder decisions: case cards
yellow on top (white is the first layer, solved on the bottom), and "System" as the default theme.

**Git**
- `git merge --ff-only` failed because the branches had diverged: `ci/drill-e2e-data` was cut
  from `477f2d6`, and `main` had 6 newer commits. The branch's one commit was rebased onto
  `main` (uncommitted `docs/todo.md` edits stashed first). The only conflict was in this log,
  where both sides added entries at the top; both were kept. Then `main` fast-forwarded to `0422e3f`.

**Changed**
- **`components/learn/case-viewer-inner.tsx`**: the card picture uses `experimentalSetupAlg: CASE_ORIENTATION` (`z2`) when it draws from an algorithm, the same as the Drill Lab.
- **`components/learn/alg-player-inner.tsx`**: the 3D player opens yellow-on-top too. Hand-entered `setup_moves` are applied after the `z2`.
- **`themes/preference.ts`**: new `DEFAULT_THEME_PREFERENCE = "system"`. A missing or unknown cookie now parses to it. `LEGACY_THEME_VALUES` is exported for the head script.
- **`themes/init-script.ts`**: the script resolves the OS scheme unless the cookie names a concrete theme (`slate`, `paper`, `dark`, `light`). Before, it acted only on `system`.
- **`lib/theme.ts`**: the server snapshot is `"system"`.
- **`AGENTS.md`**: Next 16.3's `next dev` rewrites the `nextjs-agent-rules` block, which had wiped the CubeHub brief inside it. The brief now sits after the `END` marker.
- **Docs**: `todo.md` (decisions ticked; leaked-password protection skipped as paid-only) and `design-tokens.md` (no cookie means System).

**Kept on purpose**
- `DEFAULT_THEME_ID` stays Slate. It's what the server draws before the head script knows the OS scheme, so first paint stays dark-first.
- Tutorial step diagrams and admin-painted facelet cards are not rotated. They're drawn for a specific orientation (e.g. the beginner white cross).

**Verified**
- `npm run validate`: tsc, lint (the one pre-existing warning), and 247 of 247 unit tests pass. `check:colors` is OK.
- Screenshots on `next dev`: `/learn/333/pll` and `/learn/222/cll` cards show yellow on top, and the Aa-perm 3D player opens yellow-top with green in front. A fresh browser with no cookie and a light OS got Paper, with "System" selected.

---

## 2026-10-08 — Next.js 16.2.10 → 16.3.8 (security)

**Request:** Upgrade Next.js to fix the critical advisories in 16.2.10. One is remote code
execution in `next/og` `ImageResponse`, which `src/app/opengraph-image.tsx` uses.

**Changed**
- `package.json` / `package-lock.json`: `next` and `eslint-config-next` 16.2.10 → 16.3.8, both still pinned exact. React 19.2.4 is within the peer range.

**Kept on purpose**
- No codemods. The two 16.3 codemods (`cache-components-instant-false` and
  `remove-partial-prefetch`) only apply when you enable `cacheComponents` or
  `partialPrefetching`. Neither is used.
- Dev-tool advisories are left alone. The remaining `npm audit` critical (`proxy-addr`)
  and the highs come through `shadcn` and `eslint-config-next`, and none of them ship.
  `next` is no longer flagged.

**Verified**
- `npm run validate`: tsc, lint (the same one pre-existing warning), and 246 of 246 unit tests pass.
- `npm run build` passes on Turbopack; all routes compile.
- `npm run test:e2e:prod`: 21 of 21 pass against `next start`.
- `check:chunks` against the local production server: 65 files across 4 pages, all resolve.
- **New log noise, harmless:** the server now prints `The destination stream closed early`
  when a client drops a page mid-stream. It appeared about 9 times per e2e run, all from
  Playground tests, and 0 times on 16.2.10. Letting each page reach network idle before
  it closes brings it to 0, so it is an aborted request, not a failure. Full page loads of
  `/`, `/playground`, `/timer` and `/learn` return 200 with no errors.

---

## 2026-10-06 — Playground: custom key mapping replaces the csTimer layout option

**Request:** Remove the csTimer keys option and let users map keys themselves.

**Changed**
- **`lib/playground/keymap.ts`**: the two fixed layouts are gone.
  - Keys are now `KeyBindings`, a map from chord (`KeyR`, `Shift+KeyR`) to move. `DEFAULT_BINDINGS` gives notation keys.
  - Any of 45 moves can be bound (faces, M/E/S, wide, rotations, each with ' and 2). On a 2x2 only face turns and rotations work.
  - New `bindKey`/`unbindKey` (a key does one move), `chordProblem` (Space, Esc, Tab, Enter, `?` and bare modifiers are refused), `sanitizeBindings` and `chordLabel`.
- **`lib/playground/prefs.ts`**: stores `keyBindings` instead of `keyLayout`. Bad stored data falls back to the defaults.
- **`keys-overlay.tsx`**: the key list gains **Edit keys**.
  - Press "+" on a move, then a key. "×" removes a key, and "Reset to default" restores the notation keys.
  - A note says when a key was taken from another move. Esc stops listening.
  - It listens in the capture phase, behind the overlay lock, so binding a key never turns the cube.
- **`playground-screen.tsx`**: the Controls panel loses the layout toggle. It says whether custom keys are active and opens the key list.
- **Tests**: the unit keymap tests now cover binding, rebinding, refused keys, the 2x2 filter and sanitising (29 tests). The e2e test binds I to R through the editor, checks that Space is refused and that the binding survives a reload, then resets it.

**Verified**: `npm run validate` passes (tsc, lint with one pre-existing warning, and 246 of 246 unit tests). `check:colors` is OK. The full Playwright suite passes, 21 of 21. The editor was screenshotted at 1280px and 390px.

---

## 2026-10-06 — Playground round 2: notation keys, alg check, Learn "Try it", practice mode

**Request:** The founder found that pressing R did not turn R. They asked whether csTimer and other sites work the same way, and what else the playground needs. Plan: `~/.claude/plans/steady-baking-dove.md`.

**Finding:** It was not a bug. csTimer's virtual cube maps the R key to `l'` (`twistynnn.js`), and cubing.js copies that layout. Ruwix-style simulators use notation keys instead. The founder chose to offer both, with notation as the default.

**Changed**
- **`lib/playground/keymap.ts`**: notation and speed (csTimer) layouts. The speed layout now has S/E and u/d too. `moveForKey(press, puzzle, layout)` and `keysForMove()`.
- **New: `lib/playground/prefs.ts`**: key layout, turn speed, hint stickers and inspection, kept in localStorage behind `useSyncExternalStore` (defaults on the server, so no hydration mismatch).
- **`lib/playground/history.ts`**:
  - New `case`, `load` and `moves` actions.
  - Move timestamps (`times`) for practice replay.
  - `setupKind` records where the cube started.
- **New: `lib/playground/alg-input.ts`**: parse, cap and validate an alg, build a case setup (`z2` plus the inverse), simplify the history.
- **New: `lib/playground/practice.ts`**: the practice-mode phases as pure transitions.
- **`components/playground/`**:
  - New `alg-panel.tsx`, `practice-timer.tsx` and `keys-overlay.tsx` (`?`).
  - `move-pad.tsx` gains X2 buttons and a "More moves" section.
  - `playground-cube.tsx` animates multi-move appends and gains turn speed, hint stickers and replay.
  - `playground-screen.tsx` ties these together and adds a copy-link button.
- **`app/(app)/playground/page.tsx`**: reads the `case`, `setup` and `moves` params (each at most 300 chars).
- **`components/learn/algorithm-card.tsx`**: a "Try it" button that opens `/playground?puzzle=…&case=<main alg>`.
- **Tests**: `tests/unit/playground.test.ts` grew to 28 tests (layouts, alg parsing, T-perm case round trip, practice timing, prefs). `tests/e2e/playground.spec.ts` grew to 9 tests (Shift prime, a remembered csTimer switch, alg case and Apply, a bad alg, `?case=`, practice, Learn "Try it").

**Verified**
- `npm run validate`: tsc, lint (one pre-existing warning), and 245 of 245 unit tests pass. `check:colors` is OK.
- The full Playwright suite passes, 21 of 21. Screenshots at 1280px and 390px show no horizontal scroll.

---

## 2026-10-04 — Drill Lab e2e tests run in CI against live data, branch `ci/drill-e2e-data`

**Request:** Un-skip the three Drill Lab e2e tests that skip in CI.

**Cause:** CI builds against the real Supabase URL with a placeholder anon key. Every query fails, `/learn/333/drill` shows "Nothing to drill here", and `skipWithoutData` skips the tests. The tests themselves were fine: they passed locally against live data.

**Decision (founder):** CI gets the real public (anon) key from a repo secret and reads live data as a signed-out browser does. This was chosen over running a local Supabase in CI, which would cost 2–3 minutes per run plus `config.toml` and seed setup.

**Changed**
- **`.github/workflows/ci.yml`** (e2e job):
  - The build, chunk-guard and Playwright steps use `secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY`, falling back to the old placeholder.
  - `E2E_REQUIRE_DATA` is set when that secret exists.
  - `SUPABASE_SERVICE_ROLE_KEY` stays a placeholder; the service role key is never given to CI.
- **`tests/e2e/drill.spec.ts`**: with `E2E_REQUIRE_DATA=1`, missing drill data fails the test instead of skipping it, so a broken key or empty database can't hide as three skips. Without it (a fork, or a local run without `.env.local`) the tests skip as before.

**Founder action needed:** add the repo secret `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Until then CI behaves exactly as before.

**Verified**
- `npm run build`, then `E2E_PROD=1 E2E_REQUIRE_DATA=1 npx playwright test` (production build, as in CI): 12 of 12 pass, including the 3 drill tests that used to skip.
- `ci.yml` parses as valid YAML.

---

## 2026-10-04 — Category filter on Learn series pages; remove dead `filter-bar.tsx`, branch `feat/case-category-filter`

**Request:** Wire `filter-bar.tsx` into the series pages. It turned out to be an early draft of the hub-page filter that `PuzzleSeriesList` already implements, and the series pages already filter by status and search. The founder chose to delete the stub and add category filters to the series pages.

**Changed**
- **Deleted: `src/components/learn/filter-bar.tsx`**: unused; nothing imported it.
- **New: `src/lib/learn/case-category.ts`**:
  - `caseCategory()` reads the text before " · " in a case description.
  - `caseCategories()` lists a set's categories in case order, with counts. It returns nothing unless every case has a category and there are at least two.
- **`algorithm-case-list.tsx`**: a row of category chips under the status and search bar.
  - It combines with the status filter and search.
  - Clicking the active chip clears it. On narrow screens the row scrolls sideways.
  - The chips use `aria-pressed` and theme tokens only.
- **New test: `tests/unit/case-category.test.ts`**.

**Kept on purpose**
- Only " · " counts as a separator. OLL ("Dot, Run") and PLL get no chips, because splitting on commas would break PLL descriptions like "Adjacent corner swap, adjacent edge swap". To give OLL shape groups, rewrite its descriptions as "Dot · Run" in a seed script.

**Verified**
- `npm run validate`: tsc, lint (one pre-existing warning), and 217 of 217 tests pass. `check:colors` is OK.
- In the browser on `next dev`:
  - `/learn/222/cll` shows All, Sune 6, Anti-Sune 6, Pi 6, U 6, L 6, T 6, H 4 and PLL 2. Choosing PLL leaves 2 cards.
  - `/learn/222/ortega` at 375px shows OLL 7 and PBL 5. PBL leaves 5 cards, and toggling it off brings back 12.
  - The page never scrolls sideways.
  - `/learn/333/pll` has no category row.

---

## 2026-10-04 — Case card diagrams come from the main algorithm, branch `feat/derived-case-diagrams`

**Request:** Next item after housekeeping: stop the Learn case cards depending on hand-entered `cube_state`. Access tiers are on hold until the founder decides what is premium.

**Changed**
- **New: `src/lib/learn/case-diagram.ts`**: `caseDiagram()` decides what a card draws.
  - It uses the case's main algorithm when there is one. Every case in the live database has at least one algorithm.
  - It falls back to `cube_state` (a facelet string or a setup algorithm) only for a case with no algorithms.
  - `mainAlgorithm()` replaces the inline lookup in the card.
- **`case-viewer.tsx` / `case-viewer-inner.tsx`**: accept `algorithm` as well as `cubeState`.
  - With `algorithm`, the player is anchored at the end (`experimentalSetupAnchor: "end"`), so it opens on the state the algorithm solves. This is the Drill Lab's primitive.
  - With `cubeState`, it plays from solved and jumps to the end, as before.
- **`algorithm-card.tsx`**: draws from `caseDiagram()`.
- **New test: `tests/unit/case-diagram.test.ts`**: the main algorithm wins over a `cube_state` that disagrees with it (the Ortega seed bug), with fallbacks after that.

**Kept on purpose**
- Tutorial steps still use `cube_state`. A step has no algorithm column to derive from, and its `cube_state` holds the move sequence the step teaches ("Target State").
- `cube_state` stays in the schema and the admin editor. It is still the fallback, and dropping it is a separate decision.
- Cards keep the current white-on-top 2D LL view. Switching to the Drill Lab's yellow-on-top (`z2`) view would be a visual change, so it was left out.

**Verified**
- `npm run validate`: tsc, lint (one pre-existing warning), and 212 of 212 tests pass. `check:colors` is OK.
- In the browser on `next dev`, each card's twisty-player state was compared, in the page, against the main algorithm inverted from solved:
  - OLL 57/57, PLL 21/21, 2x2 Beginner 6/6, Ortega 12/12, CLL 42/42, EG-1 40/40 and EG-2 40/40 all match.
  - None match the algorithm applied forwards.
- `/learn/333/beginner` tutorial steps still show the end state of their `cube_state`, with no console errors.

---

## 2026-10-04 — Housekeeping: Supabase MCP read-only; declare `server-only` and `postcss`

**Request:** Do the quick housekeeping items from the Phase 3 review.

**Changed**
- **`.mcp.json`**: adds `read_only=true` to the Supabase MCP URL. It had been exposing write tools (`apply_migration`, branch merge and reset), which contradicted `docs/database.md`. Schema and data changes stay deliberate, through the dashboard SQL editor or the CLI.
- **`package.json`**:
  - adds `server-only` to dependencies. It is imported by `src/lib/{admin,auth,profile}/dal.ts`. Next.js resolves it internally, so builds worked without it, but vitest or another tool importing those files would fail to resolve it.
  - adds `postcss` to devDependencies. `postcss.config.mjs` needs it, and it was only installed because other packages depend on it.
  - The lockfile changes are just those two packages plus `postcss`'s `nanoid` patch bump.

**Verified**
- `npm run validate`: tsc, lint, and 209 of 209 tests pass.
- `npm run build` passes.
- The MCP change takes effect the next time the session reconnects to the server.

---

## 2026-10-04 — Commit 2x2 and OLL seed scripts (`supabase/DataSeeds/`)

**Request:** Find out which of the new seed scripts the live database still needed, apply them, then commit the scripts.

**Database state (checked through the read-only Supabase MCP connection)**
- `20261004000000_oll_algorithm_refresh.sql` had already been applied on 2026-10-03: all 224 target algorithms are present, each case has the right main, and the case pictures for 9/37/49/50 are fixed.
- The founder applied the five 2x2 files through the Dashboard SQL editor. Verified afterwards:

  | Subset | Cases | Algorithms | Tier |
  |---|---|---|---|
  | Beginner | 6 | 20 | public |
  | Ortega | 12 | 47 | public |
  | CLL | 42 | 146 | free |
  | EG-1 | 40 | 68 | free |
  | EG-2 | 40 | 55 | free |

  Every case has exactly one main algorithm.
- Ortega's 9 existing drill attempts are still linked to their algorithms.

**Changed**
- **`supabase/DataSeeds/`**: the six seed scripts are now committed. Each runs in a transaction, checks its own results and is safe to run twice.
  - They are kept out of `supabase/migrations/` on purpose, so a fresh database built from migrations alone won't have this data.
- **`.gitignore`**: ignores `supabase/.temp/` (Supabase CLI cache).

**Note:** the remote migration history table is empty because every migration was applied by hand. Run `supabase migration repair --status applied <version>` for each migration before ever using `supabase db push`.

---

## 2026-10-04 — Navbar fits at tablet widths; tutorial steps render Markdown, branch `fix/navbar-and-tutorial-markdown`

**Request:** Merge `fix/learn-series-layout` into `main` (done as a fast-forward), then fix the two problems found while checking it: the navbar overflowing at about 820px, and tutorial steps showing raw Markdown.

**Changed**
- **`src/components/layout/navbar.tsx`**: from `md` to `lg` (768–1023px) the links are icon-only. The label is still there as `sr-only` text, with a `title` tooltip; it shows from `lg` up. Spacing is tighter below `lg`, and the user menu is `shrink-0`.
  - Seven labelled links plus the logo and user menu need about 930px, so they overflowed by about 86px at 820px.
- **New: `src/components/learn/step-markdown.tsx`**: renders `content_md` with `react-markdown` (no raw HTML, so submitted content can't inject markup) and `remark-breaks`.
  - Headings, lists, bold, code and links are styled with theme tokens. The old `prose` classes did nothing, because the typography plugin isn't installed.
  - A leading `## …` heading is dropped when it repeats the card title ("Step 2: First Layer Corners" under "First Layer Corners").
  - `remark-breaks` keeps single line breaks, which the content uses to put an algorithm on one line and its explanation on the next.
- **`tutorial-step-card.tsx`**: uses `<StepMarkdown/>` in place of the `whitespace-pre-wrap` raw text.
- **`package.json`**: adds `react-markdown` and `remark-breaks`.

**Verified**
- `npm run validate`: 209 tests pass (one pre-existing lint warning); `check:colors` is OK.
- `npm run build` passes, and `npm run test:e2e:prod` passes 12 of 12.
- In the browser on `next dev`:
  - At 780, 1000, 1040 and 1100px the page never scrolls sideways. Icons only below 1024px, labels at 1024px and up.
  - `/learn/333/beginner`: all 7 steps render headings and lists with no raw `##` or `**` left, and the algorithm and explanation lines stay separate.

---

## 2026-10-04 — Learn series page (`/learn/[puzzle]/[series]`) layout fixes, branch `fix/learn-series-layout`

**Request:** The learn method page (e.g. `/learn/333/oll`) isn't centred and the cube diagrams spill out of their boxes. Redesign it properly and fix the issues.

**Causes found**
- The page used `container`, which in Tailwind v4 has no `mx-auto` or padding, so it sat flush against the left edge.
- Each card was 400px wide with a fixed 160px cube column, and the left column (`flex-1` without `min-w-0`) couldn't shrink below its buttons. Together they needed about 430px, so `overflow-hidden` clipped the cube column's right side.
- The shared `Card` adds vertical padding, so the cube panel floated with gaps above and below.
- Opening Animate inside a card stretched every card in that grid row.
- `alg-player-inner.tsx` passed `experimentalSetupAlg: undefined` when a case had no setup moves. cubing.js threw (`reading 'experimentalIsEmpty'`) and the player started from a solved cube instead of the case.

**Changed**
- **`[series]/page.tsx`**: `mx-auto w-full max-w-7xl` with responsive padding (also fixes the tutorial pages); the progress note is only right-aligned from `sm` up.
- **`algorithm-case-list.tsx`**: a real grid (1 / 2 / 3 columns) aligned with the page edges, in place of the fixed-width flex-wrap. On narrow phones the filter tabs share the row equally, don't wrap, and drop their icons below 400px.
- **`algorithm-card.tsx`**, redesigned:
  - The diagram sits in a fixed 96px tile next to the name (a real button with an aria-label).
  - The main algorithm comes first under "Main", and the others under "Alternatives", across the full card width with wrapping. This replaces the badge that squeezed whichever line was main.
  - The setup is shown as a small line, and the footer is pinned to the bottom so rows line up.
  - Animate opens a Base UI dialog with a 240px player instead of expanding the card.
  - Drill Case uses `Button render={<Link/>}` instead of a button nested inside a link.
- **`case-viewer.tsx`**: the wrapper is fixed to `size` and the loader fills it, so nothing shifts when the cube loads.
- **`alg-player-inner.tsx`**: with setup moves the player plays from their state (anchor `start`); without them it anchors at `end`, so it opens on the case.

**Kept on purpose**
- The card viewers still use the hand-entered `cube_state`. Moving to derive-from-algorithm is a separate Phase 3 item.

**Not changed, found while checking**
- At about 820px wide the site navbar overflows by about 86px (the user name and sign-out button). It affects every page.
- Tutorial step content (`/learn/333/beginner`) shows raw Markdown (`##`, `-`). No Markdown renderer is installed.

**Verified**
- `npm run validate`: 209 tests pass (one pre-existing lint warning); `check:colors` is OK.
- `npm run build` passes, and `npm run test:e2e:prod` passes 12 of 12.
- In the browser on `next dev`, Paper and Slate, at 1568px, 820px, 375px and 360px:
  - all 57 OLL cards are measured with no diagram, code, button or link outside its card, and no diagram outside its tile
  - there is no horizontal page overflow except the navbar issue above
  - the dialog opens and closes, and the console shows no errors after the player fix
- On `next start`, the dialog opened on the OLL 2 case with no console errors.

---

## 2026-10-04 — Merge the landing page redesign into `main`

**Request:** Merge `origin/claude/adoring-feynman-x4btyg` (landing UI changes) into `main`, resolving any conflicts.

**Changed**
- Merged `1dcc58d` with `--no-ff`. There were no conflicts: `globals.css` keeps both Focus Mode's rules and the landing `.reveal` animation, and `gsap` is removed from `package.json`.
- Moved the landing entry in this log from the bottom of the file into newest-first order.

**Kept on purpose**
- The local branch has one more commit that is not on the remote, `bef1eb9 Added PLL data`. It was not merged, because the request was for the remote branch.

**Verified**
- `npm run validate`: 209 tests pass, with one pre-existing lint warning. `check:colors` is OK.
- `npm run build` passes, and `npm run test:e2e:prod` passes 12 of 12, including `landing-hero` and `cubing-runtime`.

---

## 2026-10-04 — Docs: mark JSON backup restore as resolved in the roadmap

**Request:** Fix the stale "still open" note in `docs/roadmap.md` found while reviewing outstanding work.

**Changed**
- **`docs/roadmap.md`** (Phase 2): the note said CubeHub's JSON export could not be re-imported. That is no longer true: `parseCubeHubExport()` in `import-cstimer.ts` restores it, keeping the original ids. The note is struck through and marked resolved, so the history stays.

**Verified**
- Read `isCubeHubExport()`/`parseCubeHubExport()` and the dispatch in the import parser, and confirmed `tests/unit/import-cstimer.test.ts` covers native CubeHub JSON. Docs only, no code changed.

---

## 2026-10-03 — Landing page redesign, branch `claude/adoring-feynman-x4btyg`

The old hero timer claimed Space whenever it was half on screen and started on any touch,
so on a phone a thumb scrolling past the card started solves. The landing page is rebuilt
around one rule: it never reacts to Space or touches unless the visitor asks it to.

| Section | File | Notes |
| --- | --- | --- |
| Hero | `marketing/hero-section.tsx`, `marketing/hero-timer-card.tsx` | Two-column hero. The card plays a time-lapsed replay (scramble → hold → run → stop) and takes no input. "Try a solve here" opts in: keys only while the pad has focus, touches only when they start on the pad, a finger that drifts more than 12px cancels the hold, and Esc, Done, or scrolling the card away hands the page back. Reduced motion shows a static finished solve. |
| Background | `react-bits/scramble-matrix.tsx` | Kept the interactive notation field. Added a `paused` prop (the hero's "Pause background" button), stops the loop when off screen or the tab is hidden, uses fewer tokens on phones, and fixes `ctx.scale` compounding on every resize. |
| Product bento | `marketing/feature-bento.tsx` | Replaces `feature-grid` and `cube-showcase`. Tiles show small slices of the real UI (stats and sparkline, drill queue, 3D case, ₹ cubes). Compete and Shop carry a "Soon" tag. Tiles use a stretched title link, so dragging the 3D cube can't trigger navigation; on touch the cube is display-only so swipes scroll. |
| Make it yours | `marketing/customize-section.tsx` | Real settings, not a mock: theme via `setTheme`, plus precision, hold time and 2D/3D preview through `saveClientSettings` (the keys `/timer` reads on mount). Live preview, theme swatches painted with each theme's own tokens via nested `data-theme`, and a press-and-hold button to feel the hold time. |
| India, CTA, footer | `marketing/india-section.tsx`, `marketing/cta-band.tsx` | Token tints instead of raw amber/cyan; rankings and calendar marked "Soon". |

- Section headings are plain text with `SectionHeading`. This fixes the audit's invisible
  `ScrollFloat` H2s. Motion comes from a CSS scroll-driven `.reveal` class in `globals.css`,
  which never hides content where it isn't supported or under reduced motion.
- Removed `scroll-float`, `scroll-reveal`, `react-bits.css`, `demo-timer`, `feature-grid`,
  `cube-showcase`, and the `gsap` dependency (nothing else used it).
- New e2e test `tests/e2e/landing-hero.spec.ts`: Space scrolls the page, and opt-in mode times a
  solve.
- Verification: tsc, eslint (one pre-existing warning), 189 unit tests, `check:colors`,
  `next build`, and e2e (`landing-hero` + `cubing-runtime`, 4/4) against `next start`.

---

## 2026-10-01 — Focus Mode (csTimer-style clean timer), branch `feat/focus-mode`

**Request:** Add a mode where, like csTimer, everything (navbar, options, panels) disappears once the timer starts, leaving a clean timer.

**Branch:** `feat/focus-mode`, stacked on `feat/timer-background`, because both edit `timer-screen.tsx`.

**Changed**
- **New: `src/lib/timer/focus.ts`**
  - `isFocusHidden(phase, inInspection)` hides from **ready** (armed), **inspecting**, and **running**, plus holding *during* inspection.
  - A press-and-hold from idle doesn't hide anything, so releasing early can't flash the UI away and back.
  - Also `FOCUS_ATTR`, and `loadFocusMode`/`saveFocusMode` in localStorage.
- **`src/stores/layout-store.ts`**: adds `isFocusMode` and `setFocusMode` (persisted). `hydrate()` restores it.
- **`timer-screen.tsx`**: toggles `data-focus-solving` on `<html>` while `focusHidden`, and removes it on unmount. The session-controls row and the sign-in nudge are marked `data-focus-hide`.
- **Marked `data-focus-hide`**
  - `navbar.tsx`: the header.
  - `bottom-nav.tsx`: the nav.
  - `stats-panel.tsx`: the mobile stats button.
  - `layout-shell.tsx`: the layout edit bar and the panel titles.
- **`globals.css`**: under `[data-focus-solving]`, every marked element and every grid panel except the timer gets `opacity: 0; visibility: hidden`. The timer panel loses its card background and border.
  - It uses opacity and visibility, not `display`, so nothing reflows and the digits don't move mid-solve.
  - It leaves in 150ms and returns over 300ms ease-out, matching the existing solve dim.
- **`timer-modes.tsx`**: a new **Focus Mode** toggle in the Modes menu (tooltip: "Hide everything but the timer while solving"). `ModeToggle` gained an optional `hint`.
- **New test: `tests/unit/focus-mode.test.ts`** (6 tests): the hide rule for every phase, including the idle-hold and inspection-hold cases, and persistence through `hydrate()`.

**Kept on purpose**
- Zen Mode is unchanged: it hides the navs permanently. Focus Mode is independent and only acts during a solve.
- The background image stays visible in Focus Mode; it's part of the canvas.

**Verified**
- `npm run validate` passes (209 tests); `check:colors` is OK.
- `npm run build && npx next start`, `/timer`, Slate, with the user's own background image set:
  - Turned Focus Mode on through the Modes menu; it was saved.
  - A plain hold from idle didn't hide anything.
  - Once armed and then running, the navbar, scramble and stats panels were hidden, and the timer panel's card was transparent. Only the running digits were left over the background, in the same position.
  - Escape cancelled (no solve recorded) and everything came back.
  - Focus Mode was set back to off afterwards.
- The inspection path is covered by unit tests only, because enabling WCA inspection would change the signed-in account's synced settings.
- `npm run test:e2e:prod`: 10 of 10 pass.

---

## 2026-10-01 — Timer background image (local-first), branch `feat/timer-background`

**Request:** Add a custom background image for the timer page only, stored locally for testing. Options: opacity, blur, brightness, fit and position.

**Changed**
- **New: `src/lib/timer-background/`**
  - `options.ts`: the option types, defaults and limits, `sanitizeOptions()` (clamps anything read back), the nine `POSITIONS`, and `imageStyle()`. `imageStyle()` sets object-fit and position, opacity, `blur()` and `brightness()`, and a small overscan so a blurred cover doesn't show faded edges.
  - `scrim.ts`
    - `luminancePercentiles()`: the 10th and 90th percentile of the image's luminance, skipping transparent pixels.
    - `effectiveBackground()`: brightness is applied in linear light, then opacity is composited over the theme canvas.
    - `timerNeedsScrim()`: returns true when any timer colour is below 3:1 against either extreme.
  - `storage.ts`: the image blob and its statistics go in IndexedDB (`cubehub` / `timer-background`); the options go in localStorage. Every call tolerates blocked storage.
  - `prepare-image.ts`: validates the file (an image, at most 25 MB), downscales it to 1920px, re-encodes it as WebP (JPEG as fallback), and samples 64×64 for the luminance statistics.
- **New: `src/stores/timer-background-store.ts`**: a Zustand store with `init`, `setImage`, `removeImage`, `setOptions` and `resetOptions`. It manages the object URL and shows friendly errors.
- **New: `src/components/timer/timer-background.tsx`**
  - `<TimerBackground/>`: a fixed `-z-10` layer.
  - `useTimerScrim()`: reads the live theme tokens through `readTokenRgb` and re-evaluates when the theme, image or options change.
- **New: `src/components/timer/background-settings.tsx`**: a popover behind an image button next to the settings gear. It has Choose/Replace/Remove, sliders for opacity, blur and brightness, Fill/Fit, a 3×3 position picker, "Reset adjustments", and a "Saved on this device only" note. It uses `useOverlayLock`, so Space can't start a solve while the popover is open.
- **`timer-screen.tsx`**: the root is now `relative isolate`, so the image sits above the page canvas and below every control. It renders the layer and the button, and passes `scrim` to `<TimeDisplay/>` and the hint line.
- **`time-display.tsx`**: a new `scrim` prop puts the digits on `bg-timer-scrim`.
- **`quick-settings.tsx`**: `SettingRow` and `SegmentedControl` are exported for reuse.
- **`src/themes/color.ts`**: `toLinear` and `toGamma` are exported.
- **New test: `tests/unit/timer-background.test.ts`** (14 tests): sanitising, style mapping, percentiles, compositing, scrim decisions with the real Slate and Paper tokens, plus a property check that whenever no scrim is chosen, every timer colour really has 3:1.
- **`docs/design-tokens.md`**: the scrim note now says it is applied automatically.

**Kept on purpose**
- Local-only and `/timer` only (no Supabase, no `user_settings`), as agreed.
- The options stay out of `TimerSettings`, which syncs to Supabase for signed-in users.
- On mobile the panels are full-bleed and have no card chrome, so the image shows behind the whole stack.

**Verified**
- `npm run validate` passes (203 tests); `check:colors` is OK.
- `npm run build && npx next start` (with the dev switcher), on `/timer`:
  - Tested with a black-to-white gradient image generated in the browser and fed through the real file input.
  - The image rendered behind the translucent panels at 1600×900, and the scrim switched on behind the digits and the hint, in both Paper and Slate.
  - Opacity at 10% turns the scrim off.
  - Blur, brightness, fit and position all apply and are saved to localStorage, and survive a reload.
  - Space is blocked while the popover is open.
  - A `.txt` file is rejected with "That file isn't an image." and the existing image is kept.
  - Remove empties IndexedDB and turns the scrim off.
  - No console errors.
  - The test image and options were cleared afterwards.
- `npm run test:e2e:prod`: 10 of 10 pass.

---

## 2026-10-01 — Session wrap-up: step 3 (design tokens and themes) complete

**Request:** Write the logs and list anything still remaining from the step 3 plan.

No source files changed; only this entry was added.

**Plan status: all 8 phases done**, one commit each with its own entry below:

| Phase | Commit |
| --- | --- |
| 1. Tokens | `87f8509` |
| 2. `src/themes/` as source of truth | `2f80426` |
| 3. Fonts | `6c97b83` |
| 4. No-FOUC, cookie as source of truth | `fd6701d` |
| 5. Contrast test | `61f26fb` |
| 6. CI colour guard | `b033615` |
| 7. `learn-*` and stickers | `aaa9ef9` |
| 8. Dev switcher | `0559a1a` |

Follow-ups from review: homepage canvas `5b971fa`; learn pages fully themed, CTA link, and guard gaps `917eb59`.

Every item on the "done" checklist in `docs/design-tokens.md` is ticked.

**Not pushed yet.**
- The commits are local on `main`.
- The first CI run of the colour guard happens on push; it diffs the pushed range via `github.event.before`.

**Verified only indirectly**
- `system` preference on a light OS: covered by the jsdom test of the real init script. The dev machine's OS is dark, so it was not seen in a browser.
- FaceletViewer and the admin CubePainter: render test only. There is no painted `cube_state` in the data, and the painter is admin-only.
- The dev switcher's mobile position above the bottom nav was not visually checked.

**Follow-ups for later steps (out of step 3 scope)**
- Step 8: remove `src/components/dev/theme-switcher.tsx` and the `NEXT_PUBLIC_THEME_SWITCHER` default in `next.config.ts` once the theme settings page exists.
- Step 8: `system` does not react to OS theme changes mid-session (a small `matchMedia` listener). Decide whether a missing cookie should mean `system` instead of Slate.
- Step 6: the type-scale (`--text-lg/xl/2xl`) and `--shadow-*` tokens were deferred because they collide with Tailwind's scales. Adopt `--text-timer` for timer sizing.
- `--timer-scrim` is defined and tested but not applied automatically yet; that needs user background images.
- `--sticker-*` does not reach the cubing.js 3D/2D players yet; they need a stickering config.
- Hardcoded colours remain outside the learn pages, e.g. stats and profile. The guard only blocks new ones.
- There is no custom `not-found.tsx`; Next's default 404 ignores the theme.
- The learn pages' `mix-blend-screen` glows are faint on Paper (cosmetic).

---

## 2026-10-01 — Learn pages fully themed; guard gaps and CTA link fixed

**Request:** Fix the white text on the learn pages in Paper ("Learn. Practice." was barely visible) and check whether anything else remains.

**Changed**
- **All learn routes and `src/components/learn/*`**: the remaining 79 raw colours, plus 4 found after tightening the guard.
  - `text-white` → `text-foreground`, including the hero headings, card titles and stat labels.
  - `border-white/*` → `border-border`; `hover:border-white/10` → `hover:border-foreground/20`.
  - `bg-white/[x]` → `bg-foreground/[x]`. Identical on Slate, and a matching subtle tint on Paper.
  - `bg-black/20|30` (the algorithm card's case well and expanded area) → `bg-background/60|80`, recessed in both themes.
  - `text-green-400|500` for learned or completed → `text-success`.
  - The amber access badge, the blue difficulty icon and the yellow rating star → `warning`.
  - The grid-line backgrounds `#80808012` → `color-mix(in oklch, var(--foreground) 7%, transparent)`.
  - Mask `#000` → `black` (alpha only).
  - The cube image's black drop shadow → `color-mix(in oklch, black 80%, transparent)`.
- **`algorithm-card.tsx`**: the hover glow was `rgba(var(--primary),0.3)`, which is invalid because `--primary` is oklch, so it never rendered. It is now `color-mix(...)`.
- **CTA bug** (`cta-section.tsx`, `learn/[puzzle]/page.tsx`)
  - "Start Beginner Method" linked to a hardcoded `/learn/<puzzle>/beginner-method`, which 404s; the series slug is `beginner`.
  - The page now passes the puzzle's first tutorial series, which is ordered by `order_index`. The CTA is hidden when the puzzle has none (2x2 today) instead of linking to a 404.
- **`scripts/check-colors.mjs`**: two gaps fixed, both caused by Tailwind's `_` space separator being a word character.
  - Hex followed by `_` (e.g. `#80808012_1px`) was missed.
  - `_rgba(0,…)` was missed because of the `\b` boundary.
  - Fixture tests were added for both.

**Kept on purpose**
- `mix-blend-screen` glows are left as they are (not a colour); they are simply faint on Paper.
- The black 404 page is Next's default `not-found`, which follows the OS colour scheme, not our theme. There is no custom `not-found.tsx` yet.

**Verified**
- `npm run validate` passes (189 tests). `npm run check:colors` is OK. A rescan of every learn file finds 0 raw colours.
- `NEXT_PUBLIC_THEME_SWITCHER=1 npm run build && npx next start`:
  - In Paper, `/learn`, `/learn/333`, `/learn/333/oll` and `/learn/333/beginner` all read correctly: headings, card titles, stat labels, grids and badges.
  - Slate looks as before, except the grid lines are a touch brighter.
  - The CTA links to `/learn/333/beginner`; `/learn/222` shows no CTA.

---

## 2026-10-01 — Step 3, Phase 8: temporary dev theme switcher

**Request:** Phase 8 of the design-token plan: a temporary dev-only switcher so both themes can be checked visually, including under `npm run build && npx next start`.

**Changed**
- **New: `src/components/dev/theme-switcher.tsx`** (marked `TEMP(step 8)`)
  - A fixed pill in the bottom-left with Slate | Paper | System, built from `THEMES`. It calls `setTheme()` and reads the current value through the existing `useSyncExternalStore` plumbing.
  - It sits above the mobile bottom nav and stops click propagation, so it can't start the timer.
  - It only exists when `NODE_ENV === "development"` or `NEXT_PUBLIC_THEME_SWITCHER === "1"`. Both are inlined at build time, so otherwise it is a no-op and its code is removed by the minifier.
- **`src/app/layout.tsx`**: renders `<ThemeSwitcher />`.
- **`next.config.ts`**: `env.NEXT_PUBLIC_THEME_SWITCHER` defaults to `""`. Without that, an unset `NEXT_PUBLIC_` variable is left as a runtime `process.env` lookup and is never folded, which kept the disabled switcher in the shared layout chunk every page loads. Found by grepping the build.
- **`.env.example`**: documents the flag.
- `docs/design-tokens.md`: the whole done checklist is ticked.

**Verified**
- `npm run validate` passes (187 tests); `check:colors` is OK.
- `npm run build` **without** the flag: `Theme (dev)` appears in 0 client chunks. Before the `next.config` fix, it was in the 33 KB shared chunk that `/`, `/timer`, `/learn` and `/settings` load.
- `NEXT_PUBLIC_THEME_SWITCHER=1 npm run build && npx next start`:
  - The switcher shows on `/timer`, and clicking it switches theme without touching the timer.
  - Idle digits are the foreground colour, and holding turns each theme's red. Released early, so no solve was recorded on the signed-in account; running and ready are checked via their tokens and the contrast test.
  - The timer font is JetBrains Mono on Paper and Geist Mono on Slate.
  - `/learn` was already checked in Phase 7.

---

## 2026-10-01 — Step 3, Phase 7: migrate `learn-*` tokens and sticker colours

**Request:** Phase 7 of the design-token plan: replace the page-and-hue `learn-*` tokens with role tokens and move the sticker hex values onto `--sticker-*`.

**Changed**
- **Learn pages and components**: `learn/page.tsx`, `learn/[puzzle]/page.tsx`, `series-card`, `feature-section`, `filter-bar`, `hero-section`, `cta-section`, `puzzle-hero`, `puzzle-card`, and `puzzle-series-list`. 56 lines in total: the 39 `learn-*` usages plus the hardcoded teal and purple `rgba(...)` glows.
  - `learn-teal` → `primary` and `learn-purple` → `accent-2`, keeping opacity modifiers.
  - `bg-learn-bg` → `bg-background` on the two full-page canvases and `bg-card` on panels (review decision Q2).
  - `rgba(0,229,196,x)` / `rgba(124,92,255,x)` → `color-mix(in oklch, var(--primary|--accent-2) x%, transparent)`. This applies in Tailwind arbitrary values, inline `style` gradients, and the series-card colour object.
  - Other raw colours on the same lines were also cleaned, because the colour guard checks whole added lines:
    - `text-white` → `text-foreground`
    - `border-white/*` → `border-border`
    - `bg-white/[0.03]` → `bg-muted/30`
    - `text-black` on the teal CTA → `text-primary-foreground`
    - `to-blue-400` → `to-accent-2`
    - the mask `#000` → `black`
- **New: `src/lib/stickers.ts`**: `STICKER_FILL` (a face letter → `var(--sticker-*)`), `STICKER_OUTLINE`, and `stickerFill()`.
- **`facelet-viewer.tsx`**
  - The hex map is gone. All 21 stickers and the outline use `style={{ fill, stroke }}`, because `var()` in SVG presentation attributes is unreliable.
  - The background rect uses `--sticker-outline`.
- **`admin/cube-painter.tsx`**
  - Uses the shared map, which **fixes its swapped R/L colours** (review decision Q7).
  - The grid gap uses `bg-sticker-outline`.
- **Legacy tokens removed**: `--learn-*` from `slate.ts` and `TOKEN_NAMES`, the `LegacyToken` exemption, and the `--color-learn-*` aliases. The generated CSS is regenerated.
- **New test: `tests/unit/stickers.test.tsx`** (5 tests)
  - the token map and the default scheme (R orange, L red)
  - FaceletViewer renders `var(--sticker-*)` fills and the outline, with no hex
  - missing facelets render as masked
- `docs/design-tokens.md`: checklist ticked.

**Kept on purpose**
- Raw colours on learn-page lines that don't use `learn-*` are unchanged (out of scope for step 3). The most visible are `text-white` on "Learn. Practice.", the card titles and the stat labels, which are nearly invisible on Paper.
- `--sticker-*` does not reach the cubing.js 3D and 2D players; they need a stickering config later.

**Verified**
- `npm run validate` passes (187 tests); `npm run check:colors` is OK.
- No `learn-(bg|teal|purple)` remains in `src/`.
- `npm run build && npx next start`:
  - `/learn` and `/learn/333` in Slate: panels are now on `--card` (the expected lift from `#070B17`); accents, badges and gradients are unchanged.
  - In Paper, everything migrated follows the theme.
  - FaceletViewer renders only for cases with a painted 54-character `cube_state`, and there are none in the data today, so it is covered by the render test instead.
- `npm run test:e2e:prod`: 10 of 10 pass.

---

## 2026-10-01 — Step 3, Phase 6: CI colour guard

**Request:** Phase 6 of the design-token plan: fail CI on new raw colours in changed files. Review decisions: scan `.ts` as well as `.tsx`, and flag `white`/`black` classes.

**Changed**
- **New: `scripts/check-colors.mjs`** (`npm run check:colors [base]`, default `origin/main`)
  - Scans only lines **added** since the merge base, including uncommitted edits locally.
  - Flags:
    - palette classes (`bg-slate-800`)
    - `white`/`black` classes (`text-white`, `bg-white/5`)
    - arbitrary colours (`bg-[#…]`, `-[rgb(…)`)
    - hex literals
    - literal colour functions (`rgba(0, …)`)
  - Comment lines and `rgb(${r} …)` template strings are ignored, so `token-color.ts` passes.
  - Exempt: `src/themes/**`, `tests/**`, and the ImageResponse files (`icon.tsx`, `opengraph-image.tsx`), which can't read CSS variables.
  - Escape hatch: a `color-guard-allow: <reason>` comment on the same line or the line above.
  - The output gives `file:line  match  (kind)` and a suggested fix.
- **New test: `tests/unit/color-guard.test.ts`** (23 tests): lines that should and shouldn't be flagged, exemptions, diff parsing with line numbers, and allow comments.
- **`package.json`**: new `check:colors` script.
- **`.github/workflows/ci.yml`**
  - The validate job checks out with `fetch-depth: 0` and runs the guard after lint.
  - The base is `origin/<base_ref>` for pull requests, `github.event.before` for pushes (only the pushed commits), and `origin/main` as a fallback. Event values are passed via `env`, not interpolated into the script.
- `docs/design-tokens.md`: checklist ticked.

**Kept on purpose**
- Added lines only, so touching an old file doesn't force a full migration (step 3 scope).
- `npm run validate` is unchanged, because the guard needs an `origin/main` ref.

**Verified**
- 182 unit tests pass; `tsc` and lint are clean.
- `npm run check:colors` on this branch: OK.
- Adding `bg-slate-800 text-[#fff]` and `"#EAB308"` to `cta-section.tsx` without committing fails with exit 1 and four findings at the right `file:line`. After reverting it exits 0.
- A SHA base (the push path) works.

---

## 2026-10-01 — Step 3, Phase 5: theme contrast test

**Request:** Phase 5 of the design-token plan: a unit test that computes WCAG ratios for every theme and fails on any miss.

**Changed**
- **New: `src/themes/color.ts`**, with no dependencies. It covers:
  - parsing hex and oklch; oklch uses Björn Ottosson's matrices
  - resolving `var()` chains (e.g. `timer-hold` → `destructive`)
  - alpha compositing
  - WCAG relative luminance and ratio
- **New: `src/themes/contrast-rules.ts`**: the spec's rules as data.
  - Body text: 4.5:1 on background, card and raised.
  - Status colours as text: 4.5:1 on all three surfaces.
  - `foreground-subtle`: 4.5:1 on background and card only (review decision).
  - Every `-foreground`/fill pair: 4.5:1.
  - Timer digits and states: 3:1 on background and card.
  - Chart series: 3:1 on background.
- **New test: `tests/unit/theme-contrast.test.ts`**
  - One test per theme and pair: 108 checks.
  - `--timer-scrim` keeps the digits at 3:1 over pure black and pure white background images.
  - The converter is pinned to known values (`oklch(0.208 0.04 265.8)` = `#0f172a`), so a maths slip can't make every check pass.
- **`src/themes/slate.ts`**: `--destructive` changed from `oklch(0.704 0.191 22.216)` to `oklch(0.73 0.191 22.216)`.
  - The test found 4.34:1 on `surface-raised`; the spec's `#F87171` hex had shown 4.54 and hidden it.
  - Following the "fix values, don't relax rules" decision, this is the smallest lightness step that passes (4.57).
  - It also slightly lightens `timer-hold`, which aliases it.
- `themes.generated.css` is regenerated.
- `docs/design-tokens.md`: the change is recorded and the checklist item ticked.

**Verified**
- `npm run validate` passes (159 tests).
- Setting Paper `muted-foreground` to `#999999` fails with `Paper: --muted-foreground on --background is 2.53:1, needs 4.5:1`, and so on. Reverted afterwards.
- `npm run build` passes, and the built CSS carries the new Slate destructive value.

---

## 2026-10-01 — Homepage scramble background follows the theme

**Request:** The homepage's floating move-chip background kept its dark and teal colours in Paper; fix it before continuing with step 3.

**Changed**
- **New: `src/lib/token-color.ts`**
  - `readTokenRgb(token)` resolves a theme token (oklch included) to sRGB by painting one canvas pixel, because canvas can't read CSS variables and needs alpha variants.
  - `withAlpha(rgb, a)` builds the colour string.
  - `observeTheme(cb)` is a MutationObserver on `<html>` for `data-theme` and `class`.
- **`src/components/react-bits/scramble-matrix.tsx`**: the ten hardcoded `rgba(...)` colours are replaced with theme tokens:
  - teal and mint → `--primary`
  - chip fill → `--background`, which is what the old `rgba(15,23,42)` was in Slate
  - highlighted letter → `--foreground`

  The palette is re-read when the theme changes. The reduced-motion single frame is redrawn.

**Kept on purpose**
- Animation, layout and alpha curves are unchanged. The mint highlight is now just `--primary` at full alpha.

**Verified**
- `npm run validate` passes.
- `npm run build && npx next start`, `/`: in Paper the chips are cream with rust outlines and letters; Slate looks as before. Switching theme live recolours the canvas without a reload.

---

## 2026-10-01 — Step 3, Phase 4: no-flash theme with the cookie as the source of truth

**Request:** Phase 4 of the design-token plan: apply the theme before first paint and keep `.dark` working for shadcn. Review decision Q8: the `cubehub-theme` cookie is the single source of truth, with no localStorage.

**Changed**
- **New: `src/themes/preference.ts`**
  - Defines `ThemePreference` (`slate | paper | system`) and `THEME_COOKIE`.
  - `parseThemePreference()` maps the legacy `dark` → `slate` and `light` → `paper`. Missing or unknown values → Slate.
  - Also `resolveThemeId()`, `themeMode()`, and `SYSTEM_THEMES`.
- **New: `src/themes/init-script.ts`**
  - `THEME_INIT_SCRIPT` is built from the theme registry, so ids and modes can't drift.
  - It does something only when the cookie is `system`: it reads `prefers-color-scheme` and sets `data-theme` and `.dark`.
- **`src/app/layout.tsx`**
  - Renders `data-theme` and `.dark` from the cookie.
  - Inlines the script in `<head>`, following Next's `preventing-flash-before-hydration` guide.
  - Adds `suppressHydrationWarning` on `<html>`.
  - The unused `light` class is no longer rendered.
- **`src/lib/theme.ts`**
  - The type is renamed from `Theme` to `ThemePreference`.
  - `setTheme()` resolves the theme, sets `data-theme` and `.dark`, and writes only the cookie.
- **`src/components/settings/settings-form.tsx`**: the Light / Dark / System options now store `paper` / `slate` / `system`. The labels are unchanged.
- **New test: `tests/unit/theme-preference.test.ts`** (7 tests)
  - Parsing, including the legacy values, and resolution.
  - Runs the real init script in jsdom with `matchMedia` mocked, for system + light, system + dark, and a no-op for an explicit theme or no cookie.

**Kept on purpose**
- No localStorage.
- `color-scheme` comes from the generated `[data-theme]` CSS, so the script doesn't set it.
- With `system`, changing the OS theme mid-session isn't picked up live; it applies on the next load, as before.

**Verified**
- `npm run validate` passes (51 tests).
- `npm run build && npx next start`:
  - The server renders the right attributes for every cookie value: none → slate, light → paper, paper → paper, dark → slate, system → slate (server-side guess).
  - The script is in `<head>` with its regex escaped correctly.
- In the browser:
  - `system` on a dark OS stays Slate. The OS-light path is covered by the jsdom test.
  - Choosing Light in Settings switches to Paper at once and writes `cubehub-theme=paper`. After a reload the server renders Paper.
  - No hydration or other console errors on reload under paper or system.

---

## 2026-10-01 — Step 3, Phase 3: font tokens

**Request:** Phase 3 of the design-token plan: wire `--font-ui`, `--font-mono` and `--font-timer` through `next/font`, loading JetBrains Mono only when Paper needs it.

**Changed**
- **`src/themes/`**
  - New tokens `font-ui`, `font-mono` and `font-timer`. `font-timer` is a core token, so every theme must set it.
  - In the base and Slate, all three point at the Geist variables.
  - Paper sets `--font-timer: var(--font-jetbrains-mono), var(--font-geist-mono), monospace`.
  - The generated CSS is regenerated.
- **`src/app/layout.tsx`**: adds `JetBrains_Mono({ variable: "--font-jetbrains-mono", preload: false, display: "swap" })` and puts its variable class on `<html>`.
- **`src/app/globals.css`**
  - `--font-sans` now points to `var(--font-ui)`.
  - `--font-mono` is removed from `@theme inline`. The theme token is now Tailwind's own variable: Tailwind's `.font-mono` reads `var(--font-mono)`, and the unlayered token overrides Tailwind's default in `@layer theme`.
  - New `@utility font-timer`, which sets the font family and `tabular-nums`.
- **`src/components/timer/time-display.tsx`**: `font-mono tabular-nums` becomes `font-timer`. This is a class swap only.

**Kept on purpose**
- Timer sizing is unchanged; adopting `--text-timer` belongs to step 6.

**Verified**
- `npm run validate` passes (44 tests).
- `npm run build && npx next start`, then `/timer`:
  - **Slate** loads only the two preloaded Geist woff2 files. JetBrains Mono has no preload link and is not fetched.
  - **Paper**: after switching, one more woff2 (the JetBrains latin subset) loads. The digits render in JetBrains Mono with `tabular-nums`.
  - The built CSS has no `--font-mono` cycle.
- `npm run check:chunks` passes.

---

## 2026-10-01 — Step 3, Phase 2: `src/themes/` is the source of truth

**Request:** Phase 2 of the design-token plan: typed theme objects, with the `[data-theme]` CSS generated from them.

**Changed**
- **New: `src/themes/`**
  - `types.ts`: `TOKEN_NAMES`, `ThemeDefinition`, `CoreToken`, and `BaseTheme`.
    - A theme that leaves out a core token fails `tsc`.
    - The type is named `ThemeDefinition` because `Theme` is already the preference type in `src/lib/theme.ts`.
  - `base.ts` holds the `:root` light base (internal only). `slate.ts` holds what used to be the `.dark` values. `paper.ts` is the Paper theme.
  - `index.ts` exports `THEMES`, `ThemeId`, and `resolveTokens()`.
  - `css.ts` exports `themesToCss()`. It emits `:root` first and then one `[data-theme]` block per theme, sets `color-scheme` from `mode`, and rejects unsafe values and ids.
  - `themes.generated.css` is the checked-in output.
- **New test: `tests/unit/themes-css.test.ts`**
  - A file snapshot (`toMatchFileSnapshot`), so a stale generated file fails CI. Regenerate it with `npx vitest run -u`.
  - Also checks ordering and `color-scheme`, and that injection is rejected.
- **`src/app/globals.css`**: the `:root`, `.dark`, and Paper blocks (200 lines) are replaced by `@import "../themes/themes.generated.css"`. The `@theme` aliases stay.
- **`src/app/layout.tsx`**: renders `data-theme="slate"` when the cookie resolves to dark, because Slate's values are now keyed on `[data-theme="slate"]`, not `.dark`.
- **`src/lib/theme.ts`**: `setTheme()` sets or removes `data-theme` along with `.dark`, so switching on the client still restyles the page without a reload.

**Kept on purpose**
- The generated CSS is checked in and there is no build step: nothing more runs in `predev`/`prebuild`, and CI's Node 20 can't import `.ts` without adding `tsx`.
- `learn-*` values are still defined, as a `LegacyToken` that the base is exempt from, until Phase 7.
- Slate now lists `timer-holding`, `timer-running`, `timer-digits`, and `radius` explicitly (core tokens). The values are unchanged.
- Light still means the `:root` base; the switch to `light → paper` is Phase 4.

**Verified**
- `npm run validate` passes (44 tests).
- Removing `timer-running` from `paper.ts` makes `tsc` fail with "Property 'timer-running' is missing".
- `npm run build && npx next start`: the server renders `data-theme="slate"`. Under both Slate and Paper, the computed values of all 184 custom properties match the Phase 1 baseline exactly: 368 checked, 0 differences. `/timer` and `/learn` look unchanged.

---

## 2026-10-01 — Step 3, Phase 1: design tokens added to globals.css

**Request:** Step 3 of the CubeHub → CubeUniverse plan (the design token spec), Phase 1: add the new tokens for the `:root` base, Slate (`.dark`), and Paper, with `@theme inline` aliases.

**Changed**
- `src/app/globals.css`
  - Added the 19 new role tokens (`surface-raised`, `surface-overlay`, `foreground-subtle`, `accent-2`, `success`, `warning` and their `-foreground` pairs, `timer-digits`, `timer-scrim`, and `sticker-*`) to `:root` and `.dark`. Values are oklch converted from the spec's hex; sticker colours stay as their exact current hex.
  - Added a complete `[data-theme="paper"]` block, covering every shadcn token so nothing falls through to the grey base.
  - Added a `--color-*` alias for every new colour in `@theme inline`.
  - Added a plain `@theme` block for `--text-scramble`, `--text-timer`, and `--ease-standard`. Aliasing them in `@theme inline` would be circular.
  - Added `--space-panel`, `--layout-gap`, `--duration-*`, and `color-scheme` to each theme.
- `docs/design-tokens.md`: the spec, renamed from `CubeUniverse Design Token Spec (Step 3).md` and updated with the review decisions:
  - four colour fixes: Slate accent-2 `#A48EFF`, and Paper primary `#A94016`, warning `#8C520A`, and success `#216F45`
  - `foreground-subtle` is not allowed on `surface-raised`
  - cookie as the source of truth
  - Tailwind's text and shadow scales deferred
  - the guard also scans `.ts` files

**Kept on purpose**
- `--learn-*` stays until Phase 7.
- `.dark` still carries the Slate values; they move to `src/themes/` in Phase 2.
- The spec's `--text-lg/xl/2xl` and `--shadow-*` are not defined, because they would override Tailwind's scales across the site.

**Verified**
- `npm run validate` passes (39 tests; the one lint warning was already there).
- `npm run build && npx next start`: `/timer` in Slate looks unchanged.
- Setting `data-theme="paper"` in the browser (with `.dark` removed) gives the cream canvas with dark digits and `color-scheme: light`; `--radius` becomes 0.75rem.
- The computed values of all 184 custom properties under both themes were saved as the baseline for Phase 2's before/after diff.

---

## 2026-09-30 — Session wrap-up: next-steps review (no code changes)

**Request:** Review `project_plan/context.md` and this log, and set out the next steps.

No source files changed. Only this entry was added. The agreed order of work:

1. **Commit the pending work.** That covers the Drill Lab, the Drill tab, the §3.5 backup-restore
   fix, docs and tests. First decide on `.mcp.json`: it grants the Supabase MCP **write**
   access, which contradicts `docs/database.md`. The recommendation is to add
   `&read_only=true`.
2. **Bring live Supabase up to date (blocking).** Run each step in its own SQL editor run: fix
   the `'OLL'` case → seed → access tiers → drill lab → `notify pgrst, 'reload schema'` → the
   drill test alone (expect 22 PASS) → `supabase migration repair` if using the CLI. The full
   steps are in `project_plan/context.md`.
3. **Checks that need live data or a deploy:**
   - the signed-in drill flow (save, +2/DNF/delete, reload, weakest-first)
   - the recommendation with saved data
   - Vercel: build command, `check:chunks` on the deployed URL
   - Supabase Site URL, redirect allow-list and `NEXT_PUBLIC_SITE_URL`
   - the admin case editor in a browser
4. **Finish Phase 3:**
   - wire up `filter-bar.tsx`, which is still a stub
   - decide whether to enforce access tiers in RLS (today they are badges only)
   - add seeded drill data to CI so the 3 skipped e2e tests run
   - optionally move the card and tutorial viewers to the derive-from-algorithm primitive
5. **Then Phase 4 (Shop).** It needs `products` and `sponsors` migrations before the
   recommender is built.

**Housekeeping noted:**
- `server-only` and `postcss` are used but not declared in `package.json`.
- The domain (`cubehub.in` or `.io`) and the timing of Cubelelo outreach are still open.

---

## 2026-09-30 — Drill tab in the navbar; live database check

**Request:** Add a Drill tab to the navbar, and check whether the live database is correct.

### Changed

| File | Change |
|---|---|
| `src/lib/navigation.ts` | New **Drill** tab (`/learn/333/drill`, `Target` icon) after Learn. `NavItem` gains an optional `match` regex, and `activeNavHref()` picks exactly one active tab, most specific first. Without this, the drill page lights up both Learn and Drill, since it lives under `/learn/`. The phone bar stays at 5 tabs: Compete (still a placeholder page) drops out there alongside Stats, and stays on desktop. |
| `navbar.tsx`, `bottom-nav.tsx` | Use `activeNavHref()` instead of their own prefix checks. |
| `learn/[puzzle]/drill/page.tsx` | The empty state now says so when a puzzle has no algorithm sets at all, and links to tutorials, instead of "this set has no cases". |
| `tests/unit/navigation.test.ts` (new) | Active-tab rules, and the 5-tab phone bar including Drill. |

**Verified:** tsc, eslint and 39/39 unit tests pass. In the dev server, `/learn/333/drill`
highlights only Drill on both desktop and phone, and `/learn` highlights only Learn.

### Live database check (anon REST; the Supabase MCP was still not connected in this session)

Unchanged from before. `algorithm_subsets`, `can_access`, `drill_attempts`, `drill_state` and
`v_drill_variant_stats` don't exist through the API, and there is still 1 algorithm case
(`subset = 'OLL'`, case 1). The migrations are not applied yet, or PostgREST's schema cache
was not reloaded. Follow the ordered steps from the previous answer (fix the `'OLL'` case,
then seed, then access tiers, then drill lab, then `notify pgrst, 'reload schema'`, then run
the test on its own).

---

## 2026-09-30 — Supabase MCP server added (project scope)

**Request:** Add the hosted Supabase MCP server to the project.

| File | Change |
|---|---|
| `.mcp.json` (new) | `supabase` HTTP server for project `bmgupzbyzuxrdsqtiwli`, with features docs, account, database, debugging, development, functions and branching. |

**Note:** the URL has no `read_only=true`, so the server can **write** to the live database.
`docs/database.md` says the MCP is read-only and that migrations are applied deliberately
through the dashboard or CLI, not by an agent. This change conflicts with that until one of
the two is updated.

---

## 2026-09-30 — Priority 1: Drill Lab, plus 3.5 backup restore

**Request:** Build the Drill Lab (brief §3.1–3.4) and close the JSON-backup restore gap (§3.5).
The plan (`~/.claude/plans/warm-squishing-parnas.md`) was approved with these choices: a new
route with the timer's train mode retired; guests can drill but nothing is recorded for them;
the recognition split ships as an option that is off by default.

### Schema: `supabase/migrations/20260930000000_drill_lab.sql` (written, **not applied to live**)

| Object | Purpose |
|---|---|
| `drill_attempts` | One row per rep, keyed `(user_id, algorithm_id)` (per variant, not per case). Generated `effective_time_ms` and `succeeded`. `recognition_ms` is nullable. `source` is `drill` or `detected_in_solve`. Owner-scoped RLS. |
| `drill_state` | Spaced-repetition state (counts, ease, interval, `next_review_at`). Written only by trigger; clients can read their own rows but not write. |
| `recompute_drill_state()` + 3 statement-level triggers | Authoritative replay per `(user, algorithm)`, so +2/DNF edits and deletes heal the state. Execute is revoked from client roles. |
| `v_drill_variant_stats` | `security_invoker` view: per-variant attempts, successes, DNF-free medians (execution and recognition), and the review state. |

### Added

| File | Purpose |
|---|---|
| `src/lib/drill/case-state.ts` | The §3.1 primitive. twisty-player gets the real alg with `experimentalSetupAnchor: "end"`, so it shows the inverse (the case) and plays the alg forward. Also handles random pre-AUF and the physical-cube setup (`Alg.invert()`). |
| `src/lib/drill/recommend.ts` | Switch rule: both variants need ≥10 successes, and the alternative must be ≤95% of the current median **and** ≥100 ms faster. Also a "try the alternative" nudge, and the §3.3 sentence. |
| `src/lib/drill/order.ts` | Weakest first (due reviews, then never drilled, then failure rate ×4 plus relative slowness), a weighted pick from the weakest 3 with no immediate repeats, the current-variant rule, and guest stats from attempts. |
| `src/lib/drill/{types,rows,dal,actions}.ts` | Types, row mapping, the server-only DAL (`getDrillData`), and server actions (record, set penalty, delete). |
| `src/stores/drill-store.ts` | Drill timer, separate from `timer-store`. Starts on the first tap with no hold. Optional recognition phases. |
| `src/components/drill/*` | `DrillLab`, `DrillCaseView`, and the variant picker, session list and weakest-first ranking (which doubles as the custom-set picker). |
| `src/app/(app)/learn/[puzzle]/drill/page.tsx` | Route with `?set=` (slug or `all`), `?cases=`/`?case=` for custom sets, and `?order=`. |
| `supabase/tests/drill_lab_test.sql` | Lifecycle and RLS test (`begin … rollback`, 22 PASS rows). |
| `tests/unit/drill-case-state.test.ts`, `drill-logic.test.ts`, `backup-roundtrip.test.ts` | Unit tests. |
| `tests/e2e/drill.spec.ts` | Guest drill, recognition split, **the switch recommendation built from timed reps**, and redirects. |

### Changed

| File | Change |
|---|---|
| `timer-screen.tsx`, `timer/page.tsx` | Train mode removed (setup injection, drill report overlay, props). `?train=` now redirects to the drill: a UUID becomes `?case=`, a slug becomes `?set=`. |
| `learn/[puzzle]/[series]/page.tsx`, `algorithm-card.tsx` | "Train Set/Case" links now go to the Drill Lab ("Drill Set/Case"). |
| `src/lib/learn/dal.ts`, `actions.ts` | Removed the now-unused `getRandomCaseForDrill` and `getRandomCaseForDrillAction`. |
| `src/lib/timer/stats.ts` | Added `medianMs()` (matches `percentile_cont`). |
| `src/lib/timer/import-cstimer.ts` | **§3.5 fix:** restoring a CubeHub backup dropped sessions that had no solves. They are now kept. The rest of the restore path already existed and the new round-trip test confirms it. |
| `scripts/check-chunks.mjs` | Now also crawls `/learn/333/drill?set=pll`. |
| `docs/database.md`, `docs/roadmap.md` | Drill Lab section; spaced-repetition gap closed; live-data gap recorded. |

### Verification

- **Migration on a real Postgres:** a throwaway `supabase/postgres:15.8.1.060` container
  (podman), with all 9 migrations applied in order as `supabase_admin`, then
  `drill_lab_test.sql`: **22/22 PASS**. Negative check: with the attempts policy loosened to
  `true`, exactly the 3 cross-user RLS rows FAIL. Restoring the policy brings back 22/22.
- **Unit:** 37/37 pass. Every seeded PLL, OLL and Ortega algorithm, with every AUF, returns
  to solved from its derived setup, which proves the primitive for every case in the seed.
- **Build:** `npm run validate` passes (0 errors). The Turbopack build passes. The chunk
  guard resolves 67 files across 4 pages.
- **Browser, against seeded data:** the app was built against the local DB through PostgREST
  and a small proxy (recipe below). All 10 e2e tests pass there, including the recommendation
  banner generated from real timed reps. Screenshots were checked at desktop width and at
  390 px (no horizontal overflow).
- **Browser, against the real environment:** 7 pass. The 3 drill tests that need data skip
  with a reason, because live has no OLL/PLL data (see below). CI will behave the same way.
- **Bug found by e2e and fixed:** after ticking a drill option, Space toggled the focused
  checkbox instead of driving the drill.
- **Not verified:** the signed-in path (recording through server actions against a real
  session). It needs the migration applied to Supabase first.

### Needs the founder

1. **Live data is behind the code, and this predates today's change.** Live has no
   `algorithm_subsets` table because `20260914000000_access_tiers.sql` was never applied. So
   `getPuzzles()` lists no OLL/PLL series at all. Live also has 1 algorithm case, not the
   seeded 78. Apply the pending migrations and the seed data, then this one.
2. **Apply `20260930000000_drill_lab.sql`** through the dashboard or CLI
   (`supabase migration repair --status applied 20260930000000`), then run
   `supabase/tests/drill_lab_test.sql` in the SQL editor and expect every row to be PASS.
3. **Access tiers aren't enforced by RLS on `algorithms`** (the policy is still
   `is_approved`). The drill matches the series pages, which show tier badges only.

### Local verification stack (recipe)

```sh
podman run -d --name cubehub-pgtest -e POSTGRES_PASSWORD=postgres -p 55432:5432 docker.io/supabase/postgres:15.8.1.060
for f in supabase/migrations/*.sql; do podman exec -i -e PGPASSWORD=postgres cubehub-pgtest \
  psql -h localhost -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -q < "$f"; done
# RLS tests need two users (the signup trigger creates their profiles):
#   insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data) values (…), (…);
podman exec -i -e PGPASSWORD=postgres cubehub-pgtest psql -h localhost -U supabase_admin -d postgres < supabase/tests/drill_lab_test.sql
```

For browser tests, run `postgrest/postgrest` (anon role, a local JWT secret) on 55433, with
a small proxy that maps `/rest/v1/*` to it. Build with `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` pointing at the proxy, then run `E2E_PROD=1 npx playwright test`.
**Rebuild with the real environment afterwards.** `NEXT_PUBLIC_*` values are baked in at build time.

---

## 2026-09-30 — Priority 0: take cubing.js out of the bundle (one bundler for dev and prod)

**Request:** Serve cubing.js from `public/` as a self-contained build and load it at runtime.
Delete both `next.config.ts` workarounds so `next dev` and `next build` use the same bundler.
Add a chunk-404 guard to CI. Done means the landing hero and the scramble preview render in a
local production build.

**Decision (confirmed with the founder):** build the self-contained artifact locally with
esbuild from the installed cubing 0.56.0, instead of mirroring `cdn.cubing.net`. The CDN only
serves the latest release (0.63.8) with no version pinning, which would not match the 0.56.0
types. The output has the same shape as the CDN build: ESM split into chunks, relative
imports only, with `three` bundled in.

### Added

| File | Purpose |
|---|---|
| `scripts/build-cubing.mjs` | esbuild over `cubing/dist/lib` → `public/cubing/<version>/`. Runs on `predev` and `prebuild`. Keeps `chunks/search-worker-entry.js` at a fixed path so cubing finds its worker. Output is deterministic and older versions are pruned. |
| `src/lib/cubing/runtime.ts` | The only entry to cubing: `loadTwisty`, `loadScramble`, `loadAlg`, `loadPuzzles`. Memoised `import(/* webpackIgnore */ url)`; a failed load can be retried. Types come from `node_modules`. |
| `scripts/check-chunks.mjs` | Chunk guard (`npm run check:chunks -- <url>`). Crawls pages, then Turbopack chunk paths, webpack `id→hash` maps (including runtimes embedded in a chunk), and the whole cubing module graph. Fails on any missing file or wrong MIME type. |
| `tests/e2e/cubing-runtime.spec.ts` | Real-browser test: landing 3D cube draws, `/timer` gets a worker-generated scramble and a mounted preview, and nothing 404s or throws. |

### Changed

| File | Change |
|---|---|
| `next.config.ts` | Removed the `webpack` chunkFilename override and the empty `turbopack: {}`. Only `env.NEXT_PUBLIC_CUBING_VERSION` remains. |
| `package.json` | `build` changed from `next build --webpack` to `next build`. Added `predev`/`prebuild` (`build-cubing`), `check:chunks`, `test:e2e:prod`, and the `esbuild` devDependency. |
| `scramble-preview-inner.tsx`, `case-viewer-inner.tsx`, `alg-player-inner.tsx` | `import("cubing/twisty")` → `loadTwisty()`. |
| `src/lib/timer/scrambler.ts` | `import("cubing/scramble")` → `loadScramble()`. The local memo was dropped because the loader memoises. |
| `src/lib/admin/cube-state-utils.ts` | Static `cubing/alg` and `cubing/puzzles` imports → `loadAlg()` and `loadPuzzles()` inside the (already async) functions. |
| `eslint.config.mjs` | Errors on value imports from `cubing/*`, both static and `import()` (type imports are allowed). Ignores `public/cubing/**`. |
| `playwright.config.ts` | In CI, or with `E2E_PROD=1`, tests run against `next start` on port 3100 instead of `next dev`. |
| `.github/workflows/ci.yml` | New "Chunk Guard" step after the build, before Playwright. |
| `.gitignore` | Added `/public/cubing`. |
| `docs/roadmap.md`, `docs/phase1_todo.md` | Marked resolved; documented the fix. The history is kept. |

### Verification

- `npm run validate`: passes (17/17 unit tests, 0 lint errors).
- `npm run build` on Turbopack: finishes in about 23s total. It used to hang forever. No cubing internals remain in `.next/static`.
- `check:chunks` on the production build: 67 files, including all 34 cubing modules, resolve.
  Checked against three deliberately broken builds, and it caught all of them: a missing
  cubing worker, a missing Turbopack chunk, and a webpack build with a chunk renamed so it
  no longer matches its runtime.
- Playwright on `next start`: all 6 e2e tests pass. The cubing test fails when the worker file is hidden, as it should.
- Browser checks on both `next start` and `next dev`: landing hero, 3D showcase cube, timer
  scramble and preview, and the tutorial cube players (6 on `/learn/333/beginner`) all render.
  No page errors and no failed requests.
- **Not browser-tested:** the admin case editor (`cube-state-utils`), which needs an admin login.

### Follow-ups

- Confirm Vercel builds with `npm run build` and that no project setting pins `--webpack`.
- The branches `route3-unbundle-cubing` and `try-cubing-upgrade` remain as the record.

---

## 2026-09-30 — Dead code cleanup

**Request:** Find dead code and remove it safely, without changing behaviour.

**Method:** Ran `knip` (unused files / exports / dependencies) plus
`tsc --noUnusedLocals --noUnusedParameters`, then checked every candidate by hand with grep
across `src/`, `tests/`, `docs/`, `project_plan/` and `public/` before removing it.

### Removed

| What | Where | Why it was dead |
|---|---|---|
| `Cubes` component | `src/components/react-bits/cubes.tsx` (deleted) | Never imported anywhere. |
| Cubes 3D-grid CSS + its `:root` vars | `src/components/react-bits/react-bits.css` | Only used by the deleted `Cubes` component. The Scroll Float / Scroll Reveal styles are kept. |
| `HeroCube` video hero | `src/components/marketing/hero-cube.tsx` (deleted) | Replaced by `ScrambleMatrix` in `164fc10`; nothing imports it any more. It is still in git history. |
| Hero asset README | `public/hero/README.md` (deleted) | Only described the assets for `hero-cube.tsx`. |
| `resolveTheme()` | `src/lib/theme.ts` | Never called. |
| `isEditingLayout()` | `src/stores/layout-store.ts` | Never called. |
| `_FACE_CHARS` constant | `src/components/admin/cube-painter.tsx` | Declared but never read. |
| Unused `React` default imports | `facelet-viewer.tsx`, `cube-showcase.tsx`, `scramble-matrix.tsx`, `tests/unit/username-onboarding.test.tsx` | Not needed with the `react-jsx` transform, and never referenced. |
| Duplicate `export default` | `scroll-float.tsx`, `scroll-reveal.tsx` | Every consumer uses the named export. |
| `@testing-library/user-event` devDependency | `package.json`, `package-lock.json` | No test imports it. |
| `vite-tsconfig-paths` devDependency | `package.json`, `package-lock.json` | `vitest.config.ts` uses Vitest's built-in `resolve.tsconfigPaths` instead. |

### Kept on purpose (flagged as unused, but not dead)

- `src/components/learn/filter-bar.tsx`: not imported yet, but
  `project_plan/2026-09-14-phase3-learn-tab-completion.md` plans to rework it.
- `getAlgorithmSubsets` / `AlgorithmSubset` in `src/lib/learn/dal.ts`: added in the latest
  access-tier commit and listed as a planned export in the Phase 3 plan.
- `src/scripts/**`: a standalone CLI (`npx tsx src/scripts/generate-seed-migration.ts`),
  which is not part of the app import graph.
- Unused sub-exports of shadcn primitives (`CardFooter`, `PopoverTitle`, `Progress*`,
  `buttonVariants`, …): these are library building blocks, left as the shadcn CLI generated them.
- Exports that are used inside their own file (`CubeMark`, `mirrorAlg`, `EXPORT_VERSION`,
  `STOP_DEBOUNCE_MS`, …): the code is live, so only the `export` keyword is extra.
- `_alg` parameter in `algorithm-case-editor.tsx`: a placeholder in a handler that is still
  being built.

### Noticed, not changed

- **Unlisted dependencies:** `server-only` (imported by the four `dal.ts` files) and `postcss`
  are used but not declared in `package.json`. They resolve today only as transitive deps.

### Verification

- `npm run validate` (tsc, eslint, vitest): passes. 17/17 tests, 0 lint errors.
- `npm run build`: passes, all routes compile.
- Pre-existing uncommitted edits to `src/app/(app)/learn/[puzzle]/page.tsx` were left untouched.

## 2026-10-06 — Playground, Phase 1

A virtual puzzle sandbox at `/playground` (plan: `docs/playground.md`).

### Added

- `src/lib/playground/`: csTimer-layout key map by `KeyboardEvent.code`, a pure
  history reducer (moves, undo/redo, `revision` for redraw-vs-animate), and KPuzzle
  checks for legal moves and solved-in-any-orientation.
- `src/components/playground/`: the screen, the `<twisty-player>` wrapper (PG3D so
  click-to-turn works; clicks are routed through the reducer), and a move pad for
  phones.
- Navbar link; a "Try the Playground" button in the Learn hero for mobile, where the
  bottom bar stays at five tabs.
- `tests/unit/playground.test.ts` (15 tests), `tests/e2e/playground.spec.ts` (3 tests).

### Decided

- Playground solves are never stored. No Bluetooth smart-cube work until there is a
  cube to test with.

### Verification

- `tsc`, eslint (no new errors), `check:colors`, `npm test` (224 passed).
- `npm run build`, then the playground and cubing-runtime e2e specs against
  `next start`: 5 passed. Click and touch-tap turning checked by hand in Chromium.

