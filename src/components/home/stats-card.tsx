"use client";

import Link from "next/link";

import { HomeCard } from "@/components/home/home-card";
import { useHomeSnapshot } from "@/components/home/use-home-snapshot";
import { Sparkline } from "@/components/stats/sparkline";
import { buttonVariants } from "@/components/ui/button";
import { eventLabel } from "@/lib/timer/events";
import { formatMs } from "@/lib/timer/format";
import { cn } from "@/lib/utils";

function show(v: number | "DNF" | null): string {
  if (v === null) return "–";
  return v === "DNF" ? "DNF" : formatMs(v);
}

/** Your stats (docs/home-plan.md → card 3): PB single, current Ao5 and Ao12, the last 30 solves. */
export function StatsCard({ userId }: { userId: string | null }) {
  const { puzzle, snapshot } = useHomeSnapshot(userId);

  return (
    <HomeCard id="stats" title={`Your ${eventLabel(puzzle)} stats`} seeAll={{ href: "/stats", label: "Open Stats" }}>
      {snapshot === null ? (
        <div className="h-28 animate-pulse rounded-lg bg-muted/40 motion-reduce:animate-none" aria-label="Loading stats" />
      ) : snapshot.total < 5 ? (
        <div className="flex flex-col items-start gap-3 py-2">
          <p className="text-sm text-muted-foreground">Time your first 5 solves to see averages here.</p>
          <Link href="/timer" className={buttonVariants({ size: "sm" })}>
            Start
          </Link>
        </div>
      ) : (
        <Link href="/stats" className="-mx-1 flex flex-col gap-3 rounded-lg px-1 pb-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
          <dl className="grid grid-cols-3 gap-2">
            {[
              ["PB single", snapshot.pbSingle],
              ["Ao5", snapshot.ao5],
              ["Ao12", snapshot.ao12],
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-lg bg-muted/40 px-2.5 py-2">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="font-mono text-lg font-semibold tabular-nums text-foreground">
                  {show(value as number | "DNF" | null)}
                </dd>
              </div>
            ))}
          </dl>
          <Sparkline
            points={snapshot.trend}
            className="h-10 w-full"
            ariaLabel={`Last ${snapshot.trend.length} solves${snapshot.trendWord ? `: ${snapshot.trendWord}` : ""}`}
          />
          <p className={cn("text-xs text-muted-foreground")}>
            This week: {snapshot.weekSolves} solve{snapshot.weekSolves === 1 ? "" : "s"} across {snapshot.weekDays} day
            {snapshot.weekDays === 1 ? "" : "s"}
            {snapshot.trendWord && <> · trend {snapshot.trendWord}</>}
          </p>
        </Link>
      )}
    </HomeCard>
  );
}
