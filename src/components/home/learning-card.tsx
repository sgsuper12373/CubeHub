import Link from "next/link";

import { HomeCard } from "@/components/home/home-card";
import { LearningStartCard } from "@/components/home/static-cards";
import { Progress } from "@/components/ui/progress";
import { getHomeSummary, getNextUnlearnedCase, pickContinueSeries } from "@/lib/home/dal";

/**
 * Continue learning (docs/home-plan.md → card 4): the series in progress,
 * how far along, and the next case to learn. No cube diagram here: drawing
 * one needs cubing.js, which Home doesn't load up front (see decisions.md).
 */
export async function LearningCard({ username }: { username: string }) {
  const summary = await getHomeSummary(username);
  const series = pickContinueSeries(summary.learning);
  if (!series) return <LearningStartCard />;

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
