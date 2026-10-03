import type { Metadata } from "next";

import { CtaBand, SiteFooter } from "@/components/marketing/cta-band";
import { CustomizeSection } from "@/components/marketing/customize-section";
import { FeatureBento } from "@/components/marketing/feature-bento";
import { HeroSection } from "@/components/marketing/hero-section";
import { IndiaSection } from "@/components/marketing/india-section";

export const metadata: Metadata = {
  title: "CubeHub — Speedcubing Timer, Tutorials & Competitions",
  description:
    "A speedcubing timer that works the moment you land — WCA scrambles, inspection, sessions and stats. Plus tutorials, ranked racing, and cube recommendations in ₹.",
};

/**
 * Hero (timer replay + opt-in try-it) → the product as a bento → real
 * settings to tweak → India → CTA. The landing page never captures Space or
 * touches unless the visitor asks it to; see `hero-timer-card.tsx`.
 */
export default function Home() {
  return (
    <>
      <HeroSection />
      <FeatureBento />
      <CustomizeSection />
      <IndiaSection />
      <CtaBand />
      <SiteFooter />
    </>
  );
}
