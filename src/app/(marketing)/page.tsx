import type { Metadata } from "next";
import Link from "next/link";

import { CtaBand, SiteFooter } from "@/components/marketing/cta-band";
import { DemoTimer } from "@/components/marketing/demo-timer";
import { FeatureGrid } from "@/components/marketing/feature-grid";
import { Button } from "@/components/ui/button";

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
      {/* ── Hero ── */}
      <section className="mx-auto flex min-h-[calc(100svh-3.5rem)] max-w-6xl flex-col items-center justify-center gap-8 px-4 py-16">
        <div className="flex flex-col items-center gap-4 text-center">
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance md:text-6xl">
            Your cubing timer, and everything after it.
          </h1>
          <p className="max-w-xl text-pretty text-muted-foreground md:text-lg">
            Time a solve right here — no sign-up, no setup. Then keep the
            tutorials, stats, races and buying advice in the same place.
          </p>
        </div>

        <DemoTimer className="max-w-xl" />

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" nativeButton={false} render={<Link href="/timer" />}>
            Start timing free
          </Button>
          <Button
            size="lg"
            variant="outline"
            nativeButton={false}
            render={<Link href="/signup" />}
          >
            Create account
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          WCA-compliant scrambles · Works offline · Free forever
        </p>
      </section>

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
