import Link from "next/link";

import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";

/** A few popular cubes at real India ₹ ranges — sets the India-first tone. */
const FEATURED_CUBES: { name: string; price: string }[] = [
  { name: "QiYi MS 3×3", price: "₹449" },
  { name: "MoYu RS3 M V5", price: "₹649" },
  { name: "GAN 356 M", price: "₹2,499" },
];

export function CtaBand() {
  return (
    <section className="border-t border-border bg-card/30">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 py-20 text-center">
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Start your next session
        </h2>
        <p className="max-w-md text-muted-foreground">
          No account needed to time. Sign in when you want your solves on every
          device.
        </p>
        <Button size="lg" nativeButton={false} render={<Link href="/timer" />}>
          Open the timer
        </Button>
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* Featured cubes — India-first ₹ pricing. */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Featured cubes
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Priced in ₹, from sellers who actually ship in India.
            </p>
          </div>
          <Link
            href="/shop"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Browse the shop →
          </Link>
        </div>
        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          {FEATURED_CUBES.map((cube) => (
            <li key={cube.name}>
              <Link
                href="/shop"
                className="flex items-center justify-between rounded-lg border border-border bg-card/50 px-4 py-3 transition-colors hover:border-primary/40 hover:bg-card"
              >
                <span className="text-sm font-medium text-foreground">
                  {cube.name}
                </span>
                <span className="font-mono text-sm font-semibold tabular-nums text-primary">
                  {cube.price}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-col gap-3 border-t border-border/60 pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <Logo className="text-base" />
            <p className="text-xs">Built for the Indian cubing community.</p>
          </div>
          <p>
            Scrambles by{" "}
            <a
              href="https://js.cubing.net/cubing/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-foreground"
            >
              cubing.js
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
