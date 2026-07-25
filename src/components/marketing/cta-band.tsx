import Link from "next/link";
import { Sparkles } from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { ScrollFloat } from "@/components/react-bits/scroll-float";
import { Button } from "@/components/ui/button";

/** A few popular cubes at real India ₹ ranges — sets the India-first tone. */
const FEATURED_CUBES: { name: string; price: string }[] = [
  { name: "QiYi MS 3×3", price: "₹449" },
  { name: "MoYu RS3 M V5", price: "₹649" },
  { name: "GAN 356 M", price: "₹2,499" },
];

export function CtaBand() {
  return (
    <section className="relative overflow-hidden border-t border-border/60 bg-gradient-to-b from-card/40 via-card/60 to-background py-24">
      {/* Ambient center spotlight */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 transform">
        <div className="size-[400px] rounded-full bg-primary/10 opacity-70 blur-3xl" />
      </div>

      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1 text-xs font-medium text-primary shadow-xs">
          <Sparkles className="size-3.5" />
          <span>Ready when you are</span>
        </div>

        <ScrollFloat
          as="h2"
          animationDuration={0.8}
          ease="back.inOut(1.5)"
          textClassName="max-w-2xl text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent sm:text-5xl"
        >
          Start your next practice session
        </ScrollFloat>
        <p className="max-w-md text-base text-muted-foreground sm:text-lg">
          No account needed to time your solves right now. Sign in whenever you want your times seamlessly synced across all devices.
        </p>
        <div className="mt-2">
          <Button
            size="lg"
            className="rounded-full px-8 py-6 text-base font-semibold shadow-xl shadow-primary/25 transition-all duration-300 hover:shadow-primary/45 hover:scale-[1.02]"
            nativeButton={false}
            render={<Link href="/timer" />}
          >
            Open the timer
          </Button>
        </div>
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto max-w-6xl px-4 py-14">
        {/* Featured cubes — India-first ₹ pricing. */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">
              Featured cubes in ₹
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Unbiased pricing from Indian retailers with real rupee ranges and regional shipping.
            </p>
          </div>
          <Link
            href="/shop"
            className="inline-flex items-center text-sm font-semibold text-primary transition-colors hover:text-primary/80"
          >
            <span>Browse full cube catalog</span>
            <span className="ml-1 text-base font-bold">→</span>
          </Link>
        </div>

        <ul className="mt-6 grid gap-4 sm:grid-cols-3">
          {FEATURED_CUBES.map((cube) => (
            <li key={cube.name}>
              <Link
                href="/shop"
                className="group flex items-center justify-between rounded-xl border border-white/10 bg-card/60 px-5 py-4 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-card/90 hover:shadow-[0_8px_25px_-6px_rgba(20,184,166,0.18)] dark:bg-zinc-900/60"
              >
                <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                  {cube.name}
                </span>
                <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-0.5 font-mono text-xs font-bold tabular-nums text-primary shadow-xs">
                  {cube.price}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-12 flex flex-col gap-4 border-t border-border/60 pt-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1.5">
            <Logo className="text-lg" />
            <p className="text-xs text-muted-foreground/80">Built with pride for the Indian speedcubing community.</p>
          </div>
          <p className="text-xs text-muted-foreground/80">
            WCA scrambles powered by{" "}
            <a
              href="https://js.cubing.net/cubing/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-foreground underline underline-offset-4 transition-colors hover:text-primary"
            >
              cubing.js
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
