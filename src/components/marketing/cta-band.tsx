import Link from "next/link";

import { Logo } from "@/components/layout/logo";
import { CtaBandActions } from "@/components/marketing/cta-band-actions";
import { FloatingField } from "@/components/marketing/motion/floating-field";
import { RevealText } from "@/components/marketing/motion/reveal-text";
import { COMMUNITY_LINKS, CONTRIBUTE_URL } from "@/content/community";
import { appHref } from "@/lib/marketing/links";

/**
 * The last screen (docs/landing-plan.md → Final call to action): one line,
 * two buttons (signed in, the sign-up pitch gives way to the drill;
 * CtaBandActions), and the hero's cube field again, faintly.
 */
export function CtaBand() {
  return (
    <section
      className="relative isolate flex min-h-[100svh] items-center justify-center overflow-hidden px-4 py-24"
    >
      <FloatingField className="-z-10 opacity-40" intensity={0.5} />
      <div aria-hidden className="pointer-events-none absolute top-1/2 left-1/2 -z-10 size-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/12 blur-3xl" />
      <div className="flex max-w-3xl flex-col items-center gap-6 text-center">
        <RevealText
          as="h2"
          text="Your next PB starts here."
          className="text-4xl font-bold tracking-tight text-balance text-foreground sm:text-6xl"
        />
        <CtaBandActions />
      </div>
    </section>
  );
}

type FooterLink = { label: string; href: string; external?: boolean };

const SOCIAL: FooterLink[] = COMMUNITY_LINKS.filter((l) => l.url).map((l) => ({ label: l.name, href: l.url!, external: true }));

const COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Timer", href: appHref("/timer") },
      { label: "Learn", href: appHref("/learn") },
      { label: "Drill Lab", href: appHref("/learn/333/drill") },
      { label: "Playground", href: appHref("/playground") },
      { label: "Stats", href: appHref("/stats") },
    ],
  },
  { title: "Community", links: [{ label: "Clubs", href: appHref("/clubs") }, ...SOCIAL] },
  {
    title: "Company",
    links: [
      { label: "Roadmap", href: "/roadmap" },
      { label: "About", href: "/about" },
      ...(CONTRIBUTE_URL ? [{ label: "Contribute", href: CONTRIBUTE_URL, external: true }] : []),
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
];

/** The marketing footer (docs/landing-plan.md → Final call to action and footer). */
export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div className="flex flex-col gap-2">
          <Link href="/" aria-label="CuberHub home" className="w-fit rounded-md">
            <Logo />
          </Link>
          <p className="text-sm text-muted-foreground">The unified cubing platform</p>
          <p className="mt-2 text-xs text-muted-foreground">Built with pride for the Indian speedcubing community.</p>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <p className="text-sm font-semibold text-foreground">{col.title}</p>
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {col.links.map((l) => (
                <li key={l.label}>
                  {l.external ? (
                    <a href={l.href} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                      {l.label}
                    </a>
                  ) : (
                    <Link href={l.href} className="text-muted-foreground hover:text-foreground">
                      {l.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-border/60">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-muted-foreground">
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
