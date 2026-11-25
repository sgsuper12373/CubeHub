import Link from "next/link";

import { HomeCard } from "@/components/home/home-card";
import { LearningStartCard } from "@/components/home/static-cards";
import { Progress } from "@/components/ui/progress";
import { getHomeSummary, getNextUnlearnedCase, pickContinueSeries } from "@/lib/home/dal";
import { nextSetLine } from "@/lib/learn/next-set";
import { getNextSet } from "@/lib/learn/next-set-data";

/**
 * Continue learning (docs/home-plan.md → card 4): the series in progress,
 * how far along, and the next case to learn. No cube diagram here: drawing
 * one needs cubing.js, which Home doesn't load up front (see decisions.md).
 */
export async function LearningCard({ username }: { username: string }) {
  const summary = await getHomeSummary(username);
  const series = pickContinueSeries(summary.learning);
  if (!series) {
    // Nothing in progress: suggest the next set on the path (lib/learn/next-set.ts).
    const next = await getNextSet(username);
    if (!next || next.kind === "start") return <LearningStartCard />;
    return (
      <HomeCard id="learning" title="Continue learning" seeAll={{ href: "/learn", label: "All of Learn" }}>
        <p className="text-sm text-foreground">{nextSetLine(next)}</p>
        <Link href={`/learn/${next.puzzle}/${next.slug}`} className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
          Open {next.name}
        </Link>
      </HomeCard>
    );
  }

  const next = await getNextUnlearnedCase(series.puzzle, series.slug);
  const href = `/learn/${series.puzzle}/${series.slug}`;
  return (
    <HomeCard id="learning" title="Continue learning" seeAll={{ href: "/learn", label: "All of Learn" }}>
      <Link href={href} className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
        <p className="text-sm font-medium text-foreground">
          {series.name} · {series.learned} of {series.total} learned
        </p>
        <Progress
          value={Math.round((series.learned / Math.max(1, series.total)) * 100)}
          aria-label={`${series.learned} of ${series.total} learned`}
          className="mt-2"
        />
      </Link>
      {next && (
        <div className="mt-3 rounded-lg bg-muted/40 px-3 py-2">
          <p className="text-xs text-muted-foreground">Next up</p>
          <p className="text-sm font-medium text-foreground">{next.name}</p>
          {next.moves && <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{next.moves}</p>}
        </div>
      )}
    </HomeCard>
  );
}
