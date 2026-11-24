import { CountUp } from "@/components/marketing/motion/count-up";
import { getPublicStats, showableStats } from "@/lib/marketing/public-stats";

/**
 * A slot for real numbers (solves timed, cubers, cases drilled, college
 * clubs) from `public_stats()`. Renders nothing when that function is missing
 * or returns nothing, or unless at least one count is big enough to mean
 * something (STAT_MINIMUM); never a placeholder. Read when the
 * landing page is built and refreshed hourly (the page's `revalidate`).
 */
export async function RealStats() {
  const stats = showableStats(await getPublicStats());
  if (stats.length === 0) return null;
  return (
    <dl className="reveal flex flex-wrap gap-x-10 gap-y-4">
      {stats.map((s) => (
        <div key={s.key}>
          <dt className="sr-only">{s.label}</dt>
          <dd className="flex items-baseline gap-2">
            <CountUp value={s.value} className="text-3xl font-bold tabular-nums text-foreground" />
            <span aria-hidden className="text-sm text-muted-foreground">
              {s.label}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
