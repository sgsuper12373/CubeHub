import type { Metadata } from "next";

import { DailyLeaderboard } from "@/components/daily/daily-leaderboard";
import { getUser } from "@/lib/auth/dal";
import { isDay, istDay } from "@/lib/daily/day";

export const metadata: Metadata = {
  title: "Daily scramble — CuberHub",
  description: "Today's 3x3 daily scramble: the same scramble for everyone, one attempt, and the day's top 10.",
  robots: { index: false },
};

/** The daily scramble's leaderboard (docs/home-plan.md → card 2). `?day=yyyy-mm-dd`, today (IST) by default. */
export default async function DailyPage({ searchParams }: { searchParams: Promise<{ day?: string | string[] }> }) {
  const { day } = await searchParams;
  const user = await getUser();
  const today = istDay();
  // Never past today; a bad or missing date is today.
  const shown = isDay(day) && day <= today ? day : today;
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 md:py-10">
      <header>
        <p className="text-sm font-medium text-primary">Daily scramble</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">Leaderboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          One 3x3 scramble a day for everyone, new at midnight IST. One attempt with WCA inspection; +2 times are
          ranked with the penalty, DNFs aren&apos;t ranked.
        </p>
      </header>
      <DailyLeaderboard key={shown} day={shown} today={today} userId={user?.id ?? null} />
    </div>
  );
}
