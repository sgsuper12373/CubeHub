# Architecture

## Stack

| Layer | What | Version |
|---|---|---|
| Framework | Next.js, App Router | 16.2.10 |
| UI | React | 19.2.4 |
| Styling | Tailwind CSS | v4 |
| Components | shadcn `base-nova` on Base UI (`@base-ui/react`) | shadcn 4.13, base-ui 1.6 |
| Icons | lucide-react | 1.24 |
| Backend | Supabase — Postgres, Auth, Realtime, Storage | `@supabase/ssr` 0.12, `supabase-js` 2.109 |
| Language | TypeScript, `strict: true` | 5.x |

No test tooling and no Supabase CLI are installed yet.

**Not yet added**, but planned per the roadmap: `cubing.js` (3D cube), `recharts` (stats), `zustand` (timer state), `react-hook-form` + `zod`, `date-fns`.

## Layout of the repo

```
src/
  app/            routes (see below)
    icon.tsx            favicon, generated via next/og
    opengraph-image.tsx OG card, generated via next/og
  components/
    ui/           shadcn primitives — button, card, input, label, toast
    auth/         auth-listener, google-button
    layout/       navbar, bottom-nav, user-menu
    marketing/    demo-timer, feature-grid, cta-band  (landing page only)
    timer/        timer-screen (container) + presentational parts
    stats/        stats-panel, stat-tiles, session-trend, sparkline, solve-*
    settings/     settings-form
  lib/
    auth/         dal.ts (reads), actions.ts (writes)
    supabase/     client.ts (browser), server.ts (RSC), proxy.ts (session refresh)
    timer/        stores-free logic — stats, format, scrambler, repos, settings
    navigation.ts single source of nav items
    utils.ts      cn()
  stores/         zustand — timer, session, toast, overlay
proxy.ts          root — Next 16's middleware
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
  layout.tsx              document shell only — html/body/fonts/AuthListener
  (marketing)/            navbar, no bottom nav
    page.tsx                        /
  (auth)/                 no chrome at all
    login/ signup/                  /login  /signup  /signup/check-email
  (app)/                  navbar + bottom nav
    timer/ learn/ compete/ shop/    /timer  /learn  /compete  /shop
    (protected)/          + requires an account
      settings/                     /settings
  auth/                   route handlers, no UI
    callback/ confirm/ auth-code-error/
```

| Route | Auth | Notes |
|---|---|---|
| `/` | — | Landing |
| `/login`, `/signup` | must be **logged out** | `(auth)` layout redirects signed-in users to `/timer` |
| `/timer`, `/learn`, `/compete`, `/shop` | — | **Public by design.** Timer has a localStorage fallback; tutorials are meant to be shareable and indexable |
| `/settings` | required | `(protected)` layout redirects to `/login` |

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
- Base UI `Button` rendered as a link needs `nativeButton={false}` alongside `render={<Link/>}`, or it warns about lost button semantics.
- An `async` layout that reads auth cookies makes every route below it dynamic (`ƒ` in the build output). Expected, not a bug.

## Styling

**Tailwind v4 has no `tailwind.config` file.** Theme tokens live in `src/app/globals.css` (`@import "tailwindcss"`, `@custom-variant dark`, `@theme inline`). `components.json` has `"config": ""` for this reason.

`<html>` is hardcoded `className="dark"` — dark-mode-first, no theme switcher yet, though `user_settings.theme` exists in the database.

## Environment

`.env.local`, from Supabase → Project Settings → API. See `.env.example`.

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

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
