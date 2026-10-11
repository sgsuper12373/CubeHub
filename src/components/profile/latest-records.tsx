import Link from "next/link";

import type { PublicProfile } from "@/lib/profile/dal";
import { eventLabel, isTimerEvent } from "@/lib/timer/events";
import { formatMs } from "@/lib/timer/format";

const CATEGORY_LABEL: Record<string, string> = {
  single: "Single",
  mean3: "Mo3",
  ao5: "Ao5",
  ao12: "Ao12",
  ao50: "Ao50",
  ao100: "Ao100",
};

/**
 * The five most recently set records that still stand (B8), across events.
 * Straight from the PB rows the page already loaded.
 */
export function LatestRecords({ personalBests }: { personalBests: PublicProfile["personalBests"] }) {
  const latest = [...personalBests]
    .filter((pb) => isTimerEvent(pb.puzzleType))
    .sort((a, b) => Date.parse(b.achievedAt) - Date.parse(a.achievedAt))
    .slice(0, 5);
  if (latest.length === 0) return null;

  return (
    <section className="space-y-3" aria-labelledby="latest-title">
      <h2 id="latest-title" className="text-lg font-bold tracking-tight text-foreground">
        Latest records
      </h2>
      <ul className="divide-y divide-border/60 rounded-xl border border-border bg-card/60">
        {latest.map((pb) => (
          <li key={`${pb.puzzleType}-${pb.category}`}>
            <Link
              href={`?event=${pb.puzzleType}`}
              scroll={false}
              className="flex items-baseline justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-muted/40"
            >
              <span className="text-sm text-foreground">
                {eventLabel(pb.puzzleType)}{" "}
                <span className="text-muted-foreground">{CATEGORY_LABEL[pb.category] ?? pb.category}</span>
              </span>
              <span className="flex items-baseline gap-3">
                <span className="font-mono text-sm font-semibold text-foreground tabular-nums">{formatMs(pb.timeMs)}</span>
                <span className="w-24 text-right text-xs text-muted-foreground">
                  {new Date(pb.achievedAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    timeZone: "Asia/Kolkata",
                  })}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
