import Link from "next/link";

import { Button } from "@/components/ui/button";

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
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>CubeHub — built for the Indian cubing community.</p>
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
    </footer>
  );
}
