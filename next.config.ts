import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { NextConfig } from "next";

// Read off disk, not via `require("cubing/package.json")` — cubing does not
// list `./package.json` in its `exports`, so the specifier form throws.
const { version: cubingVersion } = JSON.parse(
  readFileSync(join(process.cwd(), "node_modules", "cubing", "package.json"), "utf8"),
) as { version: string };

/**
 * No bundler workarounds here, deliberately.
 *
 * This file used to carry two, both for cubing.js: a `webpack` override
 * correcting lazy-chunk filenames, and an empty `turbopack` key to silence the
 * error the first one caused. Both are gone — cubing is no longer bundled at
 * all. Its ESM is served from `public/cubing/<version>/` and imported at
 * runtime (`src/lib/cubing/runtime.ts`), so neither bundler has an opinion
 * about it. See `docs/roadmap.md`.
 *
 * The version is derived from the installed package and handed to the client so
 * the loader can build its URLs — an upgrade changes the path, which means a
 * cached old copy can never be mixed with a new one.
 */
const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_CUBING_VERSION: cubingVersion,
  },
};

export default nextConfig;
