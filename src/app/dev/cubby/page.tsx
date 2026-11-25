import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CubbyReview } from "@/components/cubby/cubby-review";
import { SHOW_CUBBY } from "@/lib/companion/flag";

export const metadata: Metadata = {
  title: "Cubby review — CuberHub",
  robots: { index: false, follow: false },
};

/**
 * Every expression, trigger and input of Cubby's v0 art, for review
 * (docs/companion-plan.md step 2). Unlinked; 404 unless the companion flag is on.
 */
export default function CubbyDevPage() {
  if (!SHOW_CUBBY) notFound();
  return <CubbyReview />;
}
