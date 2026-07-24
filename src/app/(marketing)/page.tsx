import type { Metadata } from "next";

import { CtaBand, SiteFooter } from "@/components/marketing/cta-band";
import { FeatureGrid } from "@/components/marketing/feature-grid";
import { HeroSection } from "@/components/marketing/hero-section";

export const metadata: Metadata = {
  title: "CubeHub — Speedcubing Timer, Tutorials & Competitions",
  description:
    "A speedcubing timer that works the moment you land — WCA scrambles, inspection, sessions and stats. Plus tutorials, ranked racing, and cube recommendations in ₹.",
};

/**
 * The landing page leads with a working timer rather than a screenshot of one:
 * the visitor can hold Space and record a solve before reading a word. See
 * `demo-timer.tsx` for why it shares no state with the real timer.
 */
export default function Home() {
  return (
    <>
      <HeroSection />

      <FeatureGrid />

      {/* ── India band ── */}
      <section className="border-y border-border bg-card/30">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Built for cubers in India
          </h2>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Most cubing sites price in dollars and rank you against the world.
            This one does neither.
          </p>
          <dl className="mt-10 grid gap-8 sm:grid-cols-3">
            <div>
              <dt className="font-semibold">Prices in ₹</dt>
              <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Recommendations from sellers who actually ship here, with real
                rupee ranges instead of converted MSRP.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">Rankings that mean something</dt>
              <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">
                National and state leaderboards, so you are measured against
                cubers you might actually meet at a comp.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">The local calendar</dt>
              <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Upcoming WCA competitions in India, in one list you can plan
                around.
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <CtaBand />
      <SiteFooter />
    </>
  );
}
