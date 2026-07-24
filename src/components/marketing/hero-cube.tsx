"use client";

import dynamic from "next/dynamic";

import { CubeLoader } from "@/components/ui/cube-loader";

/**
 * Deferred (`ssr:false`) wrapper for the hero's <twisty-player>. The heavy
 * cubing/twisty chunk loads only after first paint, so the headline, timer card
 * and CTAs are interactive before the cube arrives — the cube is progressive
 * enhancement. While it loads, the branded <CubeLoader/> stands in.
 */
const HeroCubeInner = dynamic(
  () => import("./hero-cube-inner").then((m) => m.HeroCubeInner),
  {
    ssr: false,
    loading: () => (
      <div className="grid size-[260px] place-items-center">
        <CubeLoader size={56} label="Loading cube" />
      </div>
    ),
  },
);

export function HeroCube(props: {
  mode: "solve" | "idle";
  size?: number;
  onReady?: () => void;
  onSolved?: () => void;
}) {
  return <HeroCubeInner {...props} />;
}
