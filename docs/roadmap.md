# Roadmap

## What CubeHub is

A single destination for speedcubers — timer, tutorials, competition, and buying advice — replacing the need to juggle csTimer, jperm.net, forums, and shopping sites. India-first: INR pricing, Indian sellers, regional leaderboards. Dark-mode-first, minimal, fast.

Design principles: the timer loads in under a second and works before anything else on the page; a new user can start timing within five seconds of landing; mobile-ready (many cubers practice with a phone on the desk); accessible by default.

## Where we are (2026-10-14)

The phase numbers below are the original plan. The build has not followed them strictly:
Playground, Drill Lab and Profiles were added before the Shop, because they make the free core
(timer, learning, practice) worth coming back to, and a beta needs that more than it needs a
shop. This is the order things were actually built, and what comes next:

| # | Work | Status | When |
|---|---|---|---|
| 1 | Phase 0 — Foundation (Supabase, auth, route groups) | ✅ Done | Jul 17–18 |
| 2 | Phase 1 — Core timer, landing page | ✅ Done | Jul 18–19 |
| 3 | Phase 2 — Stats page, csTimer import/export | ✅ Done | Jul 25 |
| 4 | Phase 3 — Learn: content, tutorials, admin case editor | ✅ Done | Jul 30 – Sep 14 |
| 5 | Drill Lab (spaced-repetition algorithm practice) | ✅ Done | Sep 30 |
| 6 | Playground (virtual cube, first version) | ✅ Done | Oct 6 |
| 7 | Timer final round (Mo3, typed solves, recently deleted, inspection alerts) | ✅ Done | Oct 11 |
| 8 | Profiles, steps 1–5 (stats, editing, progress, achievements, setup) | ✅ Done | Oct 11–12 |
| 9 | Learn finishing round (case pages, SEO, error pages) + Vercel Analytics | ✅ Done | Oct 13 |
| 10 | Signed-in e2e test accounts | ✅ Done | Oct 14 |
| 11 | Social v1: follows and requests, block, report, Friends hub, notifications, compare | ✅ Live | Oct 14 |
| 12 | **Beta with 10–15 real users** | Planned | |
| 13 | Decide access tiers and the domain, using what the beta shows | After the beta | |
| 14 | Phase 4 — Shop | Planned | |
| 15 | Phase 5 — Arena (bots first, then live races) | Planned | |
| 16 | Phase 6 — Polish & scale | Planned | |

Access tiers and the domain are deliberately **not** decided before the beta.

**Navigation for the beta (2026-10-14):** Compete and Shop are out of the navbar and the phone
bar until they exist, and their landing-page tiles are "Soon" teasers without links. Desktop
nav: Timer, Stats, Learn, Drill, Playground, Profile. Phone bar: Timer, Stats, Learn, Drill,
Profile (Stats took Shop's slot).

## Status

**Phase 0 — Foundation: complete.**

| Step | Delivered | Date |
|---|---|---|
| 1 | Supabase handshake, env wiring, browser + server clients | 2026-07-17 |
| 2 | Schema, RLS and signup trigger verified live (anon read allowed, anon write rejected `42501`) | 2026-07-17 |
| 3 | Session refresh via `proxy.ts`, non-blocking | 2026-07-17 |
| 4 | Auth UI — email/password + Google, confirmation, `/login` `/signup`, navbar wired, manually verified end to end | 2026-07-18 |
| 5 | Route groups for chrome; `/settings` gated; access-control model designed | 2026-07-18 |

**Phase 1 — Core timer: complete.**

| Delivered | Date |
|---|---|
| `performance.now()` timer, spacebar + tap-hold-release, phase machine | 2026-07-18 |
| WCA random-state scrambles (3x3, 2x2) with a prefetched next slot | 2026-07-18 |
| Inspection 8s/15s/off with voice callouts; auto +2 / DNF on overrun | 2026-07-18 |
| Named sessions per puzzle, localStorage → Supabase sync on sign-in | 2026-07-18 |
| Solve list with swipe actions, notes, penalties, undo | 2026-07-19 |
| Ao5/12/50/100, best, mean; 12-solve trend sparkline with Ao5 delta | 2026-07-19 |
| Scramble move tokens, `?` shortcut overlay, PB glow | 2026-07-19 |
| Floating draggable scramble preview (2D/3D, desktop) | 2026-07-19 |
| Landing page at `/` with a live demo timer, OG image, favicon | 2026-07-19 |

At the end of Phase 1, `/learn`, `/compete` and `/shop` were stub pages. Learn has since been
built (Phase 3); `/compete` and `/shop` are still stubs.

Note `solves.effective_time_ms` is a generated column that already applies +2/DNF. Never compute penalties in application code.

*Deliverable met: a usable timer plus a front door, ready to share with the cubing community for beta feedback.*

The full feature list, the final feature round, and what's deferred until users ask are in
[`timer.md`](timer.md).

User profiles (fixes, editing, event tabs, progress, achievements, setup and level) were
planned in [`profile.md`](profile.md) and are built; see **Profiles** below.

## Phase 2 — Analytics

**Complete and verified** (merged into `main`).

Verified 2026-07-25: browser pass done; the PB trigger lifecycle test passes every
assertion (`supabase/tests/pb_lifecycle_test.sql`); every stored personal best matches an
independent recomputation on live data; and a real csTimer file imported to an exact match
against its own embedded per-session counts and means. Both insert paths are exercised —
the ≤20 ratchet by the lifecycle test, the bulk recompute by the 46-solve import, which
correctly moved that account's single/Ao5/Ao12.

| Delivered | Notes |
|---|---|
| All-time `ao5`/`ao12`/`ao50`/`ao100` PBs | `20260726000000_average_pbs.sql` — ratchet on insert, authoritative recompute on every mutation |
| `/stats` page | Navbar gains a sixth link; the bottom bar stays at five and reaches it from the timer's stats drawer |
| Trend chart with Ao5/Ao12 overlay | Emphasis, not three equal series; singles collapse to a per-column density band past ~220 solves |
| Distribution histogram | Bucket widths off a fixed ladder so the axis reads in round numbers |
| Practice heatmap | Local-timezone days; empty days keep a visible square |
| Consistency | σ over the last 50, banded by coefficient of variation so it compares across skill levels |
| CSV + JSON export, csTimer import | Lossless both ways; import ids are derived from the source, so a repeat import is a no-op |

**Recharts was not adopted** — the charts are hand-rolled SVG, extending what the Phase 1 sparkline proved. See `decisions.md`.

Works logged out over localStorage, exactly as it works signed in.

~~**Still open:** the JSON export cannot be re-imported.~~ **Resolved:** import now accepts
CubeHub's own versioned JSON export as well as csTimer files, so a backup can be restored.
`parseCubeHubExport()` in `import-cstimer.ts` handles it, keeping the original solve ids so a
repeat import is a no-op (covered in `tests/unit/import-cstimer.test.ts`).

## Phase 3 — Learn

Four-level content model: puzzle → method → section → case → algorithm(s). 3D case viewer with cubing.js, play/pause, speed control, mirror toggle. Multiple algorithms per case with move counts and community ratings. Drill mode with weakest-cases-first ordering. Per-section progress.

Launch content: 3x3 beginner LBL, CFOP intro, all 57 OLL, all 21 PLL; 2x2 beginner and Ortega.

**This phase applies the access-control migration** — `access_tier`, `algorithm_subsets`, `can_access()`, and the tiered policies. Read `access-control.md` first; the paid-content boundary is set here and is expensive to move later.

**Drill Lab (2026-09-30), live.** `/learn/[puzzle]/drill` shows each case from the inverse of its algorithm (no solver, no hand-entered setup), times reps against the specific algorithm variant, orders cases weakest-first with spaced repetition, and recommends a variant switch when the per-variant medians support it. Schema in `database.md` → Drill Lab. The timer's old `?train=` mode is retired and redirects here. Its e2e tests run in CI against live data.

**Live content (checked read-only 2026-10-13):**

| Puzzle | Set | Cases | Approved algorithms | Stored tier |
|---|---|---|---|---|
| 3x3 | OLL | 57 | 225 | free |
| 3x3 | PLL | 21 | 97 | free |
| 2x2 | Beginner | 6 | 20 | public |
| 2x2 | Ortega | 12 | 47 | public |
| 2x2 | CLL | 42 | 146 | free |
| 2x2 | EG-1 | 40 | 68 | free |
| 2x2 | EG-2 | 40 | 55 | free |
| | **Total** | **218** | **658** | |

Tutorials: 3x3 Beginner (7 steps) and CFOP (1 step, an intro). The access-tier migration (`algorithm_subsets`, `access_tier`) is applied, but **tiers are not enforced**: RLS on `algorithms` still checks only `is_approved`, so a tier is just a badge. Which content needs an account is an open decision (`access-control.md`).

**Finishing round (2026-10-13, branch `feat/learn-phase3`):**
- A page per case, e.g. `/learn/333/oll/27`, with its own title, description, canonical URL and share image. Card names link to it.
- `sitemap.xml` (every published set and case, refreshed daily) and `robots.txt`.
- Themed 404 and error pages.
- OLL shape categories: a seed (`supabase/DataSeeds/20261017000000_oll_shape_categories.sql`) that writes the 57 descriptions as `Group · note` so the category chips appear. Applied 2026-10-13 (57 of 57 cases, 15 groups).

Still open in this phase:
- Enforce access tiers, once that decision is made (after the beta).
- More tutorial content: CFOP has one step.

*Deliverable: shareable tutorials — the main organic-traffic and sign-up driver.*

## Playground

**Phase 1 built (2026-10-06):** `/playground`, a virtual 3x3/2x2 to turn with keys, the
on-screen pad or clicks, scramble, undo/redo, with solved detection. Nothing is stored.
Plan, decisions and later phases in `playground.md`.

## Profiles

**Built 2026-10-11 → 2026-10-12, all five steps checked on live data** (plan: `profile.md`).
Public profile at `/profile/[username]` and `/profile` for your own: real solve stats per
event, editing with avatar upload, privacy toggles (`is_public`, `show_activity`,
`show_learning`), PB timeline, activity heatmap and streaks, learning progress, latest
records, 20 achievements awarded after solves and learning, main cube per event, method,
"learning now", and a level badge from the timer-only Ao12. The fake ELO is gone.

## Social layer

**v1 live 2026-10-14** (migrations `20261018000000_social_enums.sql` and
`20261018000100_social.sql`, test `supabase/tests/social_test.sql`). Migrations applied
2026-10-14 (31/31 PASS); deployed the same day.

- **Follows:** one-way; mutual follows show as "Friends". Following a **private** profile
  sends a request the owner approves, and an approved follower can see the private profile
  (stats, PBs, timeline, achievements), because `profile_visible()` now counts accepted
  follows. Making a profile public accepts every pending request.
- **Counts and lists:** counts are always shown; the Followers / Following lists
  (`/profile/[username]/followers`, `/following`) are visible to whoever can see the profile.
  You can remove a follower.
- **Safety:** block (removes follows both ways, hides each profile from the other, managed in
  Settings), 50 follows per hour, report a profile (10 per day; admins read reports).
  No direct messages.
- **Friends hub** at `/friends`: recent PBs from people you follow (14 days), follow
  requests, and find people (search + suggestions near your 3x3 Ao12).
- **No Friends leaderboard** (removed 2026-10-14, founder): times can be faked by tapping the
  timer, so nothing is ranked until solves can be verified. The `get_friends_leaderboard` RPC
  stays in the database for that version.
- **Notifications:** new follower, follow request, request accepted. A bell beside your name
  on desktop; on phones a dot on the Profile tab and the bell on your own profile. No new nav
  tab: the navbar already has eight.
- **Compare:** `/profile/[username]/compare`, you vs them per event and category, with the
  gap and a head-to-head score.

### Social, later

**Decided with beta feedback, not before** (founder, 2026-10-14): clubs and tournaments in
particular wait for what 10–15 real users ask for. Anything ranked waits for **solve
verification** (camera, timer-only times, or results from real competitions), because a tapped
0.02 single can top any table today.

In rough order of value; each builds on follows.

1. **Solve verification**: the gate for leaderboards, the daily scramble ranking, tournaments
   and Compete.
2. **Daily scramble**: one scramble for everyone each day, ranked India-wide with a Friends
   tab. Cheap (a table and a page), and a reason to come back daily.
3. **Share cards**: "new 12.3 Ao5" images for Instagram and WhatsApp, extending the profile's
   existing share images.
4. **Clubs** (after beta feedback): school or city groups with a club leaderboard. `clubs`, `club_members` and
   `club_join_requests` already exist (unused); needs moderation tools first.
5. **Private friend rooms** in Compete (Phase 5).
6. **Tournaments** (after beta feedback and verification): online events with rounds and
   brackets; needs verified solves and enough active users to fill them.
7. **Social achievements** ("First follower", "Followed by 10").
8. **PB notifications** ("a friend broke their PB"). Left out of v1 because the PB recompute
   triggers can rewrite rows and would spam; recent PBs on `/friends` cover it for now.
9. **Admin report queue** under `/master-access` (unlinked). Until then, read
   `profile_reports` in the Supabase dashboard.

## Beta

Once the social layer is in: 10–15 real users. Their use decides the open product questions
that are deliberately on hold until then: which content is free vs premium (access tiers),
and the domain.

## Phase 4 — Shop

Curated database of ~50–100 cubes. Recommender: puzzle → level (or pulled from the user's actual stats) → budget slider ₹300–₹5,000+ → priority. Returns 3–5 ranked cubes with a two-line "why this cube", INR range, and affiliate links. Sponsored brand pages.

Affiliate and sponsored links are **always** disclosed. Trust is the product.

Needs migrations: `products` is much thinner than this requires, and there is no `sponsors` table.

*Deliverable: first revenue.*

## Phase 5 — Arena

Bot mode first — solve against a bot at a target time, with ELO applied. Works with zero other users online, which is why it precedes matchmaking.

Then: ELO matchmaking queue, race rooms over Supabase Realtime, spectating, private friend rooms, leaderboards (global / India / state), WCA ID linking. Anti-cheat by flagging solves that are statistically impossible against a user's history. 30-second reconnect grace period.

ELO starts at **1000**, matching the live `elo_ratings` default — settled, see `decisions.md`. Blocked on a migration: `profiles` has no `state` column, so state-level leaderboards can't be built yet.

## Phase 6 — Polish & scale

Lighthouse > 90, PWA (preferred over app-store distribution), push notifications, AI-assisted cube recommendations, 4x4 and Pyraminx tutorials, Indian WCA competition calendar, community forum or Discord, Hindi localisation.

## Monetisation

| Stream | Phase |
|---|---|
| Affiliate commissions | 4 |
| Sponsored brand pages | 4 |
| Premium membership | 6 |

Core timer, basic tutorials and basic stats are **always free**. The competitive tab is never paywalled. No selling user data.

The database already supports premium: `subscriptions`, `profiles.premium_until`, `is_premium()`. Nothing implements the "free tier keeps 30 days of history" rule yet.

## Carried-over technical work

- **Deploy** — live on Vercel (`https://pre-cube-hub.vercel.app`) since 2026-07-25. `npm run build` is plain `next build` (Turbopack), with `prebuild` generating `public/cubing/`; the Vercel project uses it with no `--webpack` override. The Supabase Site URL and redirect allow-list point at the live origin (2026-10-11), and `NEXT_PUBLIC_SITE_URL` is set in Vercel (2026-10-13). `npm run check:chunks` passed against the live site on 2026-10-14. GitHub Actions runs validate, the production build and Playwright.
- **Supabase CLI** — linked to the live project on 2026-10-14. All 17 migrations were marked applied with `migration repair` (they had been applied by hand), and `supabase db push` reports the database up to date. New migrations can now go through `supabase db push`.
- **GitHub OAuth** — planned, not built.
- **`cubing.js` render test** — done 2026-09-30: `tests/e2e/cubing-runtime.spec.ts` (3D cube, 2D preview, worker-generated scramble), run against the production build in CI.

## Done: one bundler for dev and production (2026-09-30)

**Resolved.** `next dev` and `next build` both run Turbopack, `next.config.ts` has no bundler
workarounds, and cubing.js is no longer bundled at all. What was done is under
[The fix](#the-fix-2026-09-30). The problem and the failed attempts are kept first, because
they explain why the fix has the shape it does.

### The problem

`next dev` runs Turbopack. `npm run build` is pinned to `next build --webpack`, because the
Turbopack build hangs: `next build` never finishes — 30+ minutes idle in `ep_poll` with no
writes to `.next`, reproduced in a clean directory with no dev server running — while
`--webpack` compiles the same tree in ~18s. Prime suspect is cubing.js worker bundling; the
dev log carries matching `Module worker instantiation using import.meta.resolve(…) failed`
warnings.

So **the code that ships has never run in development.** Everything anyone checks locally is
Turbopack output; everything a user touches is webpack output. Bugs that exist only in one of
them are invisible until someone loads the deployed site and notices.

That is not hypothetical. It has already cost:

1. **The Turbopack build hang** itself (Phase 1) — worked around with the `--webpack` pin.
2. **The 3D cube never loading in production** (2026-07-25). The webpack runtime requested
   lazy chunks by numeric id while the files were emitted under their chunk name, so
   `cubing/twisty` 404'd and `next/dynamic` sat on its loading state forever. The landing
   hero and the scramble preview spun indefinitely in **every** production build, local
   included, for as long as the site had been deployed. Fixed in `next.config.ts` by
   templating `output.chunkFilename` on `[id]` — a second workaround stacked on the first.

Both trace to one root: cubing.js ships a chunk that carries its own webpack runtime, and the
two bundlers disagree about what to do with it.

### Attempted and rejected: upgrading cubing (2026-07-25)

`cubing@0.63.3` was tried on branch `try-cubing-upgrade`. **It does not fix this.** Do not
retry it expecting a different result; the branch is kept as the record.

What it did fix: the Turbopack **build** completes in ~9s where it previously never
completed, with no warnings, and no source changes were needed — `tsc` and `eslint` passed
untouched.

What it did not fix, and why it was abandoned:

- **Turbopack's output cannot run cubing's search worker.** Scramble generation dies at
  runtime with `Module worker instantiation failed. There are no more fallbacks available.`
  Cubing tries three strategies in order — `import.meta.resolve(…)`, an esbuild workaround,
  then `new URL("./search-worker-entry.js", import.meta.url)` — and Turbopack satisfies none
  of them. Webpack rewrites the third, which is why the webpack build works. A timer that
  cannot produce a scramble is worse than one with a build workaround.
- **The webpack chunk-name mismatch survives in 0.63.3.** Rebuilt without the
  `next.config.ts` override, the same two chunks 404 again, `9301` included. The workaround
  is still load-bearing either way.

So the upgrade buys a working Turbopack build whose output is broken, at the cost of seven
minors of churn. Net: nothing. `main` stays on 0.56.0.

There is no public API for pointing cubing at a worker URL of our choosing — that was checked
too, and would have made this trivial.

### Attempted and rejected: serving cubing from public/ (2026-07-25)

Route 3 was built on branch `route3-unbundle-cubing` and **failed in the browser**. Both the
3D cube and scramble generation broke.

Why: **cubing's `dist/lib` is not self-contained.** It is unbundled ESM that expects a
bundler to resolve bare specifiers — `three/src/**` (dozens of them) and self-references like
`cubing/alg` and `cubing/puzzles`. Served as static files, the browser cannot resolve any of
them and the module graph fails to evaluate. cubing ships no bundled variant in the npm
package; `three` is a real dependency.

Every headless check passed — the build worked, the files served, 126 relative imports
resolved — because none of them evaluate the module. **A first-party grep for bare imports
returned zero and was simply wrong** (the pattern required no space after `from`). The lesson
is not about regexes: nothing short of loading the page in a browser can verify that a module
graph runs.

**But the approach is sound if pointed at the right artifact.** `cdn.cubing.net/js/cubing/twisty`
serves a genuinely self-contained build — relative imports only, dependencies resolved. Route
3 done properly means mirroring *that* into `public/` at build time (crawl the chunk graph
from the entry; imports are relative, so it mirrors cleanly), not copying `dist/lib`. Loading
it from the CDN directly also works, at the cost of a runtime third-party dependency and the
landing page's "Works offline" claim.

### The fix (2026-09-30)

Route 3, pointed at the right artifact.

- **`scripts/build-cubing.mjs`** (runs on `predev` and `prebuild`) runs esbuild over the
  installed `cubing/dist/lib` with `three` and cubing's self-references bundled in, splitting
  on, output to `public/cubing/<version>/` (gitignored, about 1.8 MB, 34 files, under 200 ms,
  byte-identical on rebuild). That is the same kind of artifact `cdn.cubing.net` serves:
  ESM split into chunks, with only relative imports. We build it locally rather than
  mirroring the CDN because the CDN serves only the latest release (0.63.8 at the time),
  with no version pinning, while our types come from the installed 0.56.0.
  `chunks/search-worker-entry.js` keeps its exact name and directory, so cubing's own
  `new URL("./search-worker-entry.js", import.meta.url)` resolves without any bundler's help.
- **`src/lib/cubing/runtime.ts`** is the only way in: `loadTwisty`, `loadScramble`,
  `loadAlg`, `loadPuzzles`, each a memoised `import(/* webpackIgnore: true */ url)`. Types
  still come from `node_modules` through `typeof import("cubing/…")`. **ESLint rejects any
  value import from `cubing/*`, static or dynamic, in `src/`.**
- **`next.config.ts`** carries only `NEXT_PUBLIC_CUBING_VERSION`, which is read from the
  installed package. The version is in the URL, so an upgrade can never mix cached files.
- **`scripts/check-chunks.mjs`** (`npm run check:chunks -- <url>`) is the guard, and runs in
  CI after the build. It crawls `/`, `/timer`, `/learn` and requests every chunk the app can
  load lazily: Turbopack's literal chunk paths, any webpack runtime's `id→hash` map
  (including a runtime embedded in a chunk, which is where the old cubing worker chunk kept
  its own), and the whole `/cubing/<version>/` module graph including the worker entry. Any
  missing file, or JS served with a non-JS MIME type, fails it. It was checked against
  deliberately broken builds: a missing cubing worker, a missing Turbopack chunk, and a
  webpack build with a chunk emitted under a name its runtime does not request. It caught
  all three.
- **Playwright runs against `next start` in CI** (and locally via `npm run test:e2e:prod`),
  not `next dev`. `tests/e2e/cubing-runtime.spec.ts` loads the landing page and `/timer`
  in a real browser and waits for a drawn 3D canvas, a mounted preview, and a scramble
  generated by cubing's worker. Hiding the worker file makes it fail, as it should.

Verified in a browser, on both the production build and `next dev`: the landing hero, the 3D
showcase cube, the timer's scramble and preview, and the tutorial cube players all render,
with no page errors and no failed requests.

**Still true:** loading the page in a browser is the only proof that a module graph runs.
For changes that touch cubing.js, workers or dynamic imports, run `npm run test:e2e:prod`,
not only `npm run dev`. Now that both use one bundler this is less critical, but it is still
the check that counts.

Upstream reports (Turbopack not honouring `new URL(…, import.meta.url)` workers inside a
dependency) are still worth filing, but nothing here waits on them any more.

## Open questions

1. **Domain** — `cubehub.in` or `cubehub.io`? *Decided after the beta.*
2. **Tutorial authorship** — solo, or community contributions? *The schema has effectively answered this: `algorithms.submitted_by` + `is_approved` exist, i.e. moderated contributions.*
3. **Algorithm sourcing** — SpeedSolving Wiki (check the licence) or an own curated set?
4. ~~**csTimer import format**~~ — *resolved in Phase 2: import works and was checked against a real export.*
5. **WCA API terms** for pulling competitor profiles.
6. **Cubelelo outreach timing** — best after a Phase 1/2 beta, with real traffic numbers.
7. **Mobile** — PWA recommended over app stores.
8. **Bot solve times** — real distributions are more authentic than synthetic ones.
9. **Indian state list** — ISO 3166-2:IN or curated? *Blocked anyway: no `state` column exists.*
10. **Username policy** — allow WCA competitor names, or enforce independent uniqueness? *Live constraint is 3–24 chars, `^[A-Za-z0-9_]+$`.*
