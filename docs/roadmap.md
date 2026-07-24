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

**Complete and verified** (branch `phase2-analytics`, not yet merged).

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

- **Username onboarding** — the trigger assigns `user_<12 hex>`; users can't pick one.
- **Deploy** — live on Vercel as of 2026-07-25, building with `next build --webpack`. Two things to verify against the deployed origin: the Supabase **Site URL** and redirect allow-list (they were `http://localhost:3000`, and auth confirmation links break if they still are), and `NEXT_PUBLIC_SITE_URL` in the Vercel environment — it feeds `metadataBase`, so Open Graph URLs resolve against localhost without it. No CI/CD beyond Vercel's own git integration.
- **`?next=` after login** — `/settings` redirects to `/login` but doesn't return you afterwards.
- **GitHub OAuth** — planned, not built.
- **`cubing.js` render test** — never done; it's a Phase 0 leftover that Phase 3 depends on.
- **No test tooling.** `docs/architecture.md` carries a manual auth smoke checklist in the meantime.

## Planned: one bundler for dev and production

**Priority: do this before Phase 3.** Not a nice-to-have — it is the thing that made two
production bugs invisible, and Phase 3 adds the 3D case viewer, which leans on exactly the
dependency that breaks.

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

### The real fix

Get dev and production onto the same bundler. Re-ranked after the attempt above:

1. **Take cubing out of the bundle** — serve `cubing/dist` from `public/` and load it at
   runtime. Now the strongest option, because the failures in both bundlers are failures to
   *locate a worker file*, and this removes the bundler from that question entirely. Also
   immunises the app against whatever cubing does next, which on a 0.x line matters. Most
   plumbing; you would keep the loading lazy by hand.
2. **Report the worker instantiation failure upstream** — to Next (Turbopack not honouring
   `new URL(…, import.meta.url)` for workers inside a dependency) and/or to cubing. A minimal
   repro is a bare Next app plus one `randomScrambleForEvent` call. Cheap to file, uncertain
   timeline, and it would fix this properly for everyone.
3. **Wait.** Only defensible while the workarounds hold and nothing new depends on them. They
   are documented and verified, so this is survivable — but it is what let a broken 3D cube
   sit on the live site for weeks, so it is a choice, not a default.

### Definition of done

`next build` and `next dev` use the same bundler, both `next.config.ts` workarounds are gone,
and the landing hero plus the scramble preview render in a local production build.

### Until then

Never sign off a change involving cubing.js, workers, or dynamic imports on `npm run dev`
alone — check `npm run build && npx next start` too.

A cheap guard that would have caught the 3D bug in seconds, and is worth a script: fetch
`/_next/static/chunks/webpack-*.js`, extract its `id:"hash"` map, and request every entry.
Any 404 is a dynamic import that will hang forever. It works against a local server or a
deployed URL.

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
