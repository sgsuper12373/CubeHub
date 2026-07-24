import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
