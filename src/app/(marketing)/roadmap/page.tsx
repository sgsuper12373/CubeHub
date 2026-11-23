import type { Metadata } from "next";

import { ProsePage } from "@/components/marketing/prose-page";
import { RoadmapBoard } from "@/components/marketing/roadmap-board";

export const metadata: Metadata = {
  title: "Roadmap | CuberHub",
  description: "What's live in CuberHub, what's being built, and what's next: Cubby, BLD mode, daily scrambles, races, smart cubes and more.",
  alternates: { canonical: "/roadmap" },
};

/** The full roadmap, from the same source as the landing page's board (src/content/roadmap.ts). */
export default function RoadmapPage() {
  return (
    <ProsePage
      eyebrow="Roadmap"
      title="What's live, what's next."
      lead="CuberHub is built in the open. Here's what you can use today, what's being built, and what's on the list."
    >
      <div className="-mx-4 sm:mx-0">
        <RoadmapBoard headingLevel={2} />
      </div>
    </ProsePage>
  );
}
