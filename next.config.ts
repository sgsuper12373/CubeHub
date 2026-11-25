import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { NextConfig } from "next";

// Read off disk, not via `require("cubing/package.json")`: cubing does not
// list `./package.json` in its `exports`, so the specifier form throws.
const { version: cubingVersion } = JSON.parse(
  readFileSync(join(process.cwd(), "node_modules", "cubing", "package.json"), "utf8"),
) as { version: string };

/**
 * No bundler workarounds here, deliberately.
 *
 * This file used to carry two, both for cubing.js: a `webpack` override that
 * corrected lazy-chunk filenames, and an empty `turbopack` key to silence the
 * startup error the first one caused. Both are gone because cubing is no
 * longer bundled at all. `scripts/build-cubing.mjs` builds it into
 * `public/cubing/<version>/`, and `src/lib/cubing/runtime.ts` imports it at
 * runtime, so the bundler never sees it. `next dev` and `next build` now run
 * the same bundler (Turbopack). See `docs/roadmap.md`.
 *
 * The version is taken from the installed package and passed to the client so
 * the loader can build its URLs. An upgrade changes the path, so a cached old
 * copy can never mix with a new one.
 */
const nextConfig: NextConfig = {
  // The service worker (docs/pwa.md) must never be cached, or a fix to it
  // could take days to reach anyone.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
  env: {
    NEXT_PUBLIC_CUBING_VERSION: cubingVersion,
  },
};

export default nextConfig;
