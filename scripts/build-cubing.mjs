// Build a self-contained copy of cubing.js into public/cubing/<version>/ so the
// browser loads it as plain static files, and neither Next bundler ever sees it.
//
// Why: both bundlers failed at the same thing, which was locating cubing's
// search worker. Webpack emitted the worker entry without its sibling modules.
// Turbopack could not satisfy any of cubing's three worker-URL strategies. Once
// cubing is served as real files, its own
// `new URL("./search-worker-entry.js", import.meta.url)` resolves against
// /cubing/<version>/chunks/, where the file actually is. See docs/roadmap.md.
//
// Why not copy dist/lib (the failed route3 attempt): dist/lib is esbuild
// output with `three` and `cubing/*` left as bare specifiers, which a browser
// cannot resolve. This script re-runs esbuild over dist/lib with those
// dependencies bundled in. That produces the same kind of artifact as
// cdn.cubing.net: ESM split into chunks, with only relative imports. The
// difference is that it is pinned to the installed version, which is also the
// version the types come from. (The CDN serves only the latest release, with no
// version pinning.)
//
// The version is part of the path, so an upgrade gets a new URL and a stale
// cached copy can never mix with a new one. Old versions are pruned on each run.

import { readFileSync } from "node:fs";
import { readdir, rm, stat } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Read the manifest off disk rather than through `require("cubing/package.json")`:
// cubing does not list `./package.json` in its `exports`, so the specifier form
// throws ERR_PACKAGE_PATH_NOT_EXPORTED.
const { version } = JSON.parse(
  readFileSync(join(root, "node_modules", "cubing", "package.json"), "utf8"),
);
const source = join(root, "node_modules", "cubing", "dist", "lib", "cubing");
const publicCubing = join(root, "public", "cubing");
const target = join(publicCubing, version);

/**
 * Entry points, keyed by output path (relative to `target`, without `.js`).
 * Only what `src/lib/cubing/runtime.ts` loads, plus the worker entry.
 *
 * `chunks/search-worker-entry` must keep exactly that name and directory. Cubing
 * locates it with `new URL("./search-worker-entry.js", import.meta.url)` from
 * code that lands in `chunks/`, so moving or hashing it breaks scramble generation.
 */
const ENTRIES = {
  "alg/index": "alg/index.js",
  "puzzles/index": "puzzles/index.js",
  "scramble/index": "scramble/index.js",
  "twisty/index": "twisty/index.js",
  "chunks/search-worker-entry": "chunks/search-worker-entry.js",
};

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

if (!(await exists(source))) {
  console.error(
    `[build-cubing] cubing dist not found at ${relative(root, source)}. Is it installed?`,
  );
  process.exit(1);
}

// Always rebuilt: it takes well under a second, and it means the output can
// never drift from this script or the installed package. esbuild's output is
// deterministic, so a rebuild under a running dev server changes nothing.
await rm(target, { recursive: true, force: true });
const started = Date.now();
await build({
  absWorkingDir: root,
  entryPoints: Object.fromEntries(
    Object.entries(ENTRIES).map(([out, src]) => [out, join(source, src)]),
  ),
  outdir: target,
  bundle: true,
  splitting: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  minify: true,
  chunkNames: "chunks/[name]-[hash]",
  // Cubing's own dist/lib already did the code-splitting it wants, including
  // the `import()` calls that keep the WASM solver and per-puzzle data lazy.
  // esbuild keeps every one of those as its own chunk.
  logLevel: "warning",
});
console.log(
  `[build-cubing] built cubing ${version} → public/cubing/${version} in ${Date.now() - started}ms`,
);

// Prune anything from a previous version so public/ does not accumulate.
for (const entry of await readdir(publicCubing)) {
  if (entry === version) continue;
  await rm(join(publicCubing, entry), { recursive: true, force: true });
  console.log(`[build-cubing] pruned stale public/cubing/${entry}`);
}
