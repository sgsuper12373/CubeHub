import { Map as MapIcon } from "lucide-react";

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
      className="mx-auto flex min-h-[100svh] w-full max-w-6xl scroll-mt-16 flex-col justify-center gap-12 px-4 py-20"
    >
      <SectionHeading
        id="roadmap-heading"
        eyebrow="Roadmap"
        icon={MapIcon}
        title="What's live, what's next."
        lead="Built in the open. What you can use today, what's being built, and what's on the list."
      />
      <RoadmapBoard />
    </section>
  );
}
