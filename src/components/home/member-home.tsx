import { Suspense } from "react";

import { HomeCardSkeleton } from "@/components/home/home-card";
import { HomeGrid } from "@/components/home/home-grid";
import { QuickStart } from "@/components/home/quick-start";
import { DrillCard } from "@/components/home/drill-card";
import { LearningCard } from "@/components/home/learning-card";
import { DrillIntroCard, PlaygroundCard } from "@/components/home/static-cards";
import { CustomizeSheet } from "@/components/home/customize-sheet";
import { LayoutCopyUp } from "@/components/home/layout-copy-up";
import { ClubsCard, FriendsCard } from "@/components/home/social-cards";
import { StatsCard } from "@/components/home/stats-card";
import { StreakCard } from "@/components/home/streak-card";
import { TipCard } from "@/components/home/tip-card";
import { WelcomeCard } from "@/components/home/welcome-card";
import { WhatsNewCard } from "@/components/home/whats-new-card";
import type { CurrentProfile } from "@/lib/auth/dal";
import { detectVisitor, homeCards, type CardId } from "@/lib/home/cards";
import { getDrillQueue, getHomeLayout, getHomeSummary, pickContinueSeries } from "@/lib/home/dal";

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
export async function MemberHome({ profile }: { profile: CurrentProfile }) {
  const [summary, layout] = await Promise.all([getHomeSummary(profile.username), getHomeLayout(profile.id)]);
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
      case "tip":
        return <TipCard key={id} />;
      case "playground":
        return <PlaygroundCard key={id} />;
      case "friends":
        return <FriendsCard key={id} />;
      case "clubs":
        return <ClubsCard key={id} />;
      case "whatsnew":
        return <WhatsNewCard key={id} />;
      default:
        return null;
    }
  };
  const wrap = (id: CardId) => {
    const card = render(id);
    return card && <Suspense key={id} fallback={<HomeCardSkeleton />}>{card}</Suspense>;
  };
  return (
    <>
      <div className="-mt-3 flex justify-end">
        <CustomizeSheet visitor={visitor} layout={layout} signedIn />
      </div>
      {layout === null && <LayoutCopyUp />}
      <HomeGrid main={main.map(wrap)} rail={rail.map(wrap)} />
    </>
  );
}
