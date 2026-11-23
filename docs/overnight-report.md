# Overnight report: 2026-11-24

Unattended run over `docs/landing-plan.md`, `docs/app-shell-plan.md` and `docs/home-plan.md`.
Everything asked for was done; nothing was skipped or reverted. Nothing was merged, deployed or
applied to the database, and no Vercel, DNS, Supabase or Google settings were touched. Your
uncommitted drill work on `auto-run-1110` was left alone: all of this was built in a separate git
worktree.

## Branches

| Branch | Base | Steps | Pushed |
| --- | --- | --- | --- |
| `feat/cuberhub-rename` | `main` | Landing plan step 1 | yes |
| `feat/app-shell` | `main` | App shell plan steps 1–8 | yes |
| `feat/home` | `feat/app-shell` | Home plan steps 1–4 | yes |
| `feat/landing` | `feat/cuberhub-rename` | Landing plan steps 2–9 (waitlist: migration and action only) | yes |

Each branch starts with one docs commit that adds the four spec files (they were untracked), then
one commit per spec step, named after the step. Every step has an entry in `implementationlog.md`,
and every judgement call is in `docs/decisions.md` on its branch (sections **Brand**, **Hosts and
app shell**, **Home**, **Landing**).

**Merging:** `feat/app-shell` + `feat/landing` and `feat/home` + `feat/landing` both merge with
conflicts only in `docs/decisions.md` and `implementationlog.md` (both branches add entries near the
top: keep both). The merged tree has no visible "CubeHub" left in `src/`.

## What's done, per step

### `feat/cuberhub-rename`

| Step | Result |
| --- | --- |
| Landing 1: rename | Every visible CubeHub → CuberHub (≈50 files): titles, metadata, aria-labels, UI copy, share text, the wordmark (`cuber`**`hub`**). OG card re-rendered (`scripts/render-og-card.mjs`). A unit test fails on any visible "CubeHub" in `src/`. Storage keys, cookies and identifiers unchanged. Navbar lockup checked at 360, 768 and 1280 px. |

### `feat/app-shell`

| Step | Result |
| --- | --- |
| 1 Host helpers | `APP_URL`, `HOST_SPLIT`, `appUrl()`; pure `routeForHost()` with tests for the whole path table; wired into `proxy.ts` before the session refresh. No-op while `NEXT_PUBLIC_APP_URL` is unset. |
| 2 Robots and sitemaps | `/app-robots.txt`, `/app-sitemap.xml` (Learn + public profiles); root sitemap is marketing-only when split; app pages' canonicals use `APP_URL`. |
| 3 Cookies | Supabase clients and the theme cookie use `.cuberhub.me` when split; signed-in `/login` → `/home` (a placeholder redirecting to `/timer` on this branch). |
| 4 Handoff | `/handoff` + `/handoff/receive`, the routing rule until 2027-03-01, localStorage keys and the background image copied without overwriting. Unit-tested; no two-origin e2e (see below). |
| 5 Sidebar | Expanded / Rail / Hidden per page group in the `cubehub-sidebar` cookie, hover-to-peek, Learn sub-items from the database, account menu, Ctrl/⌘+B and Ctrl/⌘+\. New `dropdown-menu`, `sheet`, `tooltip` primitives. |
| 6 Swap the shell | Sidebar replaces the navbar in `(app)`; full-height pages fixed. |
| 7 Timer modes | Zen removed; Focus renamed "Hide UI while solving", on by default, hides the sidebar. |
| 8 Phones | Bottom bar Home, Timer, Learn, Drill, More (sheet with the rest). |

### `feat/home`

| Step | Result |
| --- | --- |
| 1 Skeleton | `/home` for guests, new and regular members; greeting; quick start (last puzzle, due drills, series to continue; Enter, never Space); welcome card; sign-in now lands on `/home`. |
| 2 Cards | Your stats, Continue learning, Drill queue, Streak and daily goal. |
| 3 Cards | Friends activity, Your clubs, What's new (`src/content/changelog.json`), Cubby's tip (static). |
| 4 Customize | Sheet with show/hide and reset; guests in localStorage, members in `user_settings.home_layout` (**migration not applied**); guest layout copied up on first signed-in visit. |

### `feat/landing`

| Step | Result |
| --- | --- |
| 2 Motion pieces | `RevealText`, `FadeUp` (CSS, like the page's existing `.reveal`), `CountUp`, `FloatingField`, `PinnedChapter` (`motion/react`), reduced-motion tests. |
| 3 Header and hero | One responsive header (transparent → solid, menu sheet on phones); full-screen hero, headline as the h1. |
| 4 Try a solve | The timer card in its own section, with the "Keep going" nudge after a solve. |
| 5 Feature chapters | Five pinned chapters with scroll-driven visuals; the Playground one is a live cube loaded on scroll. |
| 6 Make it yours | Full-screen, the plan's copy, theme-coloured mark, three tiles. |
| 7 Community, roadmap, FAQ | Built-in-India section, Now/Next/Later board (`src/content/roadmap.ts`), FAQ with `FAQPage` JSON-LD. Waitlist **migration and server action only** (not applied, no form). |
| 8 Final CTA and footer | Full-screen closing band; four-column footer. |
| 9 Feature pages | `/features/{timer,drill-lab,learn,playground}`, `/roadmap`, `/about`, and noindex drafts of `/privacy` and `/terms`; home page metadata and JSON-LD; sitemap updated. `/` is still `○` (static). |

## Checks

`npm run validate` and `npm run check:colors` passed after every step on every branch (the one
lint warning, `_alg` unused, is on `main` already). `npm run test:e2e:prod` at the end of each batch:

| Branch | Result | Failures, and why |
| --- | --- | --- |
| `main` (baseline, before any change) | 80 / 81 | `playground-swipe` projection: flaky on `main` already. |
| `feat/cuberhub-rename` | 77 / 81 | Only `playground-swipe` projection cases (the same flaky test). |
| `feat/app-shell` | 82 / 86, then the two real ones pass alone | `playground-swipe` (flaky); `clubs` posts (see below); `profile.spec` "nav's Profile tab" was a real change in behaviour (Profile left the tabs) and the test was updated. |
| `feat/home` | 88 / 90 | `clubs` posts only (see below). |
| `feat/landing` | 86 / 90 on the first full run; a later full run hit `net::ERR_NETWORK_IO_SUSPENDED` (the machine's network sleeping), and every spec that broke passed when re-run alone | `clubs` posts (see below), `playground-swipe` (flaky). The batch run also caught a real regression, fixed in step 9: the landing page had lost its deferred live cube, which `cubing-runtime.spec.ts` guards. |

**The `clubs` posts test fails because of the database, not the code:** after this many runs in one
day, the e2e account hit the live posting limit ("You've posted 10 times today"). It passed
earlier in the night and will pass again tomorrow.

## Decisions I made (details in each branch's `docs/decisions.md`)

- **Specs vs code, code won:** backups have no brand field, so there was nothing to rename in the
  export format; Home reads solves the way `/stats` does (client repository) rather than through
  server components; text reveals are CSS like the existing `.reveal`, not `motion`; `navbar.tsx`
  stays because the landing header used it (on `feat/app-shell`).
- **Open questions, suggested answers taken:** daily scramble not built (out of scope); Discord link
  left out until a server exists. With no suggested answer: hero headline "Every part of cubing.
  One hub."; the Contribute strip renders its link only once `CONTRIBUTE_URL` is set.
- **Routing:** unknown paths on the root host go to the app host (the plan's two rules contradict;
  the single `ROOT_PATHS` list wins). Third hosts (`*.vercel.app`) pass. Empty
  `NEXT_PUBLIC_APP_URL` counts as unset.
- **Sidebar:** widths in CSS so the server's first paint is right; the cookie stores only explicit
  choices; shortcuts lock while the timer is holding, inspecting or running (not while it shows a
  result); Learn sub-items are cached for an hour.
- **Home:** layouts are `{hidden, shown}` (so off-by-default cards can be switched on); "Continue
  learning" picks the series with the most cases learned; no unread counts on clubs (no read
  state exists); daily goal and dismissals are per device; no case diagram (it needs cubing.js).
- **Landing:** feature visuals are animated scenes, not recorded videos; product links go through
  `appHref()` (identity for now) and "Open app" points at `/timer` until Home merges; waitlist uses
  lower-cased `text unique` rather than `citext`.
- **Tooling:** the shadcn CLI tried to add an npm package called `cn`; I reverted it and kept the
  project's own `cn`. It also generated `bg-black/10`, which the colour guard caught; replaced with
  the project's `bg-background/70` backdrop.

## What you need to do by hand

1. **Vercel:** set `NEXT_PUBLIC_SITE_URL=https://cuberhub.me` in production (landing step 1; until
   then `og:url` and the sitemap point at the preview domain).
2. **Supabase email templates:** change CubeHub → CuberHub in confirm, reset and magic-link (dashboard).
3. **Migrations, before shipping the branch that needs them** (dashboard SQL editor or `supabase db push`):
   - `feat/home`: `supabase/migrations/20261124000000_home_layout.sql`. Until it's applied, Home
     works with the default layout and members' Customize changes show "Couldn't save".
   - `feat/landing`: `supabase/migrations/20261124000100_waitlist.sql`, then run
     `supabase/tests/waitlist_test.sql` (every notice should say PASS), then add the "Notify me" form
     that calls `joinWaitlist()` (`src/lib/waitlist/actions.ts`).
4. **Content:** real Instagram/YouTube URLs (and follower counts, if wanted) and the Contribute link
   in `src/content/community.ts`; confirm the Contribute wording; have `/privacy` and `/terms`
   reviewed, then drop their `noindex` and add them to the sitemap.
5. **App shell go-live (step 9, not done, as asked):** add `app.cuberhub.me` in Vercel and DNS, set
   `NEXT_PUBLIC_APP_URL`, update Supabase Site URL and redirect list and Google OAuth origins. Before
   that, test the guest handoff on a preview that has both real custom domains: `localhost` and
   `app.localhost` are different *sites* to browsers, so the handoff iframe's storage is partitioned
   locally and can't be tested there.
6. **After merging `feat/app-shell` and `feat/landing`:** make `appHref()` in
   `src/lib/marketing/links.ts` call `appUrl()`, point `OPEN_APP_HREF` at `/home`, and add the
   landing pages to `MARKETING` in `src/lib/seo/sitemap.ts` (the app shell's per-host sitemap).
   `ROOT_PATHS` already lists `/features/**`, `/roadmap`, `/about`, `/privacy` and `/terms`.
7. **Press assets:** `public/brand/cubehub-lockup-*` still show the old wordmark (not used by the app).

## How to test each branch locally

All four branches are in your local repo. Your main checkout has uncommitted drill work on
`auto-run-1110`, so the simplest way is a separate worktree per branch:

```bash
cd ~/Documents/CubeHub/cubehub
git worktree add ../cuberhub-review feat/landing     # or feat/cuberhub-rename, feat/app-shell, feat/home
cd ../cuberhub-review
cp ../cubehub/.env.local .
npm ci
npm run dev                                           # http://localhost:3000
npm run validate && npm run check:colors && npm run test:e2e:prod
```

Switch branch inside it with `git checkout <branch>`; remove it with
`git worktree remove ../cuberhub-review`. (The worktree this run used is in a temporary scratch
folder and can be removed with `git worktree prune` once it's gone.)

What to look at:

- **`feat/cuberhub-rename`:** the wordmark in the navbar at phone width; page titles; the OG image
  at `/opengraph-image.png`.
- **`feat/app-shell`:** the sidebar on `/timer` (Rail) and `/stats` (Expanded from 1024 px);
  Ctrl/⌘+B, Ctrl/⌘+\; hover the left edge when hidden; Learn's flyout in Rail; Modes on the timer
  (no Zen; start a solve and the sidebar hides); phone width for the More sheet. Split hosts:
  `NEXT_PUBLIC_SITE_URL=http://localhost:3000 NEXT_PUBLIC_APP_URL=http://app.localhost:3000 npm run dev`,
  then `localhost:3000/timer` should hand off to `app.localhost:3000/timer`, and
  `app.localhost:3000/` should go to `/home` (sign-in isn't shared across them on localhost).
- **`feat/home`:** `/home` signed out (welcome card), with a few local solves (stats and streak),
  signed in; Customize (guests persist; members need the migration); Enter starts the timer.
- **`feat/landing`:** `/` top to bottom on desktop (chapters pin while scrolling) and phone; "Try a
  solve here"; the theme picker in "Make it yours"; `/features/timer`, `/roadmap`, `/about`; with
  reduced motion turned on in your OS, nothing should move.
