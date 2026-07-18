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

Everything under `/timer`, `/learn`, `/compete`, `/shop`, `/settings` and `/` is still a **stub page**.

## Next: Phase 1 — Core timer

The timer is the heart of the product and the highest-value thing to build now that auth exists.

- Millisecond timer using `performance.now()`, not `Date.now()`
- Spacebar (desktop) and tap-hold-release (mobile), matching csTimer muscle memory
- WCA-compliant random-state scrambles, 3x3 and 2x2 first
- Inspection: 8s / 15s / off, with voice callouts
- Penalties: +2 and DNF, auto-applied when inspection is exceeded
- Named sessions per puzzle type
- Shortcuts: `Space` start/stop, `D` delete last, `1` +2, `2` DNF
- localStorage for logged-out users, with a "sign in to save" prompt
- Cloud sync to Supabase once signed in

Note `solves.effective_time_ms` is a generated column that already applies +2/DNF. Never compute penalties in application code.

*Deliverable: a fully usable timer, ready to share with the cubing community for beta feedback.*

## Phase 2 — Analytics

Ao5 / Ao12 / Ao50 / Ao100, session mean, best single; all-time PBs; trend chart with Ao5/Ao12 overlay; time-distribution histogram; practice heatmap; consistency score (standard deviation over the last 50 solves). Recharts.

Data portability: CSV and JSON export, plus **csTimer JSON import** — critical for user migration. `solves.source` already accepts `'import'`.

Requires a migration: `maintain_single_pb()` only writes the `single` category today. See `database.md` → Known gaps.

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

Blocked on a migration: `profiles` has no `state` column, so state-level leaderboards can't be built yet. And the ELO start value is unresolved — see `decisions.md`.

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

- **Migrations baseline** — no migrations are checked in. Needed before the access-tier work, which changes policies that decide who reads paid content.
- **Username onboarding** — the trigger assigns `user_<12 hex>`; users can't pick one.
- **Deploy** — no Vercel project or CI/CD. Supabase Site URL is still `http://localhost:3000` and must be updated at deploy.
- **`?next=` after login** — `/settings` redirects to `/login` but doesn't return you afterwards.
- **GitHub OAuth** — planned, not built.
- **`cubing.js` render test** — never done; it's a Phase 0 leftover that Phase 3 depends on.
- **No test tooling.** `docs/architecture.md` carries a manual auth smoke checklist in the meantime.

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
