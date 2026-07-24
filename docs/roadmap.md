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

**Complete, verified and merged to `main`.**

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
- **Deploy** — live on Vercel as of 2026-07-25, building with `next build` (Turbopack). Two things to verify against the deployed origin: the Supabase **Site URL** and redirect allow-list (they were `http://localhost:3000`, and auth confirmation links break if they still are), and `NEXT_PUBLIC_SITE_URL` in the Vercel environment — it feeds `metadataBase`, so Open Graph URLs resolve against localhost without it. No CI/CD beyond Vercel's own git integration.
- **`?next=` after login** — `/settings` redirects to `/login` but doesn't return you afterwards.
- **GitHub OAuth** — planned, not built.
- **`cubing.js` render test** — never done; it's a Phase 0 leftover that Phase 3 depends on.
- **No test tooling.** `docs/architecture.md` carries a manual auth smoke checklist in the meantime.

## Resolved: one bundler for dev and production

**Done 2026-07-25 by taking cubing.js out of the bundle** (Route 3). `next dev` and
`npm run build` both run Turbopack again, and `next.config.ts` carries no bundler
workarounds.

### What was wrong

`next dev` ran Turbopack while `npm run build` was pinned to `--webpack`, because the
Turbopack build hung. So **the code that shipped had never run in development**, and bugs
living in only one bundler stayed invisible until someone loaded the deployed site. That
cost two production bugs — the build hang itself, and a chunk id/name mismatch that 404'd
`cubing/twisty` and left the landing hero and scramble preview spinning forever on the live
site for weeks.

An attempt to fix it by upgrading cubing (0.63.3) was **rejected** — see the note below; it
fixed the build and broke scramble generation.

### What fixed it

cubing's built ESM is copied into `public/cubing/<version>/` by `scripts/copy-cubing.mjs`
(wired to `predev` and `prebuild`) and imported at runtime through
`src/lib/cubing/runtime.ts`. No bundler resolves it at all.

The insight is that neither bundler was really failing to *bundle code* — both were failing
to **locate a worker file**. Cubing's last-resort strategy is
`new URL("./search-worker-entry.js", import.meta.url)`. Served as real files with their
directory structure intact, that resolves against `/cubing/<version>/chunks/`, where the file
actually is, with nobody's help.

Verified: the Turbopack build completes in ~8s; all 126 relative imports inside the served
tree resolve with 0 dangling, including the four worker siblings webpack used to drop; 0 of
25 app assets missing; and the bundle contains no cubing internals at all (`twsearch`,
`KPuzzle`, `Comlink`, `puzzle-geometry` — zero hits).

Costs, accepted deliberately: ~2 MB of static files in `public/` (gitignored, regenerated at
build), and cubing is no longer code-split by the bundler — the loader keeps it lazy by hand,
which it already was. In exchange the app is immune to whatever cubing changes next, which on
a 0.x line is worth more than the code splitting.

### Rejected: upgrading cubing (2026-07-25)

`cubing@0.63.3` was tried on branch `try-cubing-upgrade` and abandoned. It fixes the
Turbopack *build* (~9s, no warnings, no source changes) but Turbopack's **output** cannot
instantiate cubing's search worker — scrambles die with `Module worker instantiation failed.
There are no more fallbacks available.` The webpack chunk-name mismatch also survives in
0.63.3. So it bought a working build whose output was broken. The branch is kept as the
record; do not retry it expecting a different result.

An upgrade is now low-risk and orthogonal — cubing is a served asset, not a bundled
dependency — but it should still be driven by wanting newer cubing, not by build problems.

### The lesson worth keeping

A build workaround that splits dev from production does not cost you one bug — it costs you
the ability to *see* bugs. The `--webpack` pin looked free for weeks while a completely
broken 3D cube sat on the live site.

Guard that would have caught it in seconds, still worth scripting: fetch the built page and
its chunks, extract every `/_next/static/**` reference, and request each one. Any 404 is a
dynamic import that will hang forever. Works against a local server or a deployed URL.

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
