import type { MetadataRoute } from "next";

import { BRAND_FALLBACK } from "@/themes/brand";

/**
 * The web app manifest (`/manifest.webmanifest`): CuberHub installs as an app
 * that opens on the timer, which also works offline (public/sw.js). Colours are
 * Slate's, from the one place raw brand colours live.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "CuberHub",
    short_name: "CuberHub",
    description: "Speedcubing timer, stats, OLL/PLL tutorials and drills. Times offline once installed.",
    start_url: "/timer",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: BRAND_FALLBACK.background,
    theme_color: BRAND_FALLBACK.background,
    categories: ["sports", "education", "utilities"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Timer", url: "/timer" },
      { name: "Daily scramble", url: "/home/daily" },
      { name: "Drill Lab", url: "/learn/333/drill" },
    ],
  };
}
