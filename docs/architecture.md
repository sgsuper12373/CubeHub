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
                          plus Vercel Analytics + Speed Insights on Vercel only
  not-found.tsx error.tsx unknown URLs and errors outside (app); no navbar
  sitemap.ts robots.ts    /sitemap.xml /robots.txt
  (marketing)/            navbar, no bottom nav
    page.tsx                        /
  (auth)/                 no chrome at all
    login/ signup/                  /login  /signup  /signup/check-email
  (app)/                  navbar + bottom nav; own not-found.tsx and error.tsx
    timer/ stats/ playground/       /timer  /stats  /playground
    learn/                          /learn  /learn/[puzzle]  /learn/[puzzle]/drill
      [puzzle]/[series]/            /learn/[puzzle]/[series]  (a tutorial or an algorithm set)
        [case]/                     /learn/[puzzle]/[series]/[case]  + opengraph-image
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
| `/` | — | Landing |
| `/login`, `/signup` | must be **logged out** | `(auth)` layout redirects signed-in users to `/timer` |
| `/timer`, `/stats`, `/playground`, `/learn/**`, `/compete`, `/shop` | — | **Public by design.** Timer and stats have a localStorage fallback; tutorials and case pages are meant to be shareable and indexable (they're in the sitemap) |
| `/profile/[username]` | — | Public unless private (then owner and approved followers); 404 between blocked users (RLS `profile_visible`) |
| `/profile` | required | Redirects to your own profile, or to `/login` |
| `/profile/[username]/followers`, `/following` | — | Lists shown when the profile is visible to you |
| `/profile/[username]/compare` | required | Redirects to `/login`; lock panel if their profile is hidden |
| `/settings`, `/profile/edit`, `/people` (`/friends` redirects) | required | `(protected)` layout redirects to `/login` |
| `/master-access/**` | admin | `requireAdmin()` in its layout; redirects others to `/` |

Gated *content* inside the public routes is handled by RLS, not by routing. See `access-control.md`.

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
- An `async` layout that reads auth cookies makes every route below it dynamic (`ƒ` in the build output). Expected, not a bug.

## Styling

**Tailwind v4 has no `tailwind.config` file.** Theme tokens live in `src/app/globals.css` (`@import "tailwindcss"`, `@custom-variant dark`, `@theme inline`). `components.json` has `"config": ""` for this reason.

Themes (Slate dark, Paper light, or System) come from `src/themes/`. The `cubehub-theme` cookie is the source of truth, read in the root layout, and `THEME_INIT_SCRIPT` corrects "System" before first paint. See `design-tokens.md`. `npm run check:colors` fails on new hardcoded colours outside `src/themes/`, tests and the next/og image files.

## Environment

`.env.local`, from Supabase → Project Settings → API. See `.env.example`.

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

On Vercel, also set `NEXT_PUBLIC_SITE_URL` to the live origin (metadata, Open Graph images,
`sitemap.xml` and `robots.txt` build absolute URLs from it; `src/lib/site-url.ts`). Vercel sets
`VERCEL=1` itself, at build and run time. The root layout renders `<Analytics />` and
`<SpeedInsights />` only when it is set, so local dev, `next start`, Playwright and CI never load
them.

The `service_role` key must **never** appear here. It bypasses RLS, and anything prefixed `NEXT_PUBLIC_` is shipped to the browser.

## Manual auth smoke test

No automated tests yet. Run this after touching layouts, `proxy.ts`, or anything under `lib/auth/`.

**Logged out:**

| Route | Expect |
|---|---|
| `/` | 200 · navbar with "Sign In" · no bottom nav |
| `/login`, `/signup` | 200 · no navbar · no bottom nav |
| `/timer`, `/learn`, `/compete`, `/shop` | 200 · full app shell |
| `/settings` | **307 → `/login`** |

**Logged in:**

| Route | Expect |
|---|---|
| `/settings` | 200 · full app shell |
| `/login` | 307 → `/timer` |
| `/` | navbar shows the user menu, not "Sign In" |

Then: sign up with email → confirmation mail arrives → link lands signed in at `/timer`; Google sign-in round-trips through `/auth/callback`; a new signup creates both a `profiles` and a `user_settings` row (the trigger); sign out returns to `/login` and the navbar updates; signing out in one tab updates the others.
