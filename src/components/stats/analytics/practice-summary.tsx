"use client";

import { formatMs } from "@/lib/timer/format";
import { fastestHours, hourRangeLabel, practiceStreaks } from "@/lib/timer/practice-stats";
import type { DayCount } from "@/lib/timer/stats";
import type { SolveMetric } from "@/lib/timer/types";

/**
 * The practice numbers above the heatmap: streaks, solves this week, and the
 * time of day the cuber is fastest (once there's enough to say).
 */
export function PracticeSummary({
  days,
  counted,
  now,
}: {
  days: DayCount[];
  /** Counted solves in the range, for the time of day. */
  counted: SolveMetric[];
  /** When the data was loaded: "today" and "this week" count from it. */
  now: number;
}) {
  const { current, longest, thisWeek } = practiceStreaks(days, new Date(now));
  const hours = fastestHours(counted);
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

  return (
    <div className="mb-4 flex flex-col gap-3" data-testid="practice-summary">
      <dl className="grid grid-cols-3 gap-2">
        <Stat label="Current streak" value={plural(current, "day")} />
        <Stat label="Longest streak" value={plural(longest, "day")} />
        <Stat label="This week" value={plural(thisWeek, "solve")} />
      </dl>
      {hours && (
        <p className="text-xs text-muted-foreground">
          You&apos;re fastest between{" "}
          <span className="font-medium text-foreground">{hourRangeLabel(hours.fromHour)}</span>: a
          median of {formatMs(hours.medianMs)} against {formatMs(hours.overallMs)} overall.
        </p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg px-3 py-2 ring-1 ring-inset ring-foreground/10">
      <dt className="text-[0.6rem] font-medium tracking-wider text-muted-foreground uppercase">{label}</dt>
      <dd className="font-mono text-base font-semibold text-foreground tabular-nums">{value}</dd>
    </div>
  );
}
