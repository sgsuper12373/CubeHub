import { ArrowRight, Map as MapIcon } from "lucide-react";
import Link from "next/link";

import { RoadmapBoard } from "@/components/marketing/roadmap-board";
import { SectionHeading } from "@/components/marketing/section-heading";

/**
 * The roadmap (docs/landing-plan.md → section 7): Now, Next and Later from
 * src/content/roadmap.ts. The plan's "Notify me" waitlist form isn't here yet:
 * its migration and server action exist (supabase/migrations/…_waitlist.sql,
 * src/lib/waitlist/actions.ts) but aren't live, and a form that can only fail
 * would be worse than none.
 */
export function RoadmapSection() {
  return (
    <section
      id="roadmap"
      aria-labelledby="roadmap-heading"
      className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16 md:py-20"
    >
      <SectionHeading
        id="roadmap-heading"
        eyebrow="Roadmap"
        icon={MapIcon}
        title="What's live, what's next."
        lead="Built in the open. What you can use today, what's being built, and what's on the list."
      />
      <RoadmapBoard compact />
      <Link href="/roadmap" className="-mt-4 inline-flex items-center gap-1.5 self-start text-sm font-semibold text-primary hover:underline">
        The full roadmap, with details
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </section>
  );
}
