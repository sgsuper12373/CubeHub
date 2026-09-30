# Implementation Log

A running record of code changes made to the repository, one entry per change request.
Newest entries at the top.

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
