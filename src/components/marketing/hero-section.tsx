"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, IndianRupee, Pause, Play, ShieldCheck, Sparkles, WifiOff } from "lucide-react";
import { useState } from "react";

import { HeroTimerCard } from "@/components/marketing/hero-timer-card";
import { Eyebrow } from "@/components/marketing/section-heading";
import { Button } from "@/components/ui/button";

// Client-only canvas; nothing for the server to render.
const ScrambleMatrix = dynamic(
  () => import("@/components/react-bits/scramble-matrix").then((m) => m.ScrambleMatrix),
  { ssr: false, loading: () => <div className="size-full" /> },
);

const TRUST = [
  { icon: ShieldCheck, label: "WCA random-state scrambles" },
  { icon: WifiOff, label: "Works offline" },
  { icon: IndianRupee, label: "Built for India" },
] as const;

export function HeroSection() {
  const [paused, setPaused] = useState(false);

  return (
    <section className="relative isolate overflow-hidden bg-background">
      {/* Interactive notation field. Decorative and pointer-events-none, so it
          never eats a tap or a scroll; it fades out towards the copy. */}
      <div className="absolute inset-0 -z-10 opacity-80 [mask-image:radial-gradient(ellipse_at_70%_40%,black_35%,transparent_80%)] max-lg:[mask-image:radial-gradient(ellipse_at_50%_70%,black_25%,transparent_75%)]">
        <ScrambleMatrix className="size-full" paused={paused} />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 size-[36rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-12 pb-16 md:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-28">
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <Eyebrow icon={Sparkles}>Free · No sign-up · Ready in seconds</Eyebrow>

          <h1 className="mt-5 text-4xl font-bold tracking-tight text-balance text-foreground sm:text-6xl lg:text-[4.25rem] lg:leading-[1.02]">
            Your cubing timer, <span className="text-primary">and everything after it.</span>
          </h1>

          <p className="mt-5 max-w-xl text-base text-pretty text-muted-foreground sm:text-lg md:text-xl md:leading-relaxed">
            Time a solve the moment you land. Then track every average, learn
            OLL and PLL with 3D cases, drill your weakest algorithms, and find
            your next cube in ₹ — all in one place.
          </p>

          <div className="mt-8 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
            <Button
              size="lg"
              className="h-12 rounded-full px-7 text-base font-semibold shadow-lg shadow-primary/25 hover:bg-primary/90"
              nativeButton={false}
              render={<Link href="/timer" />}
            >
              Start timing free
              <ArrowRight data-icon="inline-end" className="size-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 rounded-full bg-background/60 px-7 text-base font-semibold backdrop-blur"
              nativeButton={false}
              render={<Link href="/learn" />}
            >
              Explore tutorials
            </Button>
          </div>

          <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground lg:justify-start">
            {TRUST.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-1.5">
                <Icon className="size-4 text-primary" aria-hidden />
                {label}
              </li>
            ))}
          </ul>
        </div>

        <HeroTimerCard className="mx-auto max-w-md lg:max-w-none" />
      </div>

      {/* Visitors decide whether the background moves. */}
      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        aria-pressed={paused}
        className="absolute right-4 bottom-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-background/70 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
      >
        {paused ? <Play className="size-3.5" aria-hidden /> : <Pause className="size-3.5" aria-hidden />}
        {paused ? "Animate background" : "Pause background"}
      </button>
    </section>
  );
}
