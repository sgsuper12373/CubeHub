import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { SHOW_CUBBY } from "@/lib/companion/flag";
import { SITE_URL } from "@/lib/site-url";

import { CommunitySection } from "@/components/marketing/community-section";
import { CtaBand, SiteFooter } from "@/components/marketing/cta-band";
import { LazyCustomizeSection } from "@/components/marketing/customize-section-lazy";
import { FaqSection, faqJsonLd } from "@/components/marketing/faq-section";
import { HeroSection } from "@/components/marketing/hero-section";
import { RoadmapSection } from "@/components/marketing/roadmap-section";

// Below the fold: its own chunk, still server-rendered (the chapter text is for search engines too).
const FeatureChapters = dynamic(() =>
  import("@/components/marketing/feature-chapters").then((m) => m.FeatureChapters),
);

/** Landing step 10, behind NEXT_PUBLIC_SHOW_CUBBY: not even loaded when the flag is off. */
const MeetCubby = SHOW_CUBBY ? dynamic(() => import("@/components/marketing/meet-cubby").then((m) => m.MeetCubby)) : null;

/** Static, refreshed hourly so the real-stats slot (components/marketing/real-stats.tsx) stays current. */
export const revalidate = 3600;

export const metadata: Metadata = {
  title: { absolute: "CuberHub: Speedcubing Timer, OLL/PLL Tutorials and Drills" },
  description:
    "A free WCA speedcubing timer, every OLL and PLL in 3D, a drill that finds your slow cases, and clubs for Indian cubers. No sign-up needed to start.",
  alternates: { canonical: "/" },
};

/** WebApplication and Organization structured data (docs/landing-plan.md → SEO and sharing). */
const SITE_JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "CuberHub",
    url: SITE_URL,
    applicationCategory: "GameApplication",
    operatingSystem: "Any (web browser)",
    description: "Speedcubing timer, OLL and PLL tutorials in 3D, algorithm drills, profiles and clubs.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "CuberHub",
    url: SITE_URL,
    logo: `${SITE_URL}/apple-icon.png`,
  },
];


/**
 * Sections (docs/landing-plan.md → Page structure): hero → five feature
 * chapters (the Timer one holds the live "try a solve" demo) → make it yours → built for India → roadmap
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
      <FeatureChapters />
      {MeetCubby && <MeetCubby />}
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(SITE_JSON_LD).replace(/</g, "\\u003c") }}
      />
    </>
  );
}
