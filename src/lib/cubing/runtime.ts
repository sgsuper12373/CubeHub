/**
 * Runtime loader for cubing.js.
 *
 * cubing is **not bundled**. Its built ESM is copied into `public/cubing/<version>/`
 * by `scripts/copy-cubing.mjs` and imported from there at runtime, so no bundler
 * ever has to resolve it.
 *
 * That is the whole point. Both bundlers previously failed at the same thing —
 * locating cubing's search worker. Webpack emitted the worker entry without its
 * sibling modules; Turbopack could not satisfy any of cubing's worker-URL
 * strategies. Served as real files with their directory structure intact,
 * cubing's own `new URL("./search-worker-entry.js", import.meta.url)` resolves
 * correctly with nobody's help. See `docs/roadmap.md`.
 *
 * Types still come from the package in `node_modules` via `typeof import(...)`,
 * which is a type query and emits nothing — so the API stays fully typed while
 * the runtime dependency is a URL.
 */

/** Set from the installed package version in `next.config.ts`. */
const VERSION = process.env.NEXT_PUBLIC_CUBING_VERSION;

function entryUrl(path: string): string {
  if (!VERSION) {
    throw new Error(
      "NEXT_PUBLIC_CUBING_VERSION is unset — next.config.ts should derive it from the installed cubing package.",
    );
  }
  return `/cubing/${VERSION}/${path}`;
}

/**
 * The bundlers must leave this alone: the argument is a URL to a static asset,
 * not a module specifier they can resolve. Both ignore comments are required —
 * webpack for the production build, turbopack for dev — and the specifier is a
 * plain variable so neither attempts context resolution.
 */
async function loadModule<T>(path: string): Promise<T> {
  const url = entryUrl(path);
  return (await import(
    /* webpackIgnore: true */ /* turbopackIgnore: true */ url
  )) as T;
}

export function loadTwisty(): Promise<typeof import("cubing/twisty")> {
  return loadModule("twisty/index.js");
}

export function loadAlg(): Promise<typeof import("cubing/alg")> {
  return loadModule("alg/index.js");
}

export function loadScramble(): Promise<typeof import("cubing/scramble")> {
  return loadModule("scramble/index.js");
}
