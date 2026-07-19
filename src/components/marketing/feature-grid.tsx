import Link from "next/link";

import { navItems } from "@/lib/navigation";

/**
 * The four product surfaces. Icons and hrefs come from `navItems` so this
 * can never drift from the actual navigation.
 */

const BLURBS: Record<string, { heading: string; body: string }> = {
  "/timer": {
    heading: "Timer",
    body: "WCA random-state scrambles, inspection with voice callouts, +2 and DNF, named sessions. Works offline and syncs when you sign in.",
  },
  "/learn": {
    heading: "Learn",
    body: "Beginner method through full CFOP — every OLL and PLL case with a 3D viewer, multiple algorithms, and drills that put your weakest cases first.",
  },
  "/compete": {
    heading: "Compete",
    body: "Race the clock against other cubers, climb the India leaderboard, and link your WCA ID. Always free.",
  },
  "/shop": {
    heading: "Shop",
    body: "Tell us your level and budget in ₹, get three cubes that actually suit you — with a plain-English reason for each.",
  },
};

export function FeatureGrid() {
  const items = navItems.filter((item) => item.href in BLURBS);

  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
        Everything in one place
      </h2>
      <p className="mt-2 max-w-xl text-muted-foreground">
        No more juggling a timer in one tab, a tutorial site in another, and a
        forum thread to work out which cube to buy.
      </p>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {items.map(({ href, icon: Icon }) => {
          const { heading, body } = BLURBS[href];
          return (
            <li key={href}>
              <Link
                href={href}
                className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-card/50 p-6 transition-colors hover:border-primary/40 hover:bg-card"
              >
                <Icon className="size-5 text-primary" aria-hidden />
                <h3 className="font-semibold">{heading}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {body}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
