"use client";

import dynamic from "next/dynamic";

import { useNearViewport } from "@/hooks/use-near-viewport";

/**
 * CustomizeSection, loaded only when a visitor scrolls near it. It sits two
 * screens below the hero, and its code (plus Paper's timer font, which its
 * theme preview renders) isn't needed for first paint.
 */

const CustomizeSection = dynamic(
  () => import("@/components/marketing/customize-section").then((m) => m.CustomizeSection),
  { ssr: false, loading: () => <Placeholder /> },
);

/**
 * The section's own box (id, borders, background) at its rendered height per
 * breakpoint, so nothing below it moves when it loads. Heights measured
 * 2026-10-20 from 320 to 1536px wide (Slate and Paper alike); text wrap moves
 * them by up to ~60px within a breakpoint. The swap happens about a screen before the
 * section is in view, so a stale height only shifts content off screen, but
 * re-measure when the section's layout changes.
 */
function Placeholder({ ref }: { ref?: React.Ref<HTMLElement> }) {
  return (
    <section
      ref={ref}
      id="customize"
      aria-busy="true"
      className="relative h-[1590px] scroll-mt-20 overflow-hidden border-y border-border/60 bg-card/40 sm:h-[1512px] md:h-[1546px] lg:h-[1031px]"
    />
  );
}

export function LazyCustomizeSection() {
  const [ref, near] = useNearViewport<HTMLElement>();
  return near ? <CustomizeSection /> : <Placeholder ref={ref} />;
}
