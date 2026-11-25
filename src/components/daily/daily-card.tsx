"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { HomeCard, HomeCardSkeleton } from "@/components/home/home-card";
import { buttonVariants } from "@/components/ui/button";
import { formatCountdown, formatDay, istDay, msUntilNextDay } from "@/lib/daily/day";
import { fetchBoard, fetchDaily, fetchMine, rowName, type DailyRow, type DailyScramble } from "@/lib/daily/data";
import { loadAttempt, type DailyAttempt } from "@/lib/daily/result";
import { formatResult } from "@/lib/timer/format";

type Loaded = {
  day: string;
  daily: DailyScramble;
  solved: number;
  top: DailyRow[];
  mine: { row: DailyRow; rank: number | null } | null;
  local: DailyAttempt | null;
};

/**
 * Home's daily scramble card (docs/home-plan.md → card 2): today's scramble,
 * how many have posted, your result, the top three, and the way in. A client
 * card so guests and members share it; it renders nothing at all when there's
 * no daily today (or the tables aren't there yet). No cube preview here: Home
 * loads no cubing.js up front, and the daily timer has the preview.
 */
export function DailyCard({ userId }: { userId: string | null }) {
  const [data, setData] = useState<Loaded | null | undefined>(undefined);
  const [countdown, setCountdown] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    const day = istDay();
    void (async () => {
      const daily = await fetchDaily(day);
      if (!daily) {
        if (live) setData(null);
        return;
      }
      const [board, mine] = await Promise.all([fetchBoard(day, 3), userId ? fetchMine(day, userId) : null]);
      if (live) setData({ day, daily, solved: board.solved, top: board.top, mine, local: loadAttempt(day) });
    })();
    return () => {
      live = false;
    };
  }, [userId]);

  useEffect(() => {
    const tick = () => setCountdown(formatCountdown(msUntilNextDay()));
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  if (data === undefined) return <HomeCardSkeleton />;
  if (data === null) return null;

  const { day, daily, solved, top, mine, local } = data;
  const attempted = mine !== null || local !== null;
  const result = mine
    ? mine.row.penalty === "dnf"
      ? "DNF"
      : formatResult(mine.row.timeMs ?? 0, mine.row.penalty)
    : local
      ? formatResult(local.timeMs, local.penalty)
      : null;

  return (
    <HomeCard id="daily" title={`Daily scramble · ${formatDay(day)}`} seeAll={{ href: `/home/daily?day=${day}`, label: "Leaderboard" }}>
      <p className="font-mono text-sm leading-relaxed text-foreground" aria-label={`Scramble: ${daily.scramble}`}>
        {daily.scramble}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        {solved === 0 ? "Nobody has posted yet." : `${solved} ${solved === 1 ? "cuberhubber" : "cuberhubbers"} solved it.`}
        {countdown && <> Next daily scramble in {countdown}.</>}
      </p>

      {result && (
        <p className="mt-3 text-sm text-foreground" data-testid="daily-card-result">
          Your result: <span className="font-mono font-semibold tabular-nums">{result}</span>
          {mine?.rank ? <span className="text-muted-foreground"> · #{mine.rank}</span> : null}
          {!mine && local && !local.posted && userId && <span className="text-muted-foreground"> · not posted yet</span>}
        </p>
      )}

      {top.length > 0 && (
        <ol className="mt-3 flex flex-col gap-1 text-sm">
          {top.map((r, i) => (
            <li key={r.userId} className="flex items-baseline justify-between gap-2">
              <span className="truncate text-muted-foreground">
                {i + 1}. {r.username ? <Link href={`/profile/${r.username}`} className="text-foreground hover:underline">{rowName(r)}</Link> : rowName(r)}
              </span>
              <span className="font-mono tabular-nums text-foreground">{formatResult(r.timeMs ?? 0, r.penalty)}</span>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {!attempted || (local && !local.posted && userId && !mine) ? (
          <Link href={`/timer?daily=${day}`} className={buttonVariants({ size: "sm" })}>
            {attempted ? "Post your result" : "Solve today's scramble"}
          </Link>
        ) : (
          <Link href={`/home/daily?day=${day}`} className={buttonVariants({ size: "sm", variant: "outline" })}>
            See the leaderboard
          </Link>
        )}
        {!userId && (
          <Link href={`/login?next=${encodeURIComponent("/home")}`} className="text-xs font-medium text-primary hover:underline">
            Sign in to get on the leaderboard
          </Link>
        )}
      </div>
    </HomeCard>
  );
}
