# Decisions

Choices already made and why. Append as new ones land; don't silently reverse an entry — replace it and say what changed.

## Access & routing

**Route groups for chrome, RLS for access.** These are separate concerns and use separate mechanisms. Access is a property of the data row, not the URL — `/learn/3x3/beginner` (public) and `/learn/3x3/coll` (premium) are the same dynamic route, so no folder arrangement can gate them. Full reasoning in `access-control.md`.

**`proxy.ts` refreshes the session and does not gate routes.** Gating lives in layouts (for whole pages) and RLS (for data). One place per concern; two places that both gate would drift.

**`/timer`, `/learn`, `/compete` and `/shop` are public routes.** The timer is specified to work logged-out with a localStorage fallback, tutorials drive organic traffic, and bot mode is meant to work without an account. Only `/settings` requires sign-in today.

**Premium content is visible but locked, not hidden.** Non-entitled users see the course/subset card and, for algorithms, the case and its 3D cube — they just can't read the payload. Hidden content converts nobody and isn't indexable. Cost: metadata and body need separate policies.

**`algorithm_subsets` as a real table, not an `access_tier` column on `algorithm_cases`.** `subset` is unconstrained text today, so `"COLL"`, `"coll"` and `"Coll"` are three different subsets. Tolerable for free content, unacceptable once a string decides who gets charged. The table also gives each subset a stable slug for URLs and a single row to price.

**`getUser()`, not `getSession()`.** `getUser()` revalidates the token with Supabase; `getSession()` trusts the cookie. Wrapped in React `cache()` so the extra round trip happens at most once per render pass.

## Stack

**Next.js 16, not the planned 15.** Brings breaking changes — `middleware.ts` is now `proxy.ts` — hence the standing `AGENTS.md` rule to read `node_modules/next/dist/docs/` before writing Next code.

**Tailwind v4.** No `tailwind.config` file; theme tokens live in `globals.css`. `components.json` carries `"config": ""` as a result.

**shadcn `base-nova` style on Base UI**, rather than stock shadcn on Radix. Consequence: primitives have Base UI's API, e.g. `Button` as a link needs `nativeButton={false}` with `render={<Link/>}`, and is still exposed as `role="button"`, so navigation uses `<Link className={buttonVariants(...)}>` instead (`architecture.md` → Next.js 16 gotchas).

**Supabase for everything** — Postgres, Auth, Realtime, Storage. One vendor, generous free tier, and Realtime removes the need for separate WebSocket infrastructure when the competitive tab is built.

## Auth

**Email/password and Google OAuth. GitHub deferred.** Two providers were enough to validate the flow; GitHub is additive whenever it's wanted.

**Email confirmation is ON.**

**Separate `/login` and `/signup` pages** rather than one combined form. Clearer intent, simpler validation, better for linking users straight to the right action.

**Usernames are auto-assigned by the signup trigger** as `user_<12 hex>`. A picker during onboarding is still pending — see `roadmap.md`.

## Data

**The live Supabase project is the authoritative schema.** Earlier design documents proposed a different, simpler schema that the live database has long since diverged from. Where they disagree, live wins. `database.md` documents live.

**Progress rows survive a lapsed subscription.** Downgrading revokes read access to content, not the user's history. Don't delete progress on expiry.

## Analytics

**No chart library.** The charts are hand-rolled inline SVG, extending what `sparkline.tsx` proved in Phase 1. Recharts would have been faster to a first chart but costs ~100 KB gzipped plus d3 sub-packages, needs wrapper work to obey a CSS-variable theme, and fights the token system on dark mode — against a roadmap principle that the timer loads in under a second. Cost paid instead: about 400 lines of reusable axis, crosshair, tooltip, legend and table primitives in `components/stats/chart/`.

**Rolling averages never span a session boundary.** A rolling Ao12 across two sittings is meaningless to a cuber, and per-session is what csTimer does — which is what these numbers get compared against. Both implementations (SQL `best_average_of_n`, TypeScript `bestAverageOfN`) partition by session.

**The WCA average is implemented twice, and held to agreeing.** The database needs it for PB triggers; the client needs it for the live session and the logged-out path. They are verified against each other over adversarial sequences rather than assumed equal — if they ever diverge, the page and the PB badge contradict each other and the user trusts neither.

**Chart colours are their own steps, not the UI accent reused.** The brand teal sits at OKLCH L 0.775, above the band a dark-mode chart mark may occupy, so `--chart-*` takes a deeper step from the same ramp. Both themes are validated on lightness, chroma, CVD separation, normal-vision floor and surface contrast — computed, not eyeballed.

**Personal bests ignore the filter bar.** A PB is all-time by definition; showing a "best of the last 30 days" under the same word would quietly redefine the number cubers care most about.

## Monitoring

**Vercel Web Analytics and Speed Insights, page views only.** Both are free on the Hobby plan, cookie-less, and two components in the root layout. No custom events: the Hobby plan doesn't include them. Error tracking (Sentry or similar) is still to come.

**They render only when `VERCEL=1`.** Off Vercel the scripts at `/_vercel/*` don't exist, so they would 404 in `next start` and in Playwright. The e2e tests check that no request fails, and test traffic would count as visits. The components have no "off" setting (`mode` is `auto`, `development` or `production`, and development fetches a debug script from `va.vercel-scripts.com`), so the layout doesn't render them at all off Vercel. `tests/e2e/analytics.spec.ts` checks that they stay off.

## Hosts and app shell

**Two hosts, one deployment** (app shell plan D1–D7, 2026-11-24). `cuberhub.me` serves marketing pages, `app.cuberhub.me` the product. `routeForHost()` in `src/lib/host-routing.ts` decides; `src/proxy.ts` acts on it before the session refresh. With `NEXT_PUBLIC_APP_URL` unset (previews, local dev, and production until go-live) it passes everything.

**Unknown paths on the root host go to the app host.** The plan says both "anything not on the root list belongs to the app host" and "unknown paths pass, so each host renders its own 404". Both can't hold without a list of app paths, which the plan rules out (a new app route must need no routing change). The single `ROOT_PATHS` list wins: an unknown path on `cuberhub.me` 308s to `app.cuberhub.me`, which renders the 404. On the app host, unknown paths pass.

**Requests to any third host pass.** A `*.vercel.app` deployment URL keeps serving every page, so a production deployment can still be checked by its own URL.

**`NEXT_PUBLIC_APP_URL=""` counts as unset** (`||`, not `??`), so an empty Vercel variable can't split the hosts by accident.

**The app host's sitemap lists public profiles, minus placeholder handles.** The plan adds public profiles (before, no profile was in any sitemap). Profiles still on the signup trigger's `user_<12 hex>` handle are skipped: nobody has set them up, so there's nothing to index. Private profiles are never listed (`is_public = true` only).

**The app host's robots.txt also allows `/_next/`, `/cubing/` and `/images/`.** The plan says allow `/learn/` and `/profile/` and disallow the rest; without these three, Google can't fetch the scripts, styles and images those pages need to render.

**App pages take the app origin as `metadataBase`.** `(app)/layout.tsx` and `(auth)/layout.tsx` export `metadataBase: new URL(APP_URL)`, so relative canonicals and `og:url` (the case pages use them) resolve to `app.cuberhub.me`. That was the whole canonical audit: no other code builds absolute URLs from `SITE_URL`.

**`COOKIE_DOMAIN` is undefined on localhost.** Browsers refuse `domain=.localhost`, so a local split-host setup (`localhost` + `app.localhost`) can test redirects but not a shared sign-in; that check needs the real domains (or a preview with custom domains).

**`/home` exists on `feat/app-shell` as a placeholder that redirects to `/timer`.** Step 3 sends signed-in visitors of `/login` to `/home`, step 1 sends the app host's `/` there, and the sidebar logo links there, but the Home page is `feat/home`'s job. The placeholder keeps every link working if the shell merges first; `feat/home` replaces it.

**Handoff details** (app shell step 4). `HANDOFF_UNTIL` is 2027-03-01 IST, as suggested. Only GET/HEAD are handed off (a form post to an app path on the root host gets the plain 308). The sender reads the destination from the address bar (a rewrite keeps the original URL) and falls back to `?next=`; both pass `safeNextPath()`, which only allows same-origin paths. The receiver answers only messages from `SITE_URL` sent by its parent frame. On timeout the visitor goes on without the cookie, so the next visit retries. It relies on the two hosts being the same *site*, so the iframe's storage isn't partitioned.

**No two-origin e2e test yet.** `localhost` and `app.localhost` are different sites to the browser (no public-suffix entry), so the receiver iframe would get partitioned storage locally and a local test would fail for a reason production doesn't have. The logic is unit-tested (`handoff.test.ts`, the handoff block in `host-routing.test.ts`); the real check is manual, on a preview with both custom domains, before go-live (listed in the overnight report).

**Sidebar implementation choices** (app shell step 5).
- *Widths are CSS, not `motion`.* The browse default ("Rail between md and lg, Expanded from lg") depends on the width, which the server doesn't know; keyed CSS on `data-sidebar-state` gets the first paint right with no flash, and a 200 ms `transition-[width]` (off under `prefers-reduced-motion`) does what the plan asked of `motion`.
- *The cookie stores only explicit choices.* A group with no entry uses its default, so a user who never touched the sidebar keeps the width-dependent default. The value is URI-encoded JSON; the plan's plain JSON form is also read.
- *Shortcuts lock while the timer is holding, ready, inspecting or running,* not while it shows a stopped result: "while the timer is not idle" read literally would block Ctrl+B between solves. The timer sets the lock in the sidebar store; the sidebar never reads the timer store.
- *Learn's sub-items come from a cached, cookie-free read* (`getLearnNav()`, `unstable_cache`, 1 hour) so the app layout doesn't add a database round trip to every page. Next 16 recommends `"use cache"` instead, but that needs Cache Components switched on project-wide, which is a bigger change than this step.
- *The shadcn CLI added an npm package called `cn`* and pointed the new primitives' imports at it. Reverted: the primitives import `cn` from `@/lib/utils` like the rest of `components/ui`, and `package.json` is unchanged.

**`navbar.tsx` stays.** The plan says delete it once nothing imports it; the marketing header (`components/marketing/marketing-header.tsx`) still renders it on the landing page, so it remains, used by `(marketing)` only.

## Product

**Bots before live matchmaking.** Bot opponents work with zero other users online, which solves the cold-start problem; real-time matchmaking is worth nothing until there's a population to match against.

**ELO starts at 1000** (decided 2026-07-25). The live database already defaults both `elo_ratings.rating` and `peak_rating` to **1000**, so the database is authoritative and no migration is needed. The earlier planning documents said 800; they were wrong and have been corrected.

*Consequence, still to settle when the competitive tab is built:* the planned tier bands (Scrambled <900, Beginner 900–1100, Intermediate 1100–1300, …) were drawn around a start of 800, so a new user now opens mid-**Beginner** rather than at the bottom of the ladder. Either shift the bands up so 1000 is the floor of the entry tier, or accept that "Scrambled" is a demotion tier you fall into rather than start in. Cosmetic — it changes labels, not ratings.

## Open

Nothing blocking. Product-level unknowns (domain, algorithm sourcing, csTimer import format) live in `roadmap.md` → Open questions.
