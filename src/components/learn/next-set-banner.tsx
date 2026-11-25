import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

import { getProfile } from "@/lib/auth/dal";
import { nextSetLine } from "@/lib/learn/next-set";
import { getNextSet } from "@/lib/learn/next-set-data";

/**
 * "Up next for you" on /learn: the set a signed-in cuber should open next
 * (lib/learn/next-set.ts). Guests see nothing here; the hero already says
 * where to start.
 */
export async function NextSetBanner() {
  const profile = await getProfile();
  if (!profile) return null;
  const next = await getNextSet(profile.username);
  if (!next) return null;
  return (
    <Link
      href={`/learn/${next.puzzle}/${next.slug}`}
      data-testid="next-set"
      className="group flex items-center gap-4 rounded-2xl border border-primary/30 bg-primary/10 px-5 py-4 transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <Sparkles className="size-5 shrink-0 text-primary" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium text-primary">Up next for you</span>
        <span className="block text-sm font-semibold text-foreground">{nextSetLine(next)}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-primary">
        {next.kind === "continue" ? "Continue" : "Open"} {next.name}
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
      </span>
    </Link>
  );
}
