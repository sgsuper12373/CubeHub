import Link from "next/link";
import { BarChart3, Timer, Upload } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { eventLabel } from "@/lib/timer/events";
import type { TimerPuzzle } from "@/lib/timer/types";

/** Below this many solves for an event, Stats shows this panel instead of the cards. */
export const STATS_UNLOCK_SOLVES = 5;

/**
 * One panel for an event without enough solves, instead of every card saying
 * "not enough solves" on its own. Points at the two ways to get some: time
 * them, or bring a history from csTimer.
 */
export function StatsOnboarding({
  puzzle,
  solves,
  onImport,
}: {
  puzzle: TimerPuzzle;
  /** Live solves the event has so far. */
  solves: number;
  onImport: () => void;
}) {
  const left = STATS_UNLOCK_SOLVES - solves;
  return (
    <section className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <BarChart3 className="size-6" aria-hidden />
      </span>
      <div className="max-w-sm space-y-1.5">
        <h2 className="text-lg font-semibold text-foreground">
          {solves === 0
            ? `Time ${STATS_UNLOCK_SOLVES} ${eventLabel(puzzle)} solves to unlock your stats`
            : `${left} more ${eventLabel(puzzle)} solve${left === 1 ? "" : "s"} to unlock your stats`}
        </h2>
        <p className="text-sm text-muted-foreground">
          Your trend, personal bests, distribution, consistency and practice days all appear
          here. Already have a history in csTimer? Bring it in.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Link href="/timer" className={buttonVariants()}>
          <Timer aria-hidden />
          Open the timer
        </Link>
        <button type="button" onClick={onImport} className={buttonVariants({ variant: "outline" })}>
          <Upload aria-hidden />
          Import from csTimer
        </button>
      </div>
    </section>
  );
}
