/*
 * CuberHub service worker: the timer works offline once the app has been
 * opened online (docs/pwa.md).
 *
 * - Offline, every timer visit gets a *guest* copy of /timer, fetched without
 *   cookies when this worker installs. Solves made offline are saved in the
 *   browser; for a signed-in cuber the timer copies them into the account the
 *   next time it loads online (src/lib/timer/sync.ts). No signed-in page is
 *   ever cached, so nothing personal is stored here.
 * - Build files (/_next/static, /cubing/<version>) have unique names, so they
 *   are cached on first use and served from the cache after that.
 * - Everything else (pages, API routes, Supabase, RSC requests) goes to the
 *   network untouched. Other pages offline get a small "you're offline" page.
 *
 * Bump VERSION to drop every cache on the next visit.
 */
const VERSION = "v1";
const SHELL = `cuberhub-shell-${VERSION}`;
const ASSETS = `cuberhub-assets-${VERSION}`;
const OFFLINE_TIMER = "/timer";

const OFFLINE_PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Offline — CuberHub</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:#0f172a;color:#f8fafc;text-align:center;padding:1rem}
a{color:#00d4aa;font-weight:600}</style></head><body><main><h1>You're offline</h1>
<p>This page needs a connection. The timer works offline.</p><p><a href="/timer">Open the timer</a></p></main></body></html>`;

/** Precache the guest timer and the build files it references. */
async function cacheShell() {
  const res = await fetch(OFFLINE_TIMER, { credentials: "omit", cache: "no-store" });
  if (!res.ok) return;
  const html = await res.clone().text();
  const shell = await caches.open(SHELL);
  await shell.put(OFFLINE_TIMER, res);
  const assets = await caches.open(ASSETS);
  const urls = [...new Set([...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)].map((m) => m[1]))];
  await Promise.all(urls.map((u) => assets.add(u).catch(() => undefined)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(cacheShell().catch(() => undefined).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("cuberhub-") && k !== SHELL && k !== ASSETS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/** Refresh the offline timer now and then while online (a new deploy changes it). */
self.addEventListener("message", (event) => {
  if (event.data === "refresh-shell") event.waitUntil(cacheShell().catch(() => undefined));
});

function isBuildFile(url) {
  return url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/cubing/");
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (isBuildFile(url)) {
    event.respondWith(
      caches.open(ASSETS).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(async () => {
        // The plain timer only: a daily scramble (?daily=) needs the network anyway.
        if (url.pathname === OFFLINE_TIMER && !url.searchParams.has("daily")) {
          const shell = await caches.match(OFFLINE_TIMER, { cacheName: SHELL });
          if (shell) return shell;
        }
        return new Response(OFFLINE_PAGE, { headers: { "Content-Type": "text/html; charset=utf-8" } });
      }),
    );
  }
});
