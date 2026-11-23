import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { ComingNext } from "@/components/marketing/coming-next";
import { CtaBand, SiteFooter } from "@/components/marketing/cta-band";
import { LazyCustomizeSection } from "@/components/marketing/customize-section-lazy";
import { HeroSection } from "@/components/marketing/hero-section";
import { TrySolveSection } from "@/components/marketing/try-solve-section";

// Below the fold: its own chunk, still server-rendered (the chapter text is for search engines too).
const FeatureChapters = dynamic(() =>
  import("@/components/marketing/feature-chapters").then((m) => m.FeatureChapters),
);

export const metadata: Metadata = {
  title: "CuberHub — Speedcubing Timer, Tutorials & Stats",
  description:
    "A speedcubing timer that works the moment you land — WCA scrambles, inspection, sessions and stats. Plus OLL and PLL tutorials, an algorithm drill and cuber profiles.",
};

/**
 * Hero (timer replay + opt-in try-it) → the product as a bento → real
 * settings to tweak → CTA → one "Coming next" strip. Only what ships today is
 * advertised above the strip. The landing page never captures Space or
 * touches unless the visitor asks it to; see `hero-timer-card.tsx`.
 *
 * Statically rendered: nothing here or in the layouts reads cookies. What
 * depends on the visitor (navbar, CTA copy) is filled in on the client.
 */
export default function Home() {
  return (
    <>
      <HeroSection />
      <TrySolveSection />
      <FeatureChapters />
      <LazyCustomizeSection />
      <CtaBand />
      <ComingNext />
      <SiteFooter />
    </>
  );
}
