/**
 * Runtime loader for cubing.js.
 *
 * cubing is **not bundled**. `scripts/build-cubing.mjs` builds a self-contained
 * copy into `public/cubing/<version>/` (on predev / prebuild), and this module
 * imports it from there at runtime. No bundler ever has to resolve it.
 *
 * That is the whole point. Both bundlers used to fail at the same thing, which
 * was locating cubing's search worker. Served as real files with the directory
 * layout intact, cubing's own `new URL("./search-worker-entry.js", import.meta.url)`
 * resolves correctly on its own. See `docs/roadmap.md`.
 *
 * Types still come from the package in `node_modules` via `typeof import(...)`.
 * That is a type query and emits nothing, so the API stays fully typed while the
 * runtime dependency is a URL. **Never add a value import from `cubing/*`
 * anywhere in `src/`.** It would put cubing back in the bundle.
 */

/** Set from the installed package version in `next.config.ts`. */
const VERSION = process.env.NEXT_PUBLIC_CUBING_VERSION;

/**
 * The bundler must leave this alone: the argument is a URL to a static asset,
 * not a module specifier it can resolve. `webpackIgnore` is honoured by both
 * webpack and Turbopack, and the specifier is a plain variable so no context
 * resolution is attempted either.
 */
function loadModule<T>(path: string): Promise<T> {
  if (!VERSION) {
    return Promise.reject(
      new Error(
        "NEXT_PUBLIC_CUBING_VERSION is unset; next.config.ts should derive it from the installed cubing package.",
      ),
    );
  }
  const url = `/cubing/${VERSION}/${path}`;
  return import(/* webpackIgnore: true */ url) as Promise<T>;
}

/**
 * Memoised so repeat callers share one in-flight import. A failed load is
 * forgotten rather than cached, so a flaky network does not break the feature
 * for the rest of the session.
 */
function lazy<T>(path: string): () => Promise<T> {
  let pending: Promise<T> | null = null;
  return () =>
    (pending ??= loadModule<T>(path).catch((error: unknown) => {
      pending = null;
      throw error;
    }));
}

export const loadTwisty = lazy<typeof import("cubing/twisty")>("twisty/index.js");
export const loadScramble = lazy<typeof import("cubing/scramble")>("scramble/index.js");
export const loadAlg = lazy<typeof import("cubing/alg")>("alg/index.js");
export const loadPuzzles = lazy<typeof import("cubing/puzzles")>("puzzles/index.js");
