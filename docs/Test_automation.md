# Testing

How CubeHub is tested, locally and in CI. Updated 2026-10-13.

## Commands

| Command | What it does |
|---|---|
| `npm run validate` | `tsc --noEmit`, eslint, then every Vitest unit test. Run before committing. |
| `npm run check:colors` | Fails on new hardcoded colours in added `.ts`/`.tsx` lines (see `design-tokens.md`). Diffs against `origin/main` by default. |
| `npm test` / `npm run test:watch` | Vitest unit and DOM tests (`tests/unit/`, jsdom + Testing Library). |
| `npm run test:e2e` | Playwright against `next dev` on port 3000. |
| `npm run test:e2e:prod` | `npm run build`, then Playwright against `next start` on port 3100. This is what CI runs, and the one to trust: cubing.js, workers and lazy chunks behave differently in dev. |
| `npm run check:chunks -- <url> [pages…]` | Requests every lazy chunk and cubing.js module a built site can load, and fails on any that is missing. Run it after a deploy too. |

`npx playwright test --ui` steps through a test; `npx playwright show-report` opens the last report.

## What's covered

- **Unit (`tests/unit/`, 32 files):** timer formatting, stats and PB detection, csTimer and backup import, scrambles, drill logic, case diagrams and the drill's inverse-algorithm setups for every seeded case, OLL categories (checked on a cube model), case URLs and titles, the sitemap builder, themes and contrast, the colour guard, profile validation, levels and achievements, the playground.
- **End to end (`tests/e2e/`):** auth pages, the landing hero, the timer, cubing.js loading, the Drill Lab, the playground, profiles (signed out), case pages, the sitemap and robots.txt, 404s, and analytics staying off outside Vercel.
- **Database (`supabase/tests/*.sql`):** RLS and trigger tests, run by hand in the SQL editor after the matching migration. Every row should say PASS. `implementationlog.md` (2026-09-30, Drill Lab) has the recipe for running them on a throwaway Postgres in podman.

**Not covered:** signed-in flows (profile editing, photo upload, Mark Learned, typed solves in the cloud). They're checked by hand until there's a test account; see `todo.md`, "Next session".

## Data-dependent tests

The drill and case-page tests need the live Learn data. They read it with the public anon key, exactly as a signed-out browser does.

- Locally they use `.env.local`. Without it they **skip** with a reason.
- In CI the key comes from the `NEXT_PUBLIC_SUPABASE_ANON_KEY` repo secret, and `E2E_REQUIRE_DATA=1` makes missing data **fail** instead of skip.
- The service-role key is never given to tests or CI.

## CI (`.github/workflows/ci.yml`)

On every push to `main` and every pull request:

1. **validate:** typecheck and lint, the colour guard (against the pushed commits or the PR base), unit tests.
2. **e2e-smoke:** production build, chunk guard on `next start`, then Playwright against the production build. On failure the HTML report is uploaded as an artifact.

`VERCEL` is unset in CI, so Vercel Analytics and Speed Insights are not rendered there.
