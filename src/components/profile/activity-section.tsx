import { CalendarDays, Flame, Trophy, type LucideIcon } from "lucide-react";

import { Heatmap } from "@/components/stats/chart/heatmap";
import type { ProfileActivity } from "@/lib/profile/dal";

/**
 * Practice calendar and streaks (B6). The heatmap is the /stats one, fed with
 * the server's India-time day counts. A streak survives until a whole day
 * passes without a solve.
 */
export function ActivitySection({ activity, hiddenNote }: { activity: ProfileActivity; hiddenNote?: boolean }) {
  return (
    <section className="space-y-3" aria-labelledby="activity-title">
      <SectionTitle id="activity-title" title="Activity" hiddenNote={hiddenNote} />
      <div className="grid grid-cols-3 gap-3">
        <Streak icon={Flame} label="Current streak" value={days(activity.currentStreak)} />
        <Streak icon={Trophy} label="Longest streak" value={days(activity.longestStreak)} />
        <Streak icon={CalendarDays} label="Active days" value={activity.activeDays.toLocaleString("en-IN")} />
      </div>
      <div className="rounded-xl border border-border bg-card/60 p-4">
        {activity.days.length > 0 ? (
          <Heatmap days={activity.days} since={activity.days[0]?.day ?? null} />
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">No solves in the last year.</p>
        )}
      </div>
    </section>
  );
}

const days = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;

function Streak({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-3">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5 text-primary" aria-hidden />
        {label}
      </p>
      <p className="mt-1 font-mono text-base font-bold text-foreground sm:text-lg">{value}</p>
    </div>
  );
}

/** A section heading, with the owner's "Hidden from others" note when it applies. */
export function SectionTitle({ id, title, hiddenNote }: { id: string; title: string; hiddenNote?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <h2 id={id} className="text-lg font-bold tracking-tight text-foreground">
        {title}
      </h2>
      {hiddenNote && <span className="text-xs text-muted-foreground">Hidden from others</span>}
    </div>
  );
}
