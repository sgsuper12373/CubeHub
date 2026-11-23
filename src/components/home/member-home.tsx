import { Suspense } from "react";

import { HomeCardSkeleton } from "@/components/home/home-card";
import { HomeGrid } from "@/components/home/home-grid";
import { QuickStart } from "@/components/home/quick-start";
import { DrillCard } from "@/components/home/drill-card";
import { LearningCard } from "@/components/home/learning-card";
import { DrillIntroCard } from "@/components/home/static-cards";
import { StatsCard } from "@/components/home/stats-card";
import { StreakCard } from "@/components/home/streak-card";
import { WelcomeCard } from "@/components/home/welcome-card";
import type { CurrentProfile } from "@/lib/auth/dal";
import { detectVisitor, homeCards, type CardId, type HomeLayout } from "@/lib/home/cards";
import { getDrillQueue, getHomeSummary, pickContinueSeries } from "@/lib/home/dal";

/** The quick-start row with the member's real drill and Learn state. */
export async function MemberQuickStart({ username }: { username: string }) {
  const [summary, queue] = await Promise.all([getHomeSummary(username), getDrillQueue()]);
  const series = pickContinueSeries(summary.learning);
  return (
    <QuickStart
      due={queue.due}
      continueSeries={series ? { name: series.name, href: `/learn/${series.puzzle}/${series.slug}` } : null}
    />
  );
}

/**
 * The cards for a signed-in cuber. The summary decides which set they get
 * (new or regular); each card then loads in its own Suspense boundary, so a
 * slow query never holds up the rest.
 */
export async function MemberHome({ profile, layout }: { profile: CurrentProfile; layout: HomeLayout | null }) {
  const summary = await getHomeSummary(profile.username);
  const visitor = detectVisitor({ signedIn: true, solveCount: summary.solveCount });
  const pllLearned = summary.learning.some((l) => l.slug === "pll" && l.learned > 0);
  const { main, rail } = homeCards(visitor, layout);

  const render = (id: CardId) => {
    switch (id) {
      case "welcome":
        return <WelcomeCard key={id} member solveCount={summary.solveCount} pllLearned={pllLearned} />;
      case "stats":
        return <StatsCard key={id} userId={profile.id} />;
      case "streak":
        return <StreakCard key={id} userId={profile.id} />;
      case "learning":
        return <LearningCard key={id} username={profile.username} />;
      case "drill":
        return visitor === "member-new" && summary.solveCount === 0 ? <DrillIntroCard key={id} /> : <DrillCard key={id} />;
      default:
        return null;
    }
  };
  const wrap = (id: CardId) => {
    const card = render(id);
    return card && <Suspense key={id} fallback={<HomeCardSkeleton />}>{card}</Suspense>;
  };
  return <HomeGrid main={main.map(wrap)} rail={rail.map(wrap)} />;
}
