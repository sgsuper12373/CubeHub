"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { CustomizeSheet } from "@/components/home/customize-sheet";

import { DailyCard } from "@/components/daily/daily-card";
import { HomeCardSkeleton } from "@/components/home/home-card";
import { HomeGrid } from "@/components/home/home-grid";
import { DrillIntroCard, LearningStartCard, PlaygroundCard } from "@/components/home/static-cards";
import { StatsCard } from "@/components/home/stats-card";
import { StreakCard } from "@/components/home/streak-card";
import { TipCard } from "@/components/home/tip-card";
import { WelcomeCard } from "@/components/home/welcome-card";
import { WhatsNewCard } from "@/components/home/whats-new-card";
import { detectVisitor, homeCards, parseHomeLayout, type CardId } from "@/lib/home/cards";
import { homeLayoutSnapshot, subscribeHomeLayout } from "@/lib/home/layout-storage";
import { localRepo } from "@/lib/timer/repo-local";

/**
 * Home for a guest. Everything a guest has is in this browser, so the cards
 * are decided here: no local solves is a first visit, some is a returning
 * guest (docs/home-plan.md → Who sees what).
 */
export function GuestHome() {
  const [solveCount, setSolveCount] = useState<number | null>(null);
  const rawLayout = useSyncExternalStore(subscribeHomeLayout, homeLayoutSnapshot, () => null);

  useEffect(() => {
    let live = true;
    void localRepo
      .loadEventCounts()
      .then((counts) => Object.values(counts).reduce((n, c) => n + (c ?? 0), 0))
      .catch(() => 0)
      .then((n) => {
        if (live) setSolveCount(n);
      });
    return () => {
      live = false;
    };
  }, []);

  if (solveCount === null) {
    return <HomeGrid main={<HomeCardSkeleton className="lg:col-span-2" />} rail={null} />;
  }

  const visitor = detectVisitor({ signedIn: false, solveCount });
  const layout = parseHomeLayout(rawLayout);
  const { main, rail } = homeCards(visitor, layout);
  const render = (id: CardId) => {
    switch (id) {
      case "welcome":
        return <WelcomeCard key={id} member={false} />;
      case "daily":
        return <DailyCard key={id} userId={null} />;
      case "stats":
        return <StatsCard key={id} userId={null} />;
      case "streak":
        return <StreakCard key={id} userId={null} />;
      case "learning":
        return <LearningStartCard key={id} />;
      case "drill":
        return <DrillIntroCard key={id} />;
      case "tip":
        return <TipCard key={id} />;
      case "playground":
        return <PlaygroundCard key={id} />;
      case "whatsnew":
        return <WhatsNewCard key={id} />;
      default:
        return null;
    }
  };
  return (
    <>
      <div className="-mt-3 flex justify-end">
        <CustomizeSheet visitor={visitor} layout={layout} signedIn={false} />
      </div>
      <HomeGrid main={main.map(render)} rail={rail.map(render)} />
    </>
  );
}
