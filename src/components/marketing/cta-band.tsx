import { Sparkles } from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { CtaBandActions } from "@/components/marketing/cta-band-actions";
import { Eyebrow } from "@/components/marketing/section-heading";

/** Signed in, the sign-up pitch gives way to the next thing to practise (CtaBandActions). */
export function CtaBand() {
  return (
    <section className="px-4 pb-20 md:pb-28">
      <div className="reveal relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-border bg-card px-6 py-16 text-center sm:px-12 md:py-20">
        {/* Grid-paper texture and a soft glow, the same motifs as Learn. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 [background-image:linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)] opacity-60"
        />
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 size-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 blur-3xl" />

        <div className="relative flex flex-col items-center gap-5">
          <Eyebrow icon={Sparkles}>Ready when you are</Eyebrow>
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-balance text-foreground sm:text-5xl">
            Start your next practice session
          </h2>
          <CtaBandActions />
        </div>
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <Logo className="opacity-80" />
          <p className="text-xs">Built with pride for the Indian speedcubing community.</p>
        </div>
        <p className="text-xs">
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
    </footer>
  );
}
