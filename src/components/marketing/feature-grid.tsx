import Link from "next/link";

import { ScrollFloat } from "@/components/react-bits/scroll-float";
import { ScrollReveal } from "@/components/react-bits/scroll-reveal";
import { navItems } from "@/lib/navigation";

/**
 * The four product surfaces. Icons and hrefs come from `navItems` so this
 * can never drift from the actual navigation.
 */

const BLURBS: Record<string, { heading: string; body: string }> = {
  "/timer": {
    heading: "Timer & Stats",
    body: "WCA random-state scrambles, inspection with voice callouts, +2 and DNF, named sessions. Works offline and syncs when you sign in.",
  },
  "/learn": {
    heading: "Learn",
    body: "Beginner method through full CFOP — every OLL and PLL case with a 3D viewer, multiple algorithms, and drills that put your weakest cases first.",
  },
  "/compete": {
    heading: "Competitive Racing",
    body: "Race the clock against other cubers, climb the India leaderboard, and link your WCA ID. Always free.",
  },
  "/shop": {
    heading: "Buy Cubes",
    body: "Tell us your level and budget in ₹, get three cubes that actually suit you — with a plain-English reason for each.",
  },
};

export function FeatureGrid() {
  const items = navItems.filter((item) => item.href in BLURBS);

  return (
    <section className="relative mx-auto max-w-6xl px-4 py-24">
      <div className="flex flex-col items-start gap-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary mb-2 shadow-xs">
          <span>All-in-One Ecosystem</span>
        </div>

        <ScrollFloat
          as="h2"
          animationDuration={0.8}
          ease="back.inOut(1.5)"
          textClassName="text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent sm:text-4xl md:text-5xl"
        >
          Everything in one unified place
        </ScrollFloat>
        <ScrollReveal
          as="div"
          enableBlur={true}
          baseOpacity={0.7}
          baseRotation={0}
          blurStrength={2}
          textClassName="mt-2 max-w-2xl text-muted-foreground text-base sm:text-lg font-normal"
        >
          No more juggling a timer in one tab, a clumsy tutorial blog in another, and scattered forum threads just to work out which cube to buy next.
        </ScrollReveal>
      </div>

      <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(({ href, icon: Icon }) => {
          const { heading, body } = BLURBS[href];
          return (
            <li key={href} className="h-full">
              <Link
                href={href}
                className="group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-card/60 p-7 shadow-lg backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/50 hover:bg-card/90 hover:shadow-[0_16px_40px_-12px_rgba(20,184,166,0.25)] dark:bg-zinc-900/60"
              >
                <div>
                  <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/25 transition-all duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-[0_0_20px_rgba(20,184,166,0.4)] mb-6">
                    <Icon className="size-6" aria-hidden />
                  </span>
                  <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                    {heading}
                  </h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                    {body}
                  </p>
                </div>

                <div className="mt-8 flex items-center text-xs font-semibold text-primary/80 transition-colors group-hover:text-primary">
                  <span>Explore feature</span>
                  <span className="ml-1 text-sm font-bold transition-transform duration-300 group-hover:translate-x-1.5">
                    →
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
