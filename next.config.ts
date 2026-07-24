import type { NextConfig } from "next";

/**
 * Deliberately empty.
 *
 * This file used to carry two stacked workarounds for cubing.js 0.56's
 * bundling: a `webpack` override correcting lazy-chunk filenames, and an empty
 * `turbopack` key to stop Next erroring about the presence of the first. Both
 * existed because the Turbopack build hung and the build was pinned to webpack.
 *
 * cubing.js 0.63 removed the cause. The Turbopack build completes in ~9s, the
 * `--webpack` pin is gone from package.json, and dev and production run the
 * same bundler again — so neither workaround has anything left to do.
 */
const nextConfig: NextConfig = {};

export default nextConfig;
