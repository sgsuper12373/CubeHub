"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

import { DemoTimer } from "@/components/marketing/demo-timer";
import { Button } from "@/components/ui/button";

// Dynamic import with SSR disabled to ensure zero initial server script load and immediate hydration
const ScrambleMatrix = dynamic(
  () => import("@/components/react-bits/scramble-matrix").then((m) => m.ScrambleMatrix),
  {
    ssr: false,
    loading: () => <div className="size-full" />,
  },
);

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-background pt-12 pb-20 md:py-28 lg:py-32">
      {/* ── Interactive WCA Scramble Matrix (Single Canvas DOM element for 60fps performance & 0 CLS) ── */}
      <div className="absolute inset-0 z-0 opacity-90 [mask-image:radial-gradient(circle_at_50%_45%,rgba(0,0,0,1)_55%,rgba(0,0,0,0.1)_95%)] pointer-events-auto">
        <ScrambleMatrix className="size-full" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center gap-8 px-4 text-center">
        {/* ── Headline & Subtitle ── */}
        <div className="flex flex-col items-center gap-4 max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight text-balance bg-gradient-to-br from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent sm:text-6xl lg:text-7xl">
            Your cubing timer, and everything after it.
          </h1>
          <p className="max-w-xl text-pretty text-base text-muted-foreground sm:text-lg md:text-xl font-normal leading-relaxed">
            Time a solve right here — no sign-up, no setup. Then keep your
            tutorials, stats, real-time races, and unbiased buying advice in one unified place.
          </p>
        </div>

        {/* ── Centered Interactive Demo Timer ── */}
        <div className="w-full max-w-lg mt-2 mb-2">
          <DemoTimer className="w-full" />
        </div>

        {/* ── Primary Action Buttons ── */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button
            size="lg"
            className="rounded-full px-8 py-6 text-base font-semibold shadow-lg shadow-primary/20 transition-all duration-300 hover:shadow-primary/40 hover:scale-[1.02]"
            nativeButton={false}
            render={<Link href="/timer" />}
          >
            Start timing free
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="rounded-full border-white/20 bg-background/60 px-8 py-6 text-base font-semibold backdrop-blur-md transition-all duration-300 hover:border-white/40 hover:bg-white/10 hover:scale-[1.02]"
            nativeButton={false}
            render={<Link href="/signup" />}
          >
            Create account
          </Button>
        </div>

        {/* ── Trust Factors ── */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-2 text-xs font-medium text-muted-foreground/80">
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-emerald-500" /> WCA-compliant scrambles
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-cyan-500" /> Works 100% offline
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-amber-500" /> Free forever
          </span>
        </div>
      </div>
    </section>
  );
}
