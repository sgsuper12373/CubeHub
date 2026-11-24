"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { addDays, dayStatus, formatDay } from "@/lib/daily/day";
import { fetchBoard, fetchDaily, fetchMine, rowName, type DailyRow, type DailyScramble } from "@/lib/daily/data";
import { formatResult } from "@/lib/timer/format";
import { cn } from "@/lib/utils";

type Loaded = {
  daily: DailyScramble | null;
  solved: number;
  top: DailyRow[];
  mine: { row: DailyRow; rank: number | null } | null;
};

/**
 * The day's top 10 and your place (docs/home-plan.md → card 2). Ranked: no
 * penalty, and +2 with the two seconds added; DNFs count as "solved it" but
 * aren't ranked. Days step back and forward, never past today (IST). The
 * page keys it by day, so a new day is a fresh mount.
 */
export function DailyLeaderboard({ day, today, userId }: { day: string; today: string; userId: string | null }) {
  const [data, setData] = useState<Loaded | null>(null);

  useEffect(() => {
    let live = true;
    void (async () => {
      const [daily, board, mine] = await Promise.all([
        fetchDaily(day),
        fetchBoard(day, 10),
        userId ? fetchMine(day, userId) : null,
      ]);
      if (live) setData({ daily, solved: board.solved, top: board.top, mine });
    })();
    return () => {
      live = false;
    };
  }, [day, userId]);

  const isToday = dayStatus(day, today) === "today";
  const canGoForward = day < today;

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Days" className="flex items-center justify-between gap-2">
        <Link href={`/home/daily?day=${addDays(day, -1)}`} className={buttonVariants({ size: "sm", variant: "ghost" })}>
          <ChevronLeft className="size-4" aria-hidden />
          Previous day
        </Link>
        <p className="text-sm font-medium text-foreground">{formatDay(day)}</p>
        {canGoForward ? (
          <Link href={`/home/daily?day=${addDays(day, 1)}`} className={buttonVariants({ size: "sm", variant: "ghost" })}>
            Next day
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        ) : (
          <span className="w-24" />
        )}
      </nav>

      {data === null ? (
        <div className="h-64 animate-pulse rounded-xl bg-card ring-1 ring-foreground/10 motion-reduce:animate-none" aria-hidden />
      ) : !data.daily ? (
        <p className="text-sm text-muted-foreground">There&apos;s no daily scramble for this day.</p>
      ) : (
        <>
          <section aria-labelledby="daily-scramble-heading" className="rounded-xl border border-border bg-card p-4">
            <h2 id="daily-scramble-heading" className="text-sm font-semibold text-foreground">
              Scramble
            </h2>
            <p className="mt-2 font-mono text-sm leading-relaxed text-foreground">{data.daily.scramble}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {data.solved === 0
                ? "Nobody has posted yet."
                : `${data.solved} ${data.solved === 1 ? "cuberhubber" : "cuberhubbers"} solved it.`}
            </p>
            {isToday && !data.mine && (
              <Link href={`/timer?daily=${day}`} className={buttonVariants({ size: "sm", className: "mt-3" })}>
                Solve today&apos;s scramble
              </Link>
            )}
          </section>

          <section aria-labelledby="daily-top-heading">
            <h2 id="daily-top-heading" className="mb-2 text-sm font-semibold text-foreground">
              Top 10
            </h2>
            {data.top.length === 0 ? (
              <p className="text-sm text-muted-foreground">No ranked times yet.</p>
            ) : (
              <ol className="divide-y divide-border rounded-xl border border-border bg-card" data-testid="daily-top">
                {data.top.map((r, i) => (
                  <li
                    key={r.userId}
                    className={cn(
                      "flex items-baseline justify-between gap-3 px-4 py-2.5 text-sm",
                      r.userId === userId && "bg-primary/10",
                    )}
                  >
                    <span className="flex min-w-0 items-baseline gap-3">
                      <span className="w-6 text-right tabular-nums text-muted-foreground">{i + 1}</span>
                      {r.username ? (
                        <Link href={`/profile/${r.username}`} className="truncate text-foreground hover:underline">
                          {rowName(r)}
                        </Link>
                      ) : (
                        <span className="truncate text-muted-foreground">{rowName(r)}</span>
                      )}
                    </span>
                    <span className="font-mono tabular-nums text-foreground">{formatResult(r.timeMs ?? 0, r.penalty)}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {data.mine && (
            <p className="text-sm text-foreground" role="status">
              Your result:{" "}
              <span className="font-mono font-semibold tabular-nums">
                {data.mine.row.penalty === "dnf" ? "DNF" : formatResult(data.mine.row.timeMs ?? 0, data.mine.row.penalty)}
              </span>
              {data.mine.rank ? ` · #${data.mine.rank}` : " · DNFs aren't ranked"}
            </p>
          )}
          {!userId && (
            <p className="text-sm text-muted-foreground">
              <Link href={`/login?next=${encodeURIComponent(`/home/daily?day=${day}`)}`} className="font-medium text-primary hover:underline">
                Sign in
              </Link>{" "}
              to get on the leaderboard. Guests can still solve the daily; the result stays in this browser.
            </p>
          )}
        </>
      )}
    </div>
  );
}
