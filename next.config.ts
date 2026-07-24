import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack needs no custom configuration; this empty object is here to say
  // so deliberately. Next 16 errors on startup when it finds a `webpack` config
  // and no `turbopack` one, on the assumption the webpack config was meant to
  // be migrated. It wasn't: the two bundlers are doing different jobs here —
  // `next dev` runs Turbopack, `npm run build` is pinned to `--webpack` because
  // the Turbopack build hangs, and the override below applies only to the
  // latter. Removing this line brings the startup error back; removing the
  // whole split is tracked in docs/roadmap.md → "One bundler for dev and
  // production".
  turbopack: {},

  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Align lazy-chunk filenames with the ids the runtime actually requests.
      //
      // Next names split chunks with `[name]`, but `optimization.chunkIds` is
      // "deterministic" in production, so every chunk also gets a numeric id —
      // and `__webpack_require__.u` builds its URLs from that id. For most
      // chunks the two agree. For a chunk carrying its own runtime they do not:
      // cubing.js's worker chunk was written as `ab984c7b.<hash>.js` while the
      // runtime asked for `9301.<hash>.js`, so the `cubing/twisty` dynamic
      // import 404'd and next/dynamic sat on its loading state forever — the
      // landing hero and the scramble preview both spun indefinitely in every
      // production build. It only worked in dev because `next dev` is Turbopack.
      //
      // This is the same cubing-worker chunking that hangs the Turbopack build
      // (see docs/roadmap.md); templating on `[id]` makes the two agree.
      config.output.chunkFilename = "static/chunks/[id].[contenthash].js";
    }
    return config;
  },
};

export default nextConfig;
