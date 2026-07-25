import type { Metadata } from "next";

import { CtaBand, SiteFooter } from "@/components/marketing/cta-band";
import { CubeShowcase } from "@/components/marketing/cube-showcase";
import { FeatureGrid } from "@/components/marketing/feature-grid";
import { HeroSection } from "@/components/marketing/hero-section";
import { ScrollFloat } from "@/components/react-bits/scroll-float";
import { ScrollReveal } from "@/components/react-bits/scroll-reveal";

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

      {/* ── Relocated Video Showcase Section (After Hero) ── */}
      <CubeShowcase />

      <FeatureGrid />

      {/* ── India band ── */}
      <section className="relative overflow-hidden border-y border-border/60 bg-gradient-to-b from-background via-card/30 to-background">
        <div className="mx-auto max-w-6xl px-4 py-24">
          <ScrollFloat
            as="h2"
            animationDuration={0.8}
            ease="back.inOut(1.5)"
            textClassName="text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent sm:text-4xl"
          >
            Built natively for cubers in India
          </ScrollFloat>
          <ScrollReveal
            as="div"
            enableBlur={true}
            baseOpacity={0.7}
            baseRotation={0}
            blurStrength={2}
            textClassName="mt-3 max-w-xl text-muted-foreground text-base sm:text-lg font-normal"
          >
            Most cubing sites price in dollars and rank you against the globe. This platform does neither.
          </ScrollReveal>

          <ul role="list" className="mt-12 grid gap-6 sm:grid-cols-3">
            <li className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-card/60 p-7 shadow-lg backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-[0_12px_40px_-10px_rgba(20,184,166,0.15)] dark:bg-zinc-900/60">
              <div>
                <span className="inline-flex size-11 items-center justify-center rounded-xl bg-primary/10 text-xl font-bold text-primary mb-5 shadow-inner border border-primary/20">
                  ₹
                </span>
                <h3 className="text-lg font-semibold text-foreground">Prices in ₹</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                  Unbiased recommendations from verified sellers who actually ship here, with real rupee ranges instead of converted MSRPs.
                </p>
              </div>
            </li>

            <li className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-card/60 p-7 shadow-lg backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-cyan-500/50 hover:shadow-[0_12px_40px_-10px_rgba(6,182,212,0.15)] dark:bg-zinc-900/60">
              <div>
                <span className="inline-flex size-11 items-center justify-center rounded-xl bg-cyan-500/10 text-lg font-bold text-cyan-400 mb-5 shadow-inner border border-cyan-500/20">
                  🏆
                </span>
                <h3 className="text-lg font-semibold text-foreground">Rankings that matter</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                  National and state leaderboards, ensuring you are measured against real competitors and friends you meet at local meets.
                </p>
              </div>
            </li>

            <li className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-card/60 p-7 shadow-lg backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-amber-500/50 hover:shadow-[0_12px_40px_-10px_rgba(245,158,11,0.15)] dark:bg-zinc-900/60">
              <div>
                <span className="inline-flex size-11 items-center justify-center rounded-xl bg-amber-500/10 text-lg font-bold text-amber-400 mb-5 shadow-inner border border-amber-500/20">
                  📅
                </span>
                <h3 className="text-lg font-semibold text-foreground">The regional calendar</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                  Upcoming official WCA competitions and independent meets across India, curated into an interactive list you can easily plan around.
                </p>
              </div>
            </li>
          </ul>
        </div>
      </section>

      <CtaBand />
      <SiteFooter />
    </>
  );
}
