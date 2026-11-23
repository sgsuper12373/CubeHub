import Link from "next/link";

import { HomeCard } from "@/components/home/home-card";
import { buttonVariants } from "@/components/ui/button";

/*
 * Home cards with no data of their own. Kept apart from the data cards so the
 * guest Home (a client component) can render them without pulling in a
 * server-only DAL.
 */

/** The empty state, and the whole card for guests: where most cubers should start. */
export function LearningStartCard() {
  return (
    <HomeCard id="learning" title="Continue learning" seeAll={{ href: "/learn", label: "All of Learn" }}>
      <p className="text-sm text-muted-foreground">
        Start with PLL: 21 cases, the biggest jump for most cubers.
      </p>
      <Link href="/learn/333/pll" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
        Open PLL
      </Link>
    </HomeCard>
  );
}

/** For anyone who hasn't drilled yet: what the Drill Lab is for. */
export function DrillIntroCard() {
  return (
    <HomeCard id="drill" title="Drill queue" seeAll={{ href: "/learn/333/drill", label: "Drill Lab" }}>
      <p className="text-sm text-muted-foreground">
        Add cases from Learn to start drilling. The Drill Lab times every rep, finds your slow cases and tells you
        when another algorithm is faster for your hands.
      </p>
      <Link href="/learn/333/drill" className={buttonVariants({ size: "sm", variant: "outline", className: "mt-3" })}>
        Open Drill Lab
      </Link>
    </HomeCard>
  );
}

