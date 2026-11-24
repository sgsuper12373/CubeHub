import { ArrowRight, Map as MapIcon } from "lucide-react";
import Link from "next/link";

import { RoadmapBoard } from "@/components/marketing/roadmap-board";
import { SectionHeading } from "@/components/marketing/section-heading";
import { WaitlistForm } from "@/components/marketing/waitlist-form";

/**
 * The roadmap (docs/landing-plan.md → section 7): Now, Next and Later from
 * src/content/roadmap.ts, then the "Notify me" waitlist form (a client
 * island, so the section stays static).
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
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card/60 p-5 sm:p-6">
        <h3 className="text-lg font-semibold text-foreground">Get told when the next thing ships</h3>
        <WaitlistForm source="landing-roadmap" />
      </div>
    </section>
  );
}
