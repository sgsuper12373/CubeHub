// Copy cubing.js's built ESM into public/ so the browser loads it as plain
// static files instead of anything a bundler had to understand.
//
// Why: both bundlers failed at the same thing — locating cubing's search
// worker. Webpack emitted the worker entry without the sibling modules it
// imports; Turbopack could not satisfy any of cubing's three worker-URL
// strategies at all. Neither failure is really about bundling code, it is about
// resolving a file path at runtime. Serving cubing's dist verbatim makes that
// question disappear: `new URL("./search-worker-entry.js", import.meta.url)`
// resolves against /cubing/<version>/chunks/, where the file actually is,
// because the directory structure is preserved exactly as shipped.
//
// Only `.js` is copied. Source maps are 2.8 MB against 1.8 MB of code, and the
// `.d.ts` files are consumed from node_modules at build time, never served.
//
// The version goes in the path so an upgrade can never serve a half-cached mix
// of old and new modules — a new version is simply a new URL. Stale versions
// are pruned on each run.

import { readFileSync } from "node:fs";
import { cp, mkdir, readdir, rm, stat } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

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
    `[copy-cubing] cubing dist not found at ${relative(root, source)} — is it installed?`,
  );
  process.exit(1);
}

// Already copied: nothing to do. Keeps `predev` and `prebuild` cheap when both
// run, and makes repeated builds a no-op.
if (await exists(target)) {
  console.log(`[copy-cubing] public/cubing/${version} already present`);
} else {
  await mkdir(target, { recursive: true });
  await cp(source, target, {
    recursive: true,
    filter: (src) => !src.endsWith(".map") && !src.endsWith(".d.ts"),
  });
  console.log(`[copy-cubing] copied cubing ${version} → public/cubing/${version}`);
}

// Prune anything from a previous version so public/ does not accumulate.
for (const entry of await readdir(publicCubing)) {
  if (entry === version) continue;
  await rm(join(publicCubing, entry), { recursive: true, force: true });
  console.log(`[copy-cubing] pruned stale public/cubing/${entry}`);
}
