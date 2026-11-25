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

## Brand

**The product is CuberHub; internal names keep `cubehub`** (2026-11-24, landing plan step 1). Visible text, metadata, the wordmark and the OG card say CuberHub. Storage keys, cookies, the IndexedDB name, the package name, database objects, file/component names and `.chm*` classes keep the old spelling, because renaming a storage key or cookie silently resets users' data. `tests/unit/brand-name.test.ts` fails on any whole-word "CubeHub" under `src/`.

**Backup files have no brand field, so nothing to rename there.** The landing plan asked for exports to write `source: "cuberhub"` and imports to accept both. The code detects a CuberHub backup by shape (`version`, `sessions`, `solves`); `source: "cubehub"` is only the in-memory parse result, never written to a file. Followed the code: the export format is unchanged and old backups import as before; only the visible label changed ("CuberHub backup").

**Press lockups re-set, not redrawn** (2026-11-25, next batch step 4). `scripts/render-lockups.mjs` keeps each old lockup's background and CH mark byte-for-byte and replaces only the outlined text: "cuber" + "hub" in Outfit Bold at −0.03 em (as the OG card), the tagline in Outfit Medium tracked out to the wordmark's width. "cuberhub" is a letter longer than "cubehub", so the wordmark is fitted between the old left edge (x 513.7) and a right margin mirroring the mark's (x 1155), which makes it about 9% smaller than before, and the text block is re-centred where the old one sat. Glyphs are outlined with fontTools (`scripts/outline-text.py`), which has no shaper, so there is no kerning; at these sizes the lower-case wordmark and wide-tracked caps don't need it. Rasterised in Chromium because the mark's CSS uses `oklch()` and `color-mix()`. New files are `cuberhub-lockup-*`; the `cubehub-lockup-*` files stay (the script reads them) until the founder deletes them. The marks keep their `cubehub-mark-*` names: they contain no wordmark.

## Landing

**Text reveals and fades are CSS, not `motion`** (landing plan step 2, 2026-11-24). The plan asks for the motion pieces "on the `motion` package". The codebase already moved the landing page off JS text animation on purpose (`section-heading.tsx`: the old GSAP headings painted blank; `globals.css` → "Landing reveal": "Text is never hidden before the animation can run"). Following that pattern, `RevealText` and `FadeUp` are pure CSS (load-time keyframes, scroll-driven `animation-timeline: view()` where supported): the hero text is in the HTML, readable with JS off, costs no client JS and can't delay the largest paint. `FloatingField` (pointer parallax), `CountUp` and `PinnedChapter` (`useScroll`) use `motion/react`.

**Hero headline: "Every part of cubing. One hub."** (open question 1; the plan gives three options and no pick, so the first, which carries the "hub" of the name). The other two are kept in a comment beside `HERO_HEADLINE` for A/B tests.

**Product links go through `appHref()`, which returns the path for now** (`src/lib/marketing/links.ts`). `feat/landing` branches from the rename, not the app shell, so `appUrl()` doesn't exist here; step 11 (not in this run) swaps one function. "Open app" points at `/timer` until Home merges (the plan says `/home`, which doesn't exist on this branch).

**The lockup's "draw-in" is a stroke draw on the wireframe plus fades,** not a letter-by-letter wordmark: the wordmark is one text node inside the shared `BrandLockup`, and splitting it for the landing page would fork the brand component. Headline, sub-line, buttons and trust row follow in sequence, all done by 1.45 s.

**Feature chapter visuals are animated SVG/HTML scenes, not recorded videos** (step 5). Recording five clips from the real app needs a person to judge them; the plan allows "or animated SVG". Each scene is driven by the chapter's scroll progress, follows the theme tokens, and costs no media download. The Playground chapter has the page's one live cube (cubing.js through `ScramblePreview`, loaded only when the chapter is near the viewport, as the old bento's showcase was; `cubing-runtime.spec.ts` guards it). The Learn chapter uses a 2D T-perm diagram instead of a second live cube. Real clips or live cubes can replace any scene later without touching the chapter text.

**Phones get the finished visual.** Below lg (and with reduced motion) `PinnedChapter` holds progress at 1, as the plan's "plain full-screen sections" implies; the server renders that state too.

**"Make it yours" tiles link to where each setting lives,** not all to Settings: the background and panel layout are on the timer's toolbar, the font size is in Settings (step 6). The section's theme picker already changed the whole page through `setTheme()`; the step adds a CH mark in the active theme's colours to the preview, while the hero keeps its classic palette.

**Waitlist: migration and server action only, no form** (step 7, per the overnight instructions). `supabase/migrations/20261124000100_waitlist.sql` (not applied) creates `public.waitlist` with RLS on, no policies and no table grants for anon/authenticated, and a security-definer `join_waitlist()` that only inserts and ignores duplicates. `src/lib/waitlist/actions.ts` validates, rate-limits per IP (5 per 10 minutes, in memory) and calls it. The roadmap section shows the board without the "Notify me" form: a form whose only outcome is an error would be worse than none. `email` is a lower-cased `text` with a unique constraint rather than `citext`: same uniqueness, no extension. `supabase/tests/waitlist_test.sql` checks it once applied.

**The "Notify me" form ships before its migration is applied** (2026-11-25, next batch step 1). The form is on the landing roadmap section (`source: landing-roadmap`) and `/roadmap` (`roadmap-page`), a client island over `joinWaitlistFromForm`. Until `20261124000100_waitlist.sql` is applied every real submit ends in "Couldn't sign you up just now", so **apply the migration before this branch reaches production.** The form uses `noValidate` so the server's check (`normaliseEmail`) is the only one and its message is the one shown; errors now carry a `reason` (`invalid`, `rate-limited`, `error`) so only a bad address marks the field invalid. The success line replaces the form. The e2e test drives only the invalid path, which is refused before the database is called, so test runs never add rows to the real list.

**`public_stats()` decides whether RealStats shows at all** (2026-11-25, next batch step 3). `supabase/migrations/20261125000000_public_stats.sql` (not applied) is a security-definer SQL function returning one row of three totals: solves not in Recently deleted, profiles, and "cases drilled" = (cuber, algorithm) pairs in `drill_state` with at least one rep (so ten cubers drilling the same T-perm count ten; a per-algorithm count would top out at the catalogue size). If the function is missing, errors or returns no usable row, the whole slot renders nothing, as asked, including the club count, which is still a plain anon read of `clubs` and only joins the totals when the function answered. Plain `count(*)` rather than a counter table: the landing page calls it at most hourly. New minimum: 1,000 cases drilled. `supabase/tests/public_stats_test.sql` passes 7/7 against a throwaway local `supabase/postgres` container with every migration applied (never the live project).

**Open questions 2 and 3 (Discord, Contribute link):** Discord is left out until a server exists (the suggested answer). The plan suggests no answer for the Contribute link (GitHub or a contact form), so the strip shows its text and renders a link only once `CONTRIBUTE_URL` is set in `src/content/community.ts`. Instagram and YouTube links likewise render only once their real URLs are filled in; none were invented. Open question 4 (email provider) doesn't block collecting addresses.

**FAQ answers were checked against the app, and one changed:** the plan's "3x3 and 2x2 today" is true for Learn but not the timer, which has eight events; the answer says both.

**The "Profiles and clubs" chapter's id is `profiles`**, so `#community` is the Built-in-India section.

**/privacy and /terms are factual drafts, noindex** (step 9). They describe what the code actually does (local storage for guests, Supabase for accounts, cookie-less Vercel analytics), but they're not reviewed legal text, so they're `robots: noindex` and out of the sitemap until the founder has them reviewed. The footer links to them so the site has no dead ends.

**The home page's SEO metadata and JSON-LD landed with step 9** (title "CuberHub: Speedcubing Timer, OLL/PLL Tutorials and Drills", a 147-character description, canonical `/`, `WebApplication` and `Organization`), next to the feature pages it supports. The Open Graph image was regenerated in step 1.

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

**`navbar.tsx` is gone.** It stayed while the old landing header used it; the new marketing header doesn't, so it and `user-menu.tsx` were deleted with nothing importing them (2026-11-25 cleanup). The large hero `BrandLockup` went too: unused since the hero dropped it; the press lockups in `public/brand/` cover print use.

**Phones: the slim top bar with the bell and avatar is part of the Home page** (`feat/home`), since `/home` is a placeholder on `feat/app-shell`. Until then, unread notifications show as a dot on the More tab and a count on Profile inside the More sheet (before, the dot sat on the Profile tab).

**Command palette v1** (2026-11-25, app shell step 11). Ctrl/⌘+K or the search button beside the sidebar logo (expanded or peeking; in Rail, the shortcut). It finds pages, Learn series (from the cached `getLearnNav()`), cases by number in a listed series ("OLL 33", "pll4") or by name/nickname (`algorithm_cases` name or description, published series only), cubers by username prefix, and the themes (from `THEMES`, plus System). **Left out on purpose: "switch puzzle" and "start a new session".** Both act on the timer's session store from outside the timer screen, which the architecture's timer rules keep away from other surfaces; "Timer" opens the timer, where both already are. The shortcut waits while a solve is under way (the timer's existing sidebar lock) and the open dialog takes `useOverlayLock()`, so Space typed into the search never reaches the timer. Database lookups are debounced 180 ms and run as the visitor (RLS applies). No `cmdk` dependency: a Base UI Dialog and a listbox are enough for this size.

**Theme picker for everyone; the dev switcher is gone** (2026-11-25, design tokens step 8). Settings needs an account, so guests had no in-app theme control (the dev pill only existed in `next dev`). A Slate / Paper / System picker now sits in the expanded sidebar's footer (Rail users have Ctrl+K → "paper") and in the phone More sheet. Not saved to the account: that needs a `user_settings` column and a migration, so it waits for the founder; the cookie already covers both hosts.

**Offline timer: a hand-written service worker, guest timer only** (2026-11-25, `docs/pwa.md`). No Serwist or other dependency: the rules fit in one file. Offline, everyone gets a guest copy of `/timer` fetched without cookies at install; signed-in cubers' offline solves land in local storage and the existing local-to-cloud sync moves them into the account the next time the timer loads online. Caching a signed-in page would store personal data and, worse, a page whose saves go to Supabase and fail silently offline. Build files are cache-first (their names change every build); nothing else is cached. Registered in production builds only. The installed app opens on the timer, not Home: it's the one page that works offline.

## Home

**Home follows the Stats page for solve data** (2026-11-24, home plan steps 1–4). The plan has signed-in cards as async server components; the stats and streak cards instead read solves in the browser through the timer's repository (`createSupabaseRepo(userId)` or `localRepo`), exactly as `/stats` does, so a guest and a member see the same numbers computed the same way. Cards whose data only exists on the server (learning, drill queue, friends, clubs) are async server components in their own `<Suspense>`.

**Visitor detection.** Members: solve count from their own profile stats (`getPublicProfile`), under 20 is "new". Guests: local solve count across events. A first-time guest also gets a Playground card (the plan's "Learn and Playground cards"), so `playground` is a card id.

**"Continue learning" picks the series with the most cases learned that isn't finished.** The profile stats have no "last touched" time per series, which "most recent activity" would need.

**The welcome card's "Pick your main puzzle" ticks once the timer has a saved event** (`cubehub.timer.event`), the only per-user puzzle choice the app stores today.

**Saved layouts are `{ hidden, shown, order? }`**, not just `{ hidden, order }`: Streak and goal is off by default and can be switched on, which needs a list of cards switched on. Unknown ids are dropped on read.

**The stats card's line is the last 30 solve times, not `spreadTrend()`.** The plan names `spreadTrend()` for a "30-solve trend sparkline", but that function charts the spread over 25-solve chunks and needs 50+ solves to draw anything. The card draws the last 30 counted times with the existing `Sparkline` and says "improving / steady / slower" by comparing the two halves (2% band); the Stats page keeps the spread chart.

**No case diagram on the Continue learning card yet.** Drawing one needs cubing.js, and the plan also says Home loads no cubing.js up front; the card shows the next case's name and main algorithm instead. A lazy diagram can follow with the daily scramble's lazy cube preview.

**The daily goal is stored per device** (`cubehub.home.dailyGoal`): `goal-storage.ts` holds per-puzzle time goals, and syncing it would need another `user_settings` column. Home's stats and streak look back 90 days and use the last-used puzzle's solves (the timer's per-device event).

**No unread counts on the clubs card.** The app has no per-member "last read" state for club posts, so there is nothing to count; the card shows each club's newest post's first line (up to three clubs, one query each). Unread counts need a read-marker table first.

**Dismissals are per device.** "What's new" dismissals and "hide today's tip" live in localStorage (`cubehub.home.dismissedChanges`, `cubehub.home.tipDismissedOn`), not on the account. The tip has no "Cubby off" check yet because there's no Cubby setting.

**`user_settings.home_layout` was a migration file at first** (applied 2026-11-25) (`supabase/migrations/20261124000000_home_layout.sql`), per the overnight rules. Until it's applied, `getHomeLayout()` logs the error and returns null (the default layout), so Home works; a signed-in cuber's Customize changes show "Couldn't save your layout". Guests are unaffected (localStorage `cubehub.home.v1`). No new RLS policy: `settings_all` covers the column. A check constraint keeps the value a JSON object under 4 KB.

**The Customize button sits right-aligned just above the cards**, not in the greeting row: which cards a member can switch depends on their visitor state, which streams in with the cards, and the greeting row renders before that.

**Daily scramble: scrambles are pre-generated, not made on the first request** (2026-11-25, home plan step 5). The timer's scrambler is cubing.js loaded at runtime from `public/` in the browser; a server action would need a second, server-side cubing bundle, which `docs/roadmap.md` spent months getting rid of. `scripts/generate-daily-scrambles.mjs` runs the same random-state scrambler in Node and writes 60 days at a time to `supabase/DataSeeds/` (`on conflict do nothing`, so a loaded day never changes). The first file covers 2026-11-25 to 2027-01-23; **the next batch is due before 2027-01-23**, or the card quietly disappears.

**Daily results go in through `submit_daily_result()`, not an RLS insert policy.** The plan suggests RLS ("insert only their own row, once"). A security-definer function does that and more in one place: the signed-in user's own row only, today's or yesterday's daily (so an attempt finished at 23:59 IST can still post), the solve sanity floor (`misstop_limit_ms`, 2.00 s for 3x3) and a one-hour ceiling, and the primary key keeps the first post. Clients have select only. It returns whether the row was new, so a second post says "your first result stands". `effective_ms` is a generated column (+2 applied, null for DNF) with a partial index for the board, following `solves.effective_time_ms`. The plan's `time_ms` null for DNF is kept; the browser keeps the raw time.

**One attempt is enforced in the browser too.** The attempt is written to `cubehub.daily.v1` the moment the timer stops, before any posting, so a reload shows the result, not a fresh timer. Guests' attempts stay there ("Sign in to get on the leaderboard"); after signing in they can post that same attempt. The cuber confirms the penalty before posting and can only make it worse than what inspection gave.

**The daily is its own screen, not a flag in `TimerScreen`.** `/timer?daily=…` renders `DailyTimer`, which borrows the timer store (TouchStage, TimeDisplay, WCA inspection penalties) and restores the session's scramble slots, puzzle and settings when it unmounts. The normal `TimerScreen`, which records solves, isn't mounted, so the daily attempt can't land in a session. `TouchStage` got a `shortcuts` prop (default on) because its idle shortcuts act on the session: in the daily, D would have deleted a real solve and → would have swapped the scramble.

**Card placement and content.** First in the defaults for regular members and returning guests; new visitors start with the welcome card and can switch the daily on. It renders nothing when there's no daily (or before the migration). No 2D net on the card: Home loads no cubing.js up front; the daily timer shows the preview. Leaderboard is global, 3x3 only (open questions 1 and 2, suggested answers). Names on the board come through `profiles` RLS, so a blocked cuber shows as "A cuber".

**Checked locally first, then on the live project.** The SQL test (14/14) and seed ran on a throwaway `supabase/postgres` container; the guest flow e2e and the card/leaderboard screenshots ran against `next dev` with a local PostgREST behind a small proxy. On the real e2e setup (live project, migration not applied) the guest-flow test skips itself.

**Next achievement: progress from the profile stats, time gaps counted double** (2026-11-25, home step 6). The card reads `getAchievements()` (now with each badge's condition) and the cuber's own profile stats and PBs; it never decides a badge is earned (the server's award check does, and it counts timer-only averages, so the two can differ slightly). For time badges a raw ratio made everything look nearly done (25 s against sub-20 read 80%), so the gap counts double (that reads 50%; 16.42 against sub-15 reads 81%). Hidden badges and ones that can't be measured from stats (night owl, marathon) are skipped. On by default for regular members; new members can switch it on.

## Tests

**The `playground-swipe` flake was the test, not the swipe code** (2026-11-25, next batch step 5). Reproduced at 8 parallel workers: 13 of 24 projection runs failed, every sticker reading as the page background. The WebGL canvas hadn't drawn its first frame yet when the test took its screenshot: the loader going away doesn't mean a frame exists, and the fixed 400 ms / 800 ms sleeps weren't enough under load. Fixed in the spec, not quarantined: `openCube` waits until the F and R centres read green and red; `setCamera` drives `orbitCoordinatesRequest` (cubing's own drag path) and polls until the model reports the angle; the colour checks poll (10 s) instead of sleeping, so a wrong projection still fails. A second bug surfaced on the way: after an off-cube drag, setting the `cameraLatitude`/`cameraLongitude` props back to the values they already held was a no-op, so "back at the default camera" in the tap/orbit test had been 7° off all along. After the fix: 56/56 at 8 workers × 4 repeats, and 162/162 for both playground specs at 12 workers × 6.

## Product

**Bots before live matchmaking.** Bot opponents work with zero other users online, which solves the cold-start problem; real-time matchmaking is worth nothing until there's a population to match against.

**ELO starts at 1000** (decided 2026-07-25). The live database already defaults both `elo_ratings.rating` and `peak_rating` to **1000**, so the database is authoritative and no migration is needed. The earlier planning documents said 800; they were wrong and have been corrected.

*Consequence, still to settle when the competitive tab is built:* the planned tier bands (Scrambled <900, Beginner 900–1100, Intermediate 1100–1300, …) were drawn around a start of 800, so a new user now opens mid-**Beginner** rather than at the bottom of the ladder. Either shift the bands up so 1000 is the floor of the entry tier, or accept that "Scrambled" is a demotion tier you fall into rather than start in. Cosmetic — it changes labels, not ratings.

## Open

Nothing blocking. Product-level unknowns (domain, algorithm sourcing, csTimer import format) live in `roadmap.md` → Open questions.
