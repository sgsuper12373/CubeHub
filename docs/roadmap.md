# Roadmap

## What CubeHub is

A single destination for speedcubers — timer, tutorials, competition, and buying advice — replacing the need to juggle csTimer, jperm.net, forums, and shopping sites. India-first: INR pricing, Indian sellers, regional leaderboards. Dark-mode-first, minimal, fast.

Design principles: the timer loads in under a second and works before anything else on the page; a new user can start timing within five seconds of landing; mobile-ready (many cubers practice with a phone on the desk); accessible by default.

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

`/learn`, `/compete` and `/shop` remain **stub pages**.

Note `solves.effective_time_ms` is a generated column that already applies +2/DNF. Never compute penalties in application code.

*Deliverable met: a usable timer plus a front door, ready to share with the cubing community for beta feedback.*

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

**Still open:** the JSON export cannot be re-imported. Import accepts csTimer only, so
CubeHub's own versioned envelope is currently a backup with no restore path. `toSolves()`
in `import-cstimer.ts` is the piece to reuse.

## Phase 3 — Learn

Four-level content model: puzzle → method → section → case → algorithm(s). 3D case viewer with cubing.js, play/pause, speed control, mirror toggle. Multiple algorithms per case with move counts and community ratings. Drill mode with weakest-cases-first ordering. Per-section progress.

Launch content: 3x3 beginner LBL, CFOP intro, all 57 OLL, all 21 PLL; 2x2 beginner and Ortega.

**This phase applies the access-control migration** — `access_tier`, `algorithm_subsets`, `can_access()`, and the tiered policies. Read `access-control.md` first; the paid-content boundary is set here and is expensive to move later. Spaced repetition also needs new columns (see Known gaps).

*Deliverable: shareable tutorials — the main organic-traffic and sign-up driver.*

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

- **Deploy** — live on Vercel as of 2026-07-25. Since 2026-09-30 `npm run build` is plain `next build` (Turbopack), with `prebuild` generating `public/cubing/`; confirm the Vercel project uses `npm run build` and has no build-command override pinning `--webpack`. Two things to verify against the deployed origin: the Supabase **Site URL** and redirect allow-list (they were `http://localhost:3000`, and auth confirmation links break if they still are), and `NEXT_PUBLIC_SITE_URL` in the Vercel environment — it feeds `metadataBase`, so Open Graph URLs resolve against localhost without it. No CI/CD beyond Vercel's own git integration.
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

1. **Domain** — `cubehub.in` or `cubehub.io`?
2. **Tutorial authorship** — solo, or community contributions? *The schema has effectively answered this: `algorithms.submitted_by` + `is_approved` exist, i.e. moderated contributions.*
3. **Algorithm sourcing** — SpeedSolving Wiki (check the licence) or an own curated set?
4. **csTimer import format** — needs reverse-engineering.
5. **WCA API terms** for pulling competitor profiles.
6. **Cubelelo outreach timing** — best after a Phase 1/2 beta, with real traffic numbers.
7. **Mobile** — PWA recommended over app stores.
8. **Bot solve times** — real distributions are more authentic than synthetic ones.
9. **Indian state list** — ISO 3166-2:IN or curated? *Blocked anyway: no `state` column exists.*
10. **Username policy** — allow WCA competitor names, or enforce independent uniqueness? *Live constraint is 3–24 chars, `^[A-Za-z0-9_]+$`.*
