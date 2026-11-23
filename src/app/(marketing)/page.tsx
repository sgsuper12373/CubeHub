import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { CommunitySection } from "@/components/marketing/community-section";
import { CtaBand, SiteFooter } from "@/components/marketing/cta-band";
import { LazyCustomizeSection } from "@/components/marketing/customize-section-lazy";
import { FaqSection, faqJsonLd } from "@/components/marketing/faq-section";
import { HeroSection } from "@/components/marketing/hero-section";
import { RoadmapSection } from "@/components/marketing/roadmap-section";
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
 * Full-screen chapters (docs/landing-plan.md → Page structure): hero → try a
 * solve → five feature chapters → make it yours → built for India → roadmap
 * → FAQ → final call to action and footer. The landing page never captures
 * Space or touches unless the visitor asks it to; see `hero-timer-card.tsx`.
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
      <CommunitySection />
      <RoadmapSection />
      <FaqSection />
      <CtaBand />
      <SiteFooter />
      <script
        type="application/ld+json"
        // JSON.stringify output, with "<" escaped so no string can close the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd()).replace(/</g, "\\u003c") }}
      />
    </>
  );
}
