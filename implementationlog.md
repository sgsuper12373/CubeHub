# Implementation Log

A running record of code changes made to the repository, one entry per change request.
Newest entries at the top.

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
