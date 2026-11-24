# App shell plan: domain split and sidebar

> **Status:** steps 1–8 and 10 done (Nov 24–25, 2026); step 9 (go-live) is the founder's · Sumit Garad
> **For:** Claude Code. Read `AGENTS.md` and `docs/architecture.md` first. This is Next.js 16: check
> `node_modules/next/dist/docs/` before writing proxy, routing or metadata code.
> **Related:** `docs/home-plan.md` (the `/home` page this shell hosts), `docs/landing-plan.md`
> (the marketing site on the root domain), `docs/cubby-cubing-companion.md` (Cubby lives in this shell).

## Summary

CuberHub moves to two hosts, the way Flowtimer runs `flowtimer.io` and `app.flowtimer.io`:

- `cuberhub.me` is the marketing site: landing page, feature pages, roadmap, legal.
- `app.cuberhub.me` is the product: Home, Timer, Learn, Drill, Playground, Stats, Clubs, Profile.

Both hosts are served by **one Next.js project and one Vercel deployment**. `src/proxy.ts` decides
which host a path belongs to and redirects the rest.

Inside the app, the top navbar is replaced by a **left sidebar** that can be expanded, collapsed to
an icon rail, or hidden. Because the sidebar can be hidden and Focus mode already hides all chrome
while a solve runs, the timer's separate **Zen mode is retired**.

**Done when:** every app route serves from `app.cuberhub.me` with the sidebar, the root domain serves
only marketing pages, a signed-in user stays signed in across both hosts, a guest's saved solves
survive the move, and the timer has no Zen toggle.

## Goals and non-goals

**Goals**

- The app feels like an app: no marketing header, full-height content, a sidebar the user controls.
- One codebase, one deploy, shared components and tokens.
- Nobody loses data or their session in the move.
- Preview deployments (`*.vercel.app`) and local dev keep working on a single host.

**Non-goals**

- Splitting into two Next.js projects or a monorepo.
- Moving Learn content to the root domain (see Decision D3; revisit after the beta).
- Building Cubby. The sidebar only reserves its slot.
- Redesigning individual pages beyond what the new shell needs.

## Decisions

| # | Decision | Why |
| --- | --- | --- |
| D1 | Domain is `cuberhub.me`, app on `app.cuberhub.me`. | Brand is now CuberHub. Closes roadmap open question 1 (was `cubehub.in` or `.io`). |
| D2 | One Next.js project serves both hosts; host routing lives in `src/proxy.ts`. | Solo developer; shared code; one place to reason about routing. |
| D3 | `/learn/**` stays on the **app** host for now and remains indexable there. | Learn pages use the app shell, the drill and the cube stores. Moving them to the root host means a second chrome for them. Revisit after the beta with real search data; 301s make it reversible. |
| D4 | Auth and theme cookies are set on `.cuberhub.me` in production so both hosts share them. | The landing CTA must know the visitor is signed in. |
| D5 | Browser storage keys keep the `cubehub` prefix. | Renaming them silently resets every user's settings. They are internal names. |
| D6 | The `(app)` layout swaps `Navbar` for `AppSidebar` on `md` and up. `BottomNav` stays on phones. | Full-height content on desktop; thumb-friendly nav on phones. |
| D7 | Zen mode is removed. Focus mode stays and is renamed "Hide UI while solving". | A hidden sidebar plus Focus mode covers what Zen did, with one less toggle. |

## 1. Host routing

### Which path lives where

| Path | Host | Notes |
| --- | --- | --- |
| `/` | root | Landing page. On the app host, `/` redirects (307) to `/home`. |
| `/features/**`, `/roadmap`, `/about`, `/privacy`, `/terms` | root | Marketing pages from `docs/landing-plan.md`. |
| `/home`, `/timer`, `/stats`, `/learn/**`, `/playground`, `/clubs/**`, `/profile/**`, `/people`, `/friends`, `/settings`, `/compete`, `/shop`, `/master-access/**` | app | Everything inside `src/app/(app)`. |
| `/login`, `/signup/**`, `/auth/**` | app | Auth runs on the app host so cookies are set where they're used. |
| `/api/viewer` | both | The landing navbar calls it on the root host. Shared cookies (D4) make it work. |
| `/robots.txt`, `/sitemap.xml` | both, different content | See "Robots and sitemaps" below. |
| Next internals, images, `icon`, `opengraph-image` | both | Never redirected. |

A path requested on the wrong host gets a **308** to the same path and query on the right host.

### Configuration

Add to `src/lib/site-url.ts` (keep `SITE_URL` as is):

```ts
/** The marketing origin, e.g. https://cuberhub.me */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
/** The app origin, e.g. https://app.cuberhub.me. Falls back to SITE_URL (single-host mode). */
export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? SITE_URL).replace(/\/+$/, "");
/** True only when the two origins differ: production and a local split-host setup. */
export const HOST_SPLIT = APP_URL !== SITE_URL;

export const siteUrl = (path = "/") => `${SITE_URL}${path}`;
export const appUrl = (path = "/") => `${APP_URL}${path}`;
```

- **Vercel production:** `NEXT_PUBLIC_SITE_URL=https://cuberhub.me`, `NEXT_PUBLIC_APP_URL=https://app.cuberhub.me`.
  Add both domains to the same Vercel project.
- **Preview deployments:** leave `NEXT_PUBLIC_APP_URL` unset. `HOST_SPLIT` is false and everything
  works on one host, as today.
- **Local dev:** single host by default. To test the split, set `NEXT_PUBLIC_SITE_URL=http://localhost:3000`
  and `NEXT_PUBLIC_APP_URL=http://app.localhost:3000`. Chrome and Firefox resolve `*.localhost` with no
  hosts-file change.

### The routing function

Put the decision in a pure function so it can be unit-tested without Next:

```ts
// src/lib/host-routing.ts
export type HostDecision =
  | { kind: "pass" }
  | { kind: "redirect"; to: string; status: 307 | 308 }
  | { kind: "rewrite"; to: string };

export function routeForHost(host: string, pathname: string, search: string): HostDecision;
```

Rules:

1. If `HOST_SPLIT` is false, return `pass`.
2. Never touch `/_next/**`, `/api/**`, static files, `icon`, `apple-icon`, `opengraph-image`, `twitter-image`.
3. On the app host, `/` redirects (307) to `/home`.
4. On the app host, `/robots.txt` and `/sitemap.xml` rewrite to `/app-robots.txt` and `/app-sitemap.xml`.
5. A path classified for the other host is a 308 to that host, keeping the path and `search`.
6. Unknown paths pass, so each host renders its own 404.

Classify paths with one list exported from `src/lib/host-routing.ts` (`ROOT_PATHS` as exact paths or
prefixes). Anything not on the root list belongs to the app host. That way a new app route needs no
routing change.

### Wiring it into `src/proxy.ts`

`docs/architecture.md` has two rules for `updateSession()`: run nothing between `createServerClient()`
and `getUser()`, and return `supabaseResponse` untouched. So host routing runs **before** the session
refresh, and returns early for redirects and rewrites:

```ts
export async function proxy(request: NextRequest) {
  const decision = routeForHost(request.headers.get("host") ?? "", request.nextUrl.pathname, request.nextUrl.search);
  if (decision.kind === "redirect") return NextResponse.redirect(decision.to, decision.status);
  if (decision.kind === "rewrite") return NextResponse.rewrite(new URL(decision.to, request.url));
  return await updateSession(request);
}
```

Check the Next 16 proxy docs for `NextResponse.rewrite` behaviour before relying on it. The
`config.matcher` stays as it is.

### Robots and sitemaps

- **Root host:** `src/app/robots.ts` allows everything, points at `https://cuberhub.me/sitemap.xml`.
  `src/app/sitemap.ts` lists only marketing pages.
- **App host:** new route handlers `src/app/app-robots.txt/route.ts` and `src/app/app-sitemap.xml/route.ts`.
  Robots allows `/learn/` and `/profile/` (public, shareable) and disallows everything else.
  The sitemap lists Learn pages and public profiles. Move the existing builder from `src/lib/seo/`; it
  already knows those URLs.
- Canonical URLs (`metadata.alternates.canonical`) must use `appUrl()` for app pages and `siteUrl()`
  for marketing pages. Audit every `SITE_URL` use: most app-page uses become `APP_URL`.
- Verify both hosts in Google Search Console.

## 2. Auth and cookies across hosts

### Supabase cookies

When `HOST_SPLIT` is true, every Supabase client sets cookies on the parent domain:

- `src/lib/supabase/client.ts` (browser), `server.ts` (RSC) and `proxy.ts` (session refresh) pass
  `cookieOptions: { domain: COOKIE_DOMAIN }`. Check the exact option name in `@supabase/ssr` 0.12 before
  writing it.
- `COOKIE_DOMAIN` is derived from `SITE_URL`'s hostname with a leading dot (`.cuberhub.me`), and is
  `undefined` when `HOST_SPLIT` is false or the host is `localhost`.
- Old host-only cookies on `cuberhub.me` will exist for current users. On the first request after the
  switch, the session refresh writes the new parent-domain cookie. Expect a few users to need one
  sign-in again; the release note should say so.

### Supabase dashboard and OAuth

- **Site URL:** `https://app.cuberhub.me`.
- **Redirect allow-list:** `https://app.cuberhub.me/auth/callback`, `https://app.cuberhub.me/auth/confirm`,
  plus the preview pattern already in use.
- **Google Cloud OAuth client:** add `https://app.cuberhub.me` and `https://cuberhub.me` as authorised
  JavaScript origins. The redirect URI (Supabase's callback) doesn't change.
- **Email templates:** links go to the app host. Update the confirm and reset templates' text from
  CubeHub to CuberHub at the same time.
- `(auth)/layout.tsx` already redirects signed-in users to `/timer`. Change the target to `/home`.

### Theme cookie

`cubehub-theme` (`src/lib/theme.ts`, `setTheme`) gets `domain=.cuberhub.me` under the same condition,
so a theme picked on the landing page's "Make it yours" section carries into the app. Keep the name.

## 3. Guest data handoff (one-time)

Browser storage is per origin. Guests who timed on `cuberhub.me` have their data there, and
`app.cuberhub.me` can't read it. Signed-in users are fine: their solves are in Supabase.

### What moves

Everything under these keys on the old origin:

- localStorage keys starting with `cubehub-` or `cubehub.` (today: `cubehub.timer.v1`, `cubehub.settings.v1`,
  `cubehub.layout.v2`, `cubehub.stats.goals.v1`, `cubehub-default-session`, `cubehub-focus-mode`,
  `cubehub-playground-prefs`, `cubehub-timer-bg-options`). Find the full list with
  `grep -rhoE "\"cubehub[.-][a-z0-9.-]+\"" src | sort -u` at the time of the change.
- The timer background image in IndexedDB (`src/lib/timer-background/storage.ts`).

### How

A server redirect would skip the old origin's JavaScript, so for a transition window the root host
serves a tiny **handoff page** instead of a 308 for app paths:

1. `routeForHost` gets one extra rule, active until `HANDOFF_UNTIL` (a date constant, suggest
   2027-03-01): on the root host, an app path is **rewritten** to `/handoff?next=<path>` unless the
   `cubehub-handoff-done` cookie is present.
2. `/handoff` (root host, client component, no chrome) checks local storage for any `cubehub` keys.
   - None: set `cubehub-handoff-done=1` on `.cuberhub.me` and `location.replace(appUrl(next))`.
   - Some: load a hidden iframe `appUrl("/handoff/receive")`, wait for its `ready` message, then
     `postMessage` the keys and values (and the background image as a `Blob`) with
     `targetOrigin = APP_URL`. The receiver checks `event.origin === SITE_URL`, writes each key only if it
     doesn't already exist on the app origin, and replies `done`.
   - On `done`, set the cookie and redirect. On a 5-second timeout, redirect anyway and leave the old
     data in place so a retry is possible on the next visit.
3. `/handoff/receive` (app host, no chrome) is `noindex` and accepts messages only from `SITE_URL`.
4. Never delete the old data in this release. A later cleanup can remove it once `HANDOFF_UNTIL` passes.
5. After `HANDOFF_UNTIL`, delete the handoff rule, both pages and the cookie check. Plain 308s remain.

Beta testers who used `pre-cube-hub.vercel.app` are out of scope: ask them to sign in once so their
local solves sync (the existing sign-in sync handles it).

## 4. The sidebar

### States

| State | Width | Shows | Default for |
| --- | --- | --- | --- |
| Expanded | 232 px | Icon, label, group headings, sub-items | Home, Learn, Stats, Clubs, Profile, Settings |
| Rail | 64 px | Icons with tooltips, flyouts for sub-items | Timer, Drill, Playground |
| Hidden | 0 | Nothing; an 8 px hover zone on the left edge and a small floating button bring it back | User's choice on any page |

- The user's last explicit choice **per page group** wins over the default and is remembered:
  `timer`, `practice` (drill, playground), `browse` (everything else).
- On widths between `md` and `lg` the default is Rail everywhere.
- Hover-to-peek: in Hidden, hovering the left edge for 150 ms slides the sidebar over the content as an
  overlay (no layout shift). Leaving it closes it after 300 ms.
- Expanded to Rail and back animates width over 200 ms (`motion`), with `prefers-reduced-motion`
  making it instant.

### Persistence without a flash

The width must be right on first paint. `(app)/layout.tsx` is already dynamic (it reads auth
cookies), so read a `cubehub-sidebar` cookie there and pass the initial state down. The cookie holds
`{"timer":"rail","practice":"rail","browse":"expanded"}` and is written by the client on change (domain
per D4). No localStorage for this.

### Content

```
[CH logo]  cuberhub                     ← links to /home
──────────────
Home
Timer
Stats
── Practice
Learn            ▸ 3x3: Tutorials, PLL, OLL · 2x2: Ortega, CLL
Drill Lab
Playground
── Community
Clubs
People
──────────────  (pinned to bottom)
Notifications    (bell with unread count, moved from the navbar)
Cubby            (hidden until the companion ships)
Settings
[avatar] Sumit   ▸ Profile, Edit profile, Sign out
   or  [Sign in] for guests
[« Collapse]
```

- Compete and Shop stay out of the nav until they exist (roadmap decision of 2026-10-14). When they
  ship, they go under Community and Practice respectively.
- Learn's sub-items: in Expanded they're an accordion under Learn, open when on a Learn route; in Rail
  they're a flyout menu on hover or focus. `components/ui` has only `popover` and `confirm-dialog` today:
  add a `dropdown-menu` (Base UI `Menu`) and a `sheet` (Base UI `Dialog`) primitive through the shadcn CLI
  in the `base-nova` style, and reuse them for the user menu, the phone "More" sheet and Home's Customize
  sheet. Source the sub-items from the puzzles and series the Learn index already lists, not a
  hard-coded list.
- Drill keeps its `match` rule from `navigation.ts` so `/learn/333/drill` lights Drill, not Learn.

### `navigation.ts` changes

`src/lib/navigation.ts` stays the single source of nav items:

- Add `{ label: "Home", href: "/home", icon: House }` first (`House` from lucide-react), and `People`.
- Add an optional `group: "main" | "practice" | "community"` and `children?: NavItem[]` to `NavItem`.
- Export `sidebarItems` (grouped) and keep `navItems` for anything that still reads it.
- Update `activeNavHref` so `/home` and `/` (single-host mode) light Home. Add unit tests.
- Mobile items: see section 6.

### Components

- `src/components/layout/app-sidebar.tsx`: client component. Receives `profile`, `notifications` and the
  initial sidebar state from the layout.
- `src/stores/sidebar-store.ts`: zustand, holds the state per group, writes the cookie.
- Reuse `user-menu.tsx` and the notifications popover from `navbar.tsx`; don't duplicate them.
- Use the shadcn `sidebar-*` tokens that already exist in `globals.css`. No raw colours
  (`npm run check:colors`).
- `src/app/(app)/layout.tsx` becomes a two-column flex: `<AppSidebar/>` (hidden below `md`) and `<main>`.
  `Navbar` is no longer rendered in `(app)`. Keep the file until nothing imports it, then delete it.
- Pages that relied on the navbar's height for `sticky` offsets or `calc(100vh - …)` need a pass: grep
  for `top-14`, `h-[calc(100`, `100dvh`, `100svh` under `src/components` and `src/app/(app)`.

### Keyboard and accessibility

- `Ctrl+B` / `⌘B` toggles Hidden and the page's last visible state. `Ctrl+\` / `⌘\` toggles Expanded and Rail.
  Never Space, never a bare letter. Both are ignored while focus is in an input, textarea or
  contenteditable, and **while the timer is not idle** (read the phase from `useTimerStore` only inside
  the timer route's component, not in the sidebar).
- `<nav aria-label="Main">`, `aria-current="page"` on the active item, visible focus rings, tooltips in
  Rail with the label, the collapse button labelled with the state it will switch to.
- An open flyout or user menu takes `useOverlayLock()` (`stores/overlay-store.ts`) so Space can't start
  the timer behind it.
- The sidebar is a sibling of the page's `<main>`, never inside `<TouchStage/>` (architecture rule).

### Cubby slot

Reserve the bottom "Cubby" item and a `data-tour="sidebar"` attribute on the `<nav>`. The companion
spec uses the sidebar as one of its tour targets. Render nothing for the item until the companion's
feature flag is on.

## 5. Timer: retiring Zen mode

Today (`docs/timer.md` → Modes): **Zen** dims everything but the digits while solving, **Focus** hides
everything including navigation while solving.

Change:

1. Remove the Zen toggle from `src/components/timer/timer-modes.tsx`.
2. Remove `isZenMode` and `setZenMode` from `src/stores/layout-store.ts`, and the checks in `navbar.tsx`,
   `bottom-nav.tsx` and `timer-screen.tsx` (including the "Exit Zen Mode" button).
3. Keep Focus mode as is (`src/lib/timer/focus.ts`, the `data-focus-solving` attribute). Rename its label
   to "Hide UI while solving". The `globals.css` rule keyed on `data-focus-solving` must also hide
   `AppSidebar`, including the hover zone, so the edge can't open it mid-solve.
4. Make Focus mode **on by default for new users**: `loadFocusMode()` returns `true` when the key is
   absent. Users who turned it off keep it off.
5. Keep the dimming (`fadeWhileSolving` in `timer-screen.tsx`) for when Focus mode is off: it's the
   calm fallback and costs nothing.
6. Update `docs/timer.md` → Modes and any e2e tests that click "Zen Mode".

Fullscreen, Blind and WCA modes are unchanged.

## 6. Phones

- `BottomNav` stays below `md`. Its five tabs become **Home, Timer, Learn, Drill, More**.
- **More** opens a bottom sheet with Stats, Playground, Clubs, People, Profile, Settings and Sign out or
  Sign in. Build it on the `sheet` primitive added in section 4.
- The notifications bell and avatar move to a slim top bar on `/home` only. Other pages keep the full
  height.
- Focus mode hides the bottom nav while solving, as today.
- Update `MOBILE_HIDDEN` and its comment in `navigation.ts`, and note the change in `docs/roadmap.md`.

## 7. Command palette (new, optional)

A `⌘K` / `Ctrl+K` palette, like chess.com's search, makes the hidden sidebar painless:

- Go to any page, open a Learn case by name ("Gb perm", "OLL 33"), switch puzzle, start a new
  session, toggle theme, look up a cuber by username.
- Opens from a search icon at the top of the sidebar too.
- Disabled while the timer is not idle, and takes `useOverlayLock()` when open.
- Ship after steps 1–7 below; it isn't needed for the beta.

## Implementation order

Each step is one PR with `npm run validate` and `npm run test:e2e:prod` green.

1. ✅ **Host helpers, behind the flag.** `site-url.ts` additions, `src/lib/host-routing.ts` with unit tests,
   proxy wiring. With `NEXT_PUBLIC_APP_URL` unset nothing changes.
2. ✅ **Robots and sitemaps per host.** `app-robots.txt`, `app-sitemap.xml`, canonical audit.
3. ✅ **Cookies across hosts.** `COOKIE_DOMAIN`, Supabase clients, theme cookie, `(auth)` redirect to `/home`.
4. ✅ **Handoff pages.** `/handoff`, `/handoff/receive`, the handoff rule, tests with two origins. *(unit-tested; no two-origin e2e, see decisions.md)*
5. ✅ **Sidebar.** Store, cookie, component, `navigation.ts` changes, unit tests. Render it behind a
   `NEXT_PUBLIC_SIDEBAR=1` flag next to the old navbar so it can be reviewed in a preview.
6. ✅ **Swap the shell.** `(app)/layout.tsx` uses the sidebar, navbar removed from `(app)`, layout offsets fixed.
7. ✅ **Timer modes.** Zen removed, Focus default on and hides the sidebar.
8. ✅ **Phones.** Bottom nav with More sheet.
9. **Go live.** Add `app.cuberhub.me` in Vercel and Namecheap (CNAME to the value Vercel shows), set
   `NEXT_PUBLIC_APP_URL`, update Supabase and Google settings, deploy, run the checks below.
10. ✅ **Docs.** `architecture.md` (routes table, hosts, cookies), `roadmap.md` (domain decided),
    `decisions.md` (D1–D7), `timer.md` (modes), manual smoke test table.
11. Command palette (optional).

## Tests

**Unit (Vitest)**

- `routeForHost`: every row of the path table on both hosts, single-host mode passes everything,
  query strings survive redirects, internals never redirect, the handoff rule switches off after
  `HANDOFF_UNTIL`.
- `activeNavHref`: Home, Drill vs Learn, other people's profiles.
- Sidebar store: per-group state, cookie round-trip, defaults by width.

**E2E (Playwright, split hosts on `localhost` and `app.localhost`)**

- `cuberhub.me/timer?x=1` → `app.cuberhub.me/timer?x=1` (after the handoff cookie is set).
- `app.cuberhub.me/` → `/home`.
- Sign in on the app host, open the root host: the landing navbar shows the user, not "Sign in".
- A guest with solves in the root origin's localStorage lands on the app timer with those solves.
- Sidebar: collapse on Timer, reload, still Rail; Home still Expanded.
- With a Learn flyout open, Space does not start the timer.
- With Focus mode on, the sidebar and bottom nav are hidden while running and back after stop.
- No "Zen Mode" toggle in Modes.

**Manual smoke test** — replace the tables in `docs/architecture.md` with host-aware ones:

| Request | Logged out | Logged in |
| --- | --- | --- |
| `cuberhub.me/` | landing, "Sign in" | landing, avatar, "Open app" |
| `cuberhub.me/timer` | 308 → `app.cuberhub.me/timer` | same |
| `app.cuberhub.me/` | 307 → `/home` | same |
| `app.cuberhub.me/settings` | 307 → `/login` | settings with sidebar |
| `app.cuberhub.me/login` | login | 307 → `/home` |

## Open questions

1. Should Learn move to the root host after the beta (D3)? Decide with Search Console data from both hosts.
2. Does `cuberhub.me` stay long-term, or is there a move to `.in` / `.io`? The GitHub Student Pack domain
   is free only for the first year, so check the renewal price; a later move means another round of 301s.
3. Should guests see a "Sign in to keep your solves safe" nudge on `/home` during the handoff window?
