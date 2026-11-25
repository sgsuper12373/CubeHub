# Installable app and offline timer

CuberHub installs as an app (Chrome/Edge/Android "Install", iOS "Add to Home Screen") that opens
on the timer, and the timer works with no connection once the site has been opened online.

## Pieces

| File | Role |
| --- | --- |
| `src/app/manifest.ts` | `/manifest.webmanifest`: name, `start_url: /timer`, standalone, Slate colours, shortcuts |
| `public/icons/` | `icon-192.png`, `icon-512.png`, `maskable-512.png` (the CH mark on Slate; maskable has a wider margin) |
| `public/sw.js` | The service worker (no dependencies) |
| `src/components/layout/service-worker.tsx` | Registers it in production builds only; once a day online, asks it to refresh the offline timer |
| `next.config.ts` → `headers()` | `/sw.js` is never cached by the browser or the CDN |

## What the worker does

- **On install:** fetches `/timer` *without cookies*, so it caches the guest timer. It also
  caches every build file that page references.
- **Build files** (`/_next/static/…`, `/cubing/<version>/…`): their names change with every
  build, so they're served cache-first. This includes cubing.js and its scramble worker, which is
  how scrambles still work offline.
- **Navigations:** always go to the network first. If that fails:
  - `/timer` (but not `/timer?daily=…`) gets the cached guest timer.
  - Any other page gets a small "You're offline" page with a link to the timer.
- **Everything else** (API routes, RSC requests, Supabase) is never touched.

## Signed-in cubers offline

Offline, everyone gets the guest timer, so solves are saved in the browser
(`cubehub.timer.v1`). The next time the timer loads online and signed in, it copies those local
solves into the account (`src/lib/timer/sync.ts`, which already ran on sign-in). No signed-in
page is ever cached, so nothing personal is stored in the worker's caches.

## Changing it

- Bump `VERSION` in `public/sw.js` to drop every cache on the next visit. Do this when the
  caching rules change. A normal deploy doesn't need it.
- Tests: `tests/e2e/pwa.spec.ts` (production build only). It covers the manifest and icons, a
  timer opened online that scrambles and saves a solve offline, and the offline page.
