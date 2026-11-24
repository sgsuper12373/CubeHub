# Architecture

## Stack

| Layer | What | Version |
|---|---|---|
| Framework | Next.js, App Router | 16.3.8 |
| UI | React | 19.2.4 |
| Styling | Tailwind CSS | 4.3 |
| Components | shadcn `base-nova` on Base UI (`@base-ui/react`) | shadcn 4.13, base-ui 1.6 |
| Icons | lucide-react | 1.24 |
| Backend | Supabase — Postgres, Auth, Realtime, Storage | `@supabase/ssr` 0.12, `supabase-js` 2.109 |
| Language | TypeScript, `strict: true` | 5.9 |
| Cube engine | cubing.js, served from `public/cubing/` at runtime (`lib/cubing/runtime.ts`) | 0.56.0 |
| Client state | zustand | 5.0 |
| Tests | Vitest + Testing Library (unit), Playwright (e2e) | vitest 4.1, playwright 1.62 |
| Monitoring | Vercel Web Analytics + Speed Insights, rendered only on Vercel (see `decisions.md` → Monitoring) | `@vercel/analytics` 2.0.1, `@vercel/speed-insights` 2.0.0 |

The Supabase CLI is linked to the live project (2026-10-14) and its migration history matches
`supabase/migrations/`, so new migrations can go through `supabase db push`. Until then they
were applied by hand in the dashboard SQL editor. Seeds in `supabase/DataSeeds/` are still
run by hand. Recharts was considered and not adopted
(`decisions.md` → Analytics).

Checks: `npm run validate` (tsc, eslint, vitest), `npm run check:colors`, `npm run test:e2e:prod`
(build, then Playwright against `next start`), and `npm run check:chunks -- <url>` after a deploy.

## Layout of the repo

```
src/
  app/            routes (see below)
    icon.tsx, opengraph-image.tsx   favicon and OG card, generated via next/og
    sitemap.ts, robots.ts           /sitemap.xml, /robots.txt
    not-found.tsx, error.tsx        themed 404 and error boundary (also inside (app)/)
  components/     one folder per area: ui (shadcn primitives), layout, auth, marketing,
                  timer, stats, learn, drill, playground, profile, settings, admin, dev
  lib/
    auth/         dal.ts (reads), actions.ts (writes)
    supabase/     client.ts (browser), server.ts (RSC, cookies), proxy.ts (session
                  refresh), public.ts (no cookies: sitemap, OG images)
    learn/        dal.ts, public-dal.ts, case-route.ts (case URLs and titles), …
    seo/          sitemap builder
    cubing/       runtime.ts, the only way to load cubing.js
    timer/ drill/ playground/ profile/ timer-background/   logic per area
    site-url.ts   SITE_URL from NEXT_PUBLIC_SITE_URL
    navigation.ts single source of nav items
  stores/         zustand: timer, session, toast, overlay, drill, layout, …
  themes/         theme tokens (Slate, Paper); the source of truth for colours
proxy.ts          root, Next 16's middleware
supabase/
  migrations/     schema, applied by hand in order
  DataSeeds/      content seeds (PLL, OLL, 2x2 sets, OLL categories), safe to re-run
  tests/          SQL test scripts; each row should say PASS
scripts/          build-cubing, check-chunks, check-colors
docs/
```

### Two rules the timer depends on

**Nothing under `components/marketing/` may import `useTimerStore` or
`useSessionStore`.** Both are module singletons that survive client-side
navigation, so a landing-page demo sharing them could leave a visitor's real
solves unrecorded if any "demo mode" flag failed to reset. `demo-timer.tsx`
keeps its own local state and reuses only pure helpers (`formatMs`,
`generateScramble`). Guard with:

```
grep -r "useTimerStore\|useSessionStore" src/app/\(marketing\) src/components/marketing
```

**Anything overlaying the timer must be a sibling of `<TouchStage/>`, never a
child.** Its pointer handlers are React props, so events bubble through the
React tree — a child (or a portal, which preserves React-tree bubbling) starts
the timer on every tap. `penalty-bar.tsx` and `floating-preview.tsx` both
follow this. Modals additionally take `useOverlayLock()` from
`stores/overlay-store.ts`, which gates the window-level key listener so Space
can't reach the timer from behind an open dialog.

`@/*` maps to `./src/*`. It's the only path alias.

## Routes

Route groups (parenthesized folders) set **chrome**, not access. They do not appear in URLs.

```
src/app/
  layout.tsx              document shell only: html/body/fonts/theme/AuthListener,
                          plus Vercel Analytics + Speed Insights on Vercel only.
                          Reads no cookies, so routes can be static.
  not-found.tsx error.tsx unknown URLs and errors outside (app)
  sitemap.ts robots.ts    /sitemap.xml /robots.txt (marketing host; whole site in single-host mode)
  app-sitemap.xml/ app-robots.txt/   the app host's own, rewritten to by proxy.ts
  (marketing)/            marketing header + footer; static (user state filled in client-side)
    page.tsx                        /   (revalidates hourly for RealStats)
    features/                       /features/timer  /features/drill-lab  /features/learn  /features/playground
    roadmap/ about/                 /roadmap (with the waitlist form)  /about
    privacy/ terms/                 /privacy  /terms   (drafts: noindex, not in the sitemap)
  handoff/                /handoff (sender, marketing host)  /handoff/receive (iframe, app host)
  api/viewer/             GET: the signed-in user's header data, for static pages
  (auth)/                 no chrome at all
    login/ signup/                  /login  /signup  /signup/check-email
  (app)/                  sidebar (desktop) + bottom bar with More sheet (phones) + Ctrl/⌘+K command palette;
                          own not-found and error
    home/                           /home   (signed-in landing; guests get the guest layout)
      daily/                        /home/daily?day=…   the daily scramble's leaderboard
    timer/ stats/ playground/       /timer (?daily=yyyy-mm-dd: the daily scramble)  /stats  /playground
    learn/                          /learn  /learn/[puzzle]  /learn/[puzzle]/drill
      [puzzle]/[series]/            /learn/[puzzle]/[series]  (a tutorial or an algorithm set)
        [case]/                     /learn/[puzzle]/[series]/[case]  + opengraph-image
    clubs/                          /clubs  /clubs/new  /clubs/[slug]  /clubs/[slug]/manage  /clubs/join/[token]
    profile/                        /profile (redirects to your own)  /profile/[username]
      [username]/followers/ following/ compare/   lists and head-to-head
    compete/ shop/                  stubs, not in the nav (reachable by URL only)
    master-access/                  admin case editor; requireAdmin() in its layout
    (protected)/          + requires an account
      settings/ profile/edit/       /settings (+ blocked accounts)  /profile/edit
      people/                       /people   (?tab=feed|find|requests)  (friends/ redirects here)
  auth/                   route handlers, no UI
    callback/ confirm/ auth-code-error/
```

| Route | Auth | Notes |
|---|---|---|
| `/`, `/features/**`, `/roadmap`, `/about`, `/privacy`, `/terms` | — | Marketing pages, all static (`○`). Served on the marketing host |
| `/login`, `/signup` | must be **logged out** | `(auth)` layout redirects signed-in users to `/home` |
| `/home` | — | Guests see the guest layout; members their cards |
| `/home/daily`, `/timer?daily=…` | — | Guests can solve the daily (kept in the browser); posting to the board needs an account |
| `/timer`, `/stats`, `/playground`, `/learn/**`, `/compete`, `/shop` | — | **Public by design.** Timer and stats have a localStorage fallback; tutorials and case pages are meant to be shareable and indexable (they're in the sitemap) |
| `/clubs`, `/clubs/[slug]` | — | Browsing is public; posting and joining need an account (RLS) |
| `/profile/[username]` | — | Public unless private (then owner and approved followers); 404 between blocked users (RLS `profile_visible`) |
| `/profile` | required | Redirects to your own profile, or to `/login` |
| `/profile/[username]/followers`, `/following` | — | Lists shown when the profile is visible to you |
| `/profile/[username]/compare` | required | Redirects to `/login`; lock panel if their profile is hidden |
| `/settings`, `/profile/edit`, `/people` (`/friends` redirects) | required | `(protected)` layout redirects to `/login` |
| `/master-access/**` | admin | `requireAdmin()` in its layout; redirects others to `/` |

Gated *content* inside the public routes is handled by RLS, not by routing. See `access-control.md`.

## Hosts

Two hosts, one deployment (`docs/app-shell-plan.md`, decisions D1–D7 in `decisions.md` → Hosts
and app shell): `cuberhub.me` serves the marketing pages, `app.cuberhub.me` the product.

- **Switch:** `NEXT_PUBLIC_APP_URL`. Unset or empty (local dev, previews, and production until
  go-live) means single-host mode: `HOST_SPLIT` is false, `appUrl()` returns the site origin,
  and `proxy.ts` passes every request.
- **Decision:** `routeForHost()` in `src/lib/host-routing.ts` (pure, unit-tested), called by
  `src/proxy.ts` before the session refresh. `ROOT_PATHS` is the one list of marketing paths;
  anything else belongs to the app host, so a new app route needs no routing change.

| Request | Result |
|---|---|
| Any host other than the two (e.g. `*.vercel.app`) | pass: serves everything |
| `/_next/**`, `/api/**`, any path with a dot (files), metadata images | pass on both hosts |
| `app.cuberhub.me/robots.txt`, `/sitemap.xml` | rewrite to `/app-robots.txt`, `/app-sitemap.xml` |
| `app.cuberhub.me/` | 307 → `app.cuberhub.me/home` |
| A `ROOT_PATHS` path on the app host | 308 → same path and query on `cuberhub.me` |
| Any other path on `cuberhub.me` (GET/HEAD, before 2027-03-01, no handoff cookie) | rewrite to `/handoff?next=…` |
| Any other path on `cuberhub.me` otherwise | 308 → same path and query on `app.cuberhub.me` |

- **Links:** marketing pages build product links with `appHref()` (`src/lib/marketing/links.ts`),
  which is `appUrl(path)` when split and the plain path otherwise. App pages set
  `metadataBase` to `APP_URL`, so their canonicals and `og:url` point at the app host.
- **Guest handoff:** `/handoff` posts every `cubehub-`/`cubehub.` localStorage key and the timer
  background to a hidden `/handoff/receive` iframe on the app host, which writes only keys it
  doesn't have, then sets `cubehub-handoff-done` and sends the visitor on (`src/lib/handoff.ts`).
  It works because the hosts are the same *site*; remove it after `HANDOFF_UNTIL` (2027-03-01).

### Cookies

`COOKIE_DOMAIN` (`src/lib/site-url.ts`) is `.cuberhub.me` when the hosts are split and undefined
otherwise (and always on localhost, where browsers refuse `domain=.localhost`).

| Cookie | Set by | Domain when split |
|---|---|---|
| Supabase auth (`sb-…`) | `lib/supabase/{client,server,proxy}.ts` | `.cuberhub.me`, so one sign-in covers both hosts |
| `cubehub-theme` | `lib/theme.ts` | `.cuberhub.me`: the landing page and the app share the theme |
| `cubehub-sidebar` | `stores/sidebar-store.ts` | `.cuberhub.me` (only read on the app host) |
| `cubehub-handoff-done` | `components/handoff/handoff-sender.tsx` | `.cuberhub.me` |

## Auth

### Request path

```
proxy.ts  →  updateSession()      refresh the session cookie. No gating.
             ↓
          layout gates             (protected)/ → redirect if no user
                                   (auth)/      → redirect if user
             ↓
          lib/auth/dal.ts          the only read path for user/profile
             ↓
          RLS                      the only enforcement for data
```

Each layer does one job. `proxy.ts` deliberately does **not** gate routes — keeping enforcement in one place per concern is what stops the two from drifting.

### Key details

- **`middleware.ts` is `proxy.ts` in Next 16.** Exports `proxy`, not `middleware`, and defaults to the Node runtime.
- **`getUser()`, never `getSession()`.** `getUser()` revalidates the token with Supabase; `getSession()` trusts the cookie. Both `dal.ts` accessors are wrapped in React `cache()`, so repeated calls within one render pass are free — that's why the `(protected)` gate costs nothing on top of `(app)`'s `getProfile()`.
- **Never run code between `createServerClient()` and `getUser()`** in `proxy.ts`, and always return `supabaseResponse` untouched. Building a different response object drops the refreshed cookies and sessions die at random.
- **`signUp` decoy users.** When an email is already registered, Supabase returns a user with `identities: []` rather than an error, to avoid leaking account existence. `actions.ts` detects this and shows a neutral message. Don't "fix" it into a specific error.
- **Two confirmation routes.** `/auth/callback` handles the PKCE `?code` exchange — this is the live path for both Google OAuth and email confirmation. `/auth/confirm` handles `token_hash` OTP and is only exercised if the Supabase email template is switched to `{{ .TokenHash }}` (cross-device safe). Both fall back to `/auth/auth-code-error`.
- **`profiles` rows are created by a database trigger**, `handle_new_user()`, not by application code. That's why `profiles` has no INSERT policy.
- **`AuthListener`** (root layout, renders `null`) subscribes to `onAuthStateChange` and calls `router.refresh()` only when the user *identity* changes, ignoring token refreshes. Handles cross-tab login/logout.

## Next.js 16 gotchas

> `AGENTS.md`: this is not the Next.js in your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing Next code.

Ones already hit:

- `middleware.ts` → `proxy.ts` (above).
- Base UI `Button` rendered as a link needs `nativeButton={false}` alongside `render={<Link/>}`, or it warns about lost button semantics. Even then the link is exposed as `role="button"`. For navigation, prefer a plain `<Link className={buttonVariants(...)}>`, as the 404, error and case pages do. Older Learn pages still use the `render` form.
- A metadata image under a dynamic segment (the case `opengraph-image.tsx`) builds as dynamic even with `revalidate`. `export const dynamic = "force-static"` makes it render on its first request and then cache.
- An `async` layout that reads auth cookies makes every route below it dynamic (`ƒ` in the build output). Expected, not a bug. That's why `(marketing)` doesn't: its navbar and CTA get the user from `GET /api/viewer` in the browser (`components/marketing/use-viewer.ts`), and `/` builds as `○`.

## Styling

**Tailwind v4 has no `tailwind.config` file.** Theme tokens live in `src/app/globals.css` (`@import "tailwindcss"`, `@custom-variant dark`, `@theme inline`). `components.json` has `"config": ""` for this reason.

Themes (Slate dark, Paper light, or System) come from `src/themes/`. The `cubehub-theme` cookie is the source of truth. The root layout renders the default theme and `THEME_INIT_SCRIPT` applies the cookie (or the OS scheme for "System") before first paint, so the root layout reads no cookies and the landing page stays static. See `design-tokens.md`. `npm run check:colors` fails on new hardcoded colours outside `src/themes/`, tests and the next/og image files.

## Environment

`.env.local`, from Supabase → Project Settings → API. See `.env.example`.

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

On Vercel, also set `NEXT_PUBLIC_SITE_URL` to the live origin (metadata, Open Graph images,
`sitemap.xml` and `robots.txt` build absolute URLs from it; `src/lib/site-url.ts`). Unset, it is
`http://localhost:3000` in `next dev` and `https://cuberhub.me` in a production build.
`NEXT_PUBLIC_APP_URL` splits the hosts (see Hosts); leave it unset until `app.cuberhub.me` is live. Vercel sets
`VERCEL=1` itself, at build and run time. The root layout renders `<Analytics />` and
`<SpeedInsights />` only when it is set, so local dev, `next start`, Playwright and CI never load
them.

The `service_role` key must **never** appear here. It bypasses RLS, and anything prefixed `NEXT_PUBLIC_` is shipped to the browser.

## Manual smoke test

Run this after touching layouts, `proxy.ts`, `host-routing.ts`, or anything under `lib/auth/`.
Most of it is also covered by Playwright; the split-host rows can only be checked on a deployment
with both custom domains (`localhost` and `app.localhost` are different sites to browsers).

**Single host (local dev, previews), logged out:**

| Route | Expect |
|---|---|
| `/` | 200 · marketing header with "Sign in" · no sidebar or bottom bar |
| `/roadmap` | 200 · board and the Notify me form |
| `/login`, `/signup` | 200 · no header, no sidebar |
| `/home`, `/timer`, `/learn`, `/compete`, `/shop` | 200 · app shell (sidebar from md, bottom bar below) |
| `/settings` | **307 → `/login`** |

**Single host, logged in:**

| Route | Expect |
|---|---|
| `/settings` | 200 · app shell |
| `/login` | 307 → `/home` |
| `/` | header shows "Open app" (→ `/home`), not "Sign in" |

**Split hosts (preview or production with `NEXT_PUBLIC_APP_URL` set):**

| Request | Expect |
|---|---|
| `cuberhub.me/` | 200 · landing page |
| `cuberhub.me/timer` (fresh browser) | `/handoff` page, then `app.cuberhub.me/timer` with local solves present |
| `cuberhub.me/timer` (after the handoff) | 308 → `app.cuberhub.me/timer` |
| `app.cuberhub.me/` | 307 → `/home` |
| `app.cuberhub.me/roadmap` | 308 → `cuberhub.me/roadmap` |
| `app.cuberhub.me/robots.txt`, `/sitemap.xml` | the app host's own (Learn and public profiles) |
| Sign in on `app.cuberhub.me`, then open `cuberhub.me` | header shows "Open app": the session cookie is on `.cuberhub.me` |
| Change the theme on the landing page, open the app | same theme |

Then: sign up with email → confirmation mail arrives → link lands signed in at `/home`; Google sign-in round-trips through `/auth/callback`; a new signup creates both a `profiles` and a `user_settings` row (the trigger); sign out returns to `/login` and the header updates; signing out in one tab updates the others.
