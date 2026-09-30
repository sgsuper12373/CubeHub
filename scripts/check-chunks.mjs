// Fail if any lazily loaded file the running app can request is missing.
//
//   node scripts/check-chunks.mjs [baseUrl] [extra paths...]
//   npm run check:chunks -- https://cubehub.example /learn/333
//
// A dynamic import whose file 404s does not throw anywhere you would see it.
// next/dynamic just sits on its loading state forever. That is how the landing
// hero and the scramble preview spun in every production build for weeks (see
// docs/roadmap.md). This script requests every file the app could load lazily
// and fails on the first missing one. It works against a local `next start` or
// a deployed URL.
//
// What it crawls:
//   1. Every /_next/static asset referenced by the HTML of each page checked.
//   2. Every chunk those scripts can load later:
//        - Turbopack: literal "static/chunks/<name>.js" strings in the code.
//        - webpack:   the runtime's id→hash (and id→name) map in webpack-*.js,
//                     turned into the exact URLs the runtime would request.
//                     That is the check that would have caught the 2026-07-25
//                     bug in seconds.
//   3. The cubing.js module graph served from /cubing/<version>/, which the app
//      imports at runtime (src/lib/cubing/runtime.ts). Every relative import,
//      dynamic import() and `new URL("./x.js", import.meta.url)` is followed,
//      so the search worker entry is covered too.
//
// A missing file is a failure. So is a JS file served with a non-JS MIME type,
// because browsers refuse to run module scripts served that way.

const DEFAULT_PAGES = ["/", "/timer", "/learn", "/learn/333/drill?set=pll"];
const CONCURRENCY = 8;

const [baseArg, ...extraPages] = process.argv.slice(2);
const base = new URL(baseArg ?? "http://localhost:3000");
const pages = [...new Set([...DEFAULT_PAGES, ...extraPages])];

const seen = new Set();
const queue = [];
const failures = [];
let checked = 0;
let cubingEntries = 0;

function enqueue(url, from) {
  const key = url.href;
  if (seen.has(key)) return;
  seen.add(key);
  queue.push({ url, from });
}

function isJs(url) {
  return url.pathname.endsWith(".js");
}

// ── Reference extraction ────────────────────────────────────────────────────

/** `/_next/static/...` URLs in page HTML (script src, link href, preloads). */
function refsFromHtml(html) {
  const out = new Set();
  for (const m of html.matchAll(/\/_next\/static\/[^"'\s<>)\\]+\.(?:js|css)/g)) out.add(m[0]);
  return [...out];
}

/** Chunk paths a Next client script can request later. */
function refsFromNextChunk(code, url) {
  const out = new Set();

  // Turbopack (and some webpack output): literal chunk paths.
  for (const m of code.matchAll(/["'`](?:\/_next\/)?(static\/(?:chunks|css)\/[A-Za-z0-9_.~\/-]+\.(?:js|css))["'`]/g)) {
    out.add(`/_next/${m[1]}`);
  }

  // webpack runtime: `__webpack_require__.u = e => "static/chunks/" + ({…}[e] || e) + "." + {…}[e] + ".js"`.
  // It usually lives in webpack-*.js, but a chunk that carries its own runtime
  // (cubing's worker chunk did) has one too, so every script is checked.
  // Chunks it special-cases (`9987===e ? "static/chunks/9987-<hash>.js" : …`)
  // are literal strings, which the pattern above already picks up.
  const runtime = webpackRuntimeChunks(code);
  for (const u of runtime) out.add(u);
  if (runtime.length === 0 && /\/webpack-[^/]*\.js$/.test(url.pathname) && code.includes('"static/chunks/"+')) {
    failures.push({
      url: url.href,
      reason: "could not parse this webpack runtime's chunk map; update check-chunks.mjs",
    });
  }
  return [...out];
}

function parseMap(body) {
  const map = new Map();
  for (const m of body.matchAll(/(?:"([^"]+)"|(\d+))\s*:\s*"([^"]+)"/g)) {
    map.set(m[1] ?? m[2], m[3]);
  }
  return map;
}

/** URLs a webpack runtime builds for its lazy chunks: `<name or id>.<hash>.js`. */
function webpackRuntimeChunks(code) {
  const urls = [];
  // Each `"static/chunks/" + <name> + "." + <hash> + ".js"` expression is one URL builder.
  for (const m of code.matchAll(/"static\/chunks\/"\s*\+([\s\S]{0,20000}?)\+\s*"\.js"/g)) {
    const [namePart, hashPart] = m[1].split(/\+\s*"\."\s*\+/);
    if (hashPart === undefined) continue;
    const hashes = parseMap(hashPart);
    // Names are a map (`({2609:"c01d40e7",…})[e] || e`) or, when there is only
    // one, a ternary (`2609===e ? "c01d40e7" : e`).
    const names = parseMap(namePart);
    for (const t of namePart.matchAll(/(\d+)\s*===\s*\w+\s*\?\s*"([^"]+)"/g)) names.set(t[1], t[2]);
    for (const [id, hash] of hashes) {
      urls.push(`/_next/static/chunks/${names.get(id) ?? id}.${hash}.js`);
    }
  }
  return urls;
}

/** Where the app loads cubing from, e.g. `/cubing/0.56.0/`, plus its entry files. */
function cubingRefsFromNextChunk(code) {
  const out = [];
  for (const m of code.matchAll(/\/cubing\/(\d+\.\d+\.\d+[^/`"']*)\//g)) {
    const root = `/cubing/${m[1]}/`;
    for (const e of code.matchAll(/["'`]([a-z-]+\/index\.js)["'`]/g)) out.push(root + e[1]);
  }
  return out;
}

/** Relative module references inside a cubing ESM file. */
function refsFromCubingModule(code) {
  const out = new Set();
  const patterns = [
    /\bfrom\s*["'](\.{1,2}\/[^"']+)["']/g, // import … from "./x.js"
    /\bimport\s*["'](\.{1,2}\/[^"']+)["']/g, // import "./x.js"
    /\bimport\s*\(\s*["'](\.{1,2}\/[^"']+)["']\s*\)/g, // import("./x.js")
    /new URL\(\s*["'](\.{1,2}\/[^"']+)["']\s*,\s*import\.meta\.url\s*\)/g, // worker entry
    /import\.meta\.resolve\(\s*["'](\.{1,2}\/[^"']+)["']\s*\)/g,
  ];
  for (const re of patterns) for (const m of code.matchAll(re)) out.add(m[1]);
  return [...out];
}

// ── Crawl ───────────────────────────────────────────────────────────────────

async function checkOne({ url, from }) {
  let res;
  try {
    res = await fetch(url, { redirect: "follow" });
  } catch (error) {
    failures.push({ url: url.href, from, reason: `request failed: ${error.message}` });
    return;
  }
  checked++;
  if (!res.ok) {
    failures.push({ url: url.href, from, reason: `HTTP ${res.status}` });
    return;
  }
  if (!isJs(url)) return;

  const type = res.headers.get("content-type") ?? "";
  if (!/javascript|ecmascript/.test(type)) {
    failures.push({ url: url.href, from, reason: `served as "${type}", not JavaScript` });
    return;
  }

  const code = await res.text();
  if (url.pathname.startsWith("/cubing/")) {
    for (const ref of refsFromCubingModule(code)) enqueue(new URL(ref, url), url.pathname);
  } else {
    for (const ref of refsFromNextChunk(code, url)) enqueue(new URL(ref, base), url.pathname);
    for (const ref of cubingRefsFromNextChunk(code)) {
      const before = seen.size;
      enqueue(new URL(ref, base), url.pathname);
      if (seen.size > before) cubingEntries++;
    }
  }
}

async function drain() {
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length > 0) await checkOne(queue.shift());
  });
  await Promise.all(workers);
}

for (const page of pages) {
  const url = new URL(page, base);
  let res;
  try {
    res = await fetch(url);
  } catch (error) {
    console.error(`[check-chunks] cannot reach ${url.href}: ${error.message}`);
    process.exit(1);
  }
  if (!res.ok) {
    failures.push({ url: url.href, reason: `page returned HTTP ${res.status}` });
    continue;
  }
  for (const ref of refsFromHtml(await res.text())) enqueue(new URL(ref, base), page);
}
await drain();

// A crawl that found nothing proves nothing, so treat it as a failure too.
if (checked === 0) failures.push({ url: base.href, reason: "no assets found to check" });
if (cubingEntries === 0) {
  failures.push({
    url: "/cubing/<version>/",
    reason: "no cubing entry found in any client chunk; the runtime loader was not detected",
  });
}

const cubingFiles = [...seen].filter((u) => new URL(u).pathname.startsWith("/cubing/")).length;
console.log(
  `[check-chunks] ${base.origin}: ${checked} files requested across ${pages.length} pages ` +
    `(${cubingFiles} cubing modules from ${cubingEntries} entries)`,
);

if (failures.length > 0) {
  console.error(`[check-chunks] FAIL: ${failures.length} problem(s). Each is a load that would hang or break:`);
  for (const f of failures) {
    console.error(`  ✗ ${f.url}  ${f.reason}${f.from ? `  (referenced by ${f.from})` : ""}`);
  }
  process.exit(1);
}
console.log("[check-chunks] OK: every referenced chunk and module resolved");
