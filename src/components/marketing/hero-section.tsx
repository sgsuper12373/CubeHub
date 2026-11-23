"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, IndianRupee, Pause, Play, ShieldCheck, WifiOff } from "lucide-react";
import { useState } from "react";

import { BrandLockup } from "@/components/layout/logo";
import { FadeUp } from "@/components/marketing/motion/fade-up";
import { FloatingField } from "@/components/marketing/motion/floating-field";
import { RevealText } from "@/components/marketing/motion/reveal-text";
import { buttonVariants } from "@/components/ui/button";
import { appHref } from "@/lib/marketing/links";
import { cn } from "@/lib/utils";

// Client-only canvas; nothing for the server to render.
const ScrambleMatrix = dynamic(
  () => import("@/components/react-bits/scramble-matrix").then((m) => m.ScrambleMatrix),
  { ssr: false, loading: () => <div className="size-full" /> },
);

/**
 * The hero lockup's palette. "classic" is the original blue C / orange H;
 * "theme" follows the active theme like the logo everywhere else.
 */
const LANDING_LOGO_STYLE: "classic" | "theme" = "classic";

/**
 * The hero headline (docs/landing-plan.md → Hero, open question 1). The other
 * two candidates, for A/B tests later: "Time it. Learn it. Drill it. Share
 * it." and "Your whole cubing practice, in one tab."
 */
export const HERO_HEADLINE = "Every part of cubing. One hub.";

const TRUST = [
  { icon: ShieldCheck, label: "WCA random-state scrambles" },
  { icon: WifiOff, label: "Works offline" },
  { icon: IndianRupee, label: "Built for India" },
] as const;

/**
 * The first screen (docs/landing-plan.md → Hero). Motion, all CSS so the text
 * and buttons need no JavaScript: the mark's wireframe draws in, the wordmark
 * fades up, the headline reveals word by word, then the buttons; under 1.6 s
 * in all. Behind it: the notation field and the floating cube pieces.
 */
export function HeroSection() {
  const [paused, setPaused] = useState(false);

  return (
    <section
      data-logo={LANDING_LOGO_STYLE === "classic" ? "classic" : undefined}
      className="relative isolate -mt-14 flex min-h-[100svh] items-center overflow-hidden bg-background pt-14"
    >
      {/* Interactive notation field. Decorative and pointer-events-none, so it
          never eats a tap or a scroll; it fades out towards the copy. */}
      <div className="absolute inset-0 -z-10 opacity-80 [mask-image:radial-gradient(ellipse_at_70%_40%,black_35%,transparent_80%)] max-lg:[mask-image:radial-gradient(ellipse_at_50%_70%,black_25%,transparent_75%)]">
        <ScrambleMatrix className="size-full" paused={paused} />
      </div>
      <FloatingField className="-z-10" />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 size-[36rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="mx-auto w-full max-w-4xl px-4 py-12 md:py-16">
        <div className="flex flex-col items-center text-center">
          {/* Stacks below sm: same as `stacked`, without a second copy in the DOM. */}
          <BrandLockup className="hero-lockup max-sm:flex-col max-sm:text-center" />

          <RevealText
            as="h1"
            text={HERO_HEADLINE}
            trigger="load"
            delayMs={650}
            staggerMs={45}
            className="mt-10 max-w-3xl text-4xl font-bold tracking-tight text-balance text-foreground sm:text-5xl lg:text-7xl"
          />

          <FadeUp trigger="load" delayMs={1000}>
            <p className="mx-auto mt-5 max-w-2xl text-base text-pretty text-muted-foreground sm:text-lg md:text-xl md:leading-relaxed">
              A fast WCA timer, every OLL and PLL in 3D, a drill that finds your slow cases, and friends
              to race. Free, and built for Indian cubers.
            </p>
          </FadeUp>

          <FadeUp
            trigger="load"
            delayMs={1150}
            className="mt-8 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center"
          >
            <Link
              href={appHref("/timer")}
              className={cn(buttonVariants({ size: "lg" }), "h-12 rounded-full px-7 text-base font-semibold shadow-lg shadow-primary/25 hover:bg-primary/90")}
            >
              Start timing free
              <ArrowRight data-icon="inline-end" className="size-4" />
            </Link>
            <Link
              href={appHref("/learn")}
              className={cn(buttonVariants({ size: "lg", variant: "outline" }), "h-12 rounded-full bg-background/60 px-7 text-base font-semibold backdrop-blur")}
            >
              Explore Learn
            </Link>
          </FadeUp>

          <FadeUp trigger="load" delayMs={1300} as="div" className="mt-8">
            <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {TRUST.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-1.5">
                  <Icon className="size-4 text-primary" aria-hidden />
                  {label}
                </li>
              ))}
            </ul>
          </FadeUp>
        </div>
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
