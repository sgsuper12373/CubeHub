"use client";

import dynamic from "next/dynamic";

import type { CubbyDock as CubbyDockType } from "@/components/cubby/dock";

/**
 * Lazy entry points for Cubby, rendered only behind NEXT_PUBLIC_SHOW_CUBBY.
 * `ssr: false` keeps the companion out of the server render and loads it
 * after hydration (docs/cubby-cubing-companion.md → Build notes).
 */
export const CubbyMount = dynamic(() => import("@/components/cubby/companion-root"), { ssr: false });

export const CubbyDockSlot = dynamic<React.ComponentProps<typeof CubbyDockType>>(
  () => import("@/components/cubby/dock").then((m) => m.CubbyDock),
  { ssr: false },
);
