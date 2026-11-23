import { practiceStreaks } from "@/lib/timer/practice-stats";
import { dailyCounts, effectiveMs, windowStat } from "@/lib/timer/stats";
import type { PersonalBest, SolveMetric } from "@/lib/timer/types";

/**
 * What Home's stats and streak cards show, from the main puzzle's solves
 * (newest first, as `loadSolveMetrics` returns them) and its PBs. Pure.
 */
export type HomeSnapshot = {
  pbSingle: number | null;
  /** Current averages: the newest session only (rolling averages never span sessions). */
  ao5: number | "DNF" | null;
  ao12: number | "DNF" | null;
  /** The last 30 counted solves, oldest first; null for a DNF. */
  trend: (number | null)[];
  trendWord: "improving" | "steady" | "slower" | null;
  /** Monday-to-today. */
  weekSolves: number;
  weekDays: number;
  streak: number;
  today: number;
  /** The last 14 local days, oldest first. */
  last14: { day: string; count: number }[];
  total: number;
};

function localDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function mean(xs: number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

export function homeSnapshot(
  metrics: readonly SolveMetric[],
  pbs: readonly PersonalBest[],
  now: Date = new Date(),
): HomeSnapshot {
  const counted = metrics.filter((m) => !m.excluded);
  const session = counted.length ? counted.filter((m) => m.sessionId === counted[0].sessionId) : [];

  const trend = counted
    .slice(0, 30)
    .map((m) => effectiveMs(m))
    .reverse();
  // Compare the older and newer halves of the trend: 2% either way is "steady".
  let trendWord: HomeSnapshot["trendWord"] = null;
  const finite = trend.filter((t): t is number => t !== null);
  if (finite.length >= 10) {
    const half = Math.floor(finite.length / 2);
    const older = mean(finite.slice(0, half))!;
    const newer = mean(finite.slice(half))!;
    trendWord = newer < older * 0.98 ? "improving" : newer > older * 1.02 ? "slower" : "steady";
  }

  const days = dailyCounts(metrics as SolveMetric[]);
  const { current, thisWeek } = practiceStreaks(days, now);
  const byDay = new Map(days.map((d) => [d.day, d.count]));
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  let weekDays = 0;
  for (const d = new Date(monday); localDay(d) <= localDay(now); d.setDate(d.getDate() + 1)) {
    if ((byDay.get(localDay(d)) ?? 0) > 0) weekDays += 1;
  }
  const last14: HomeSnapshot["last14"] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const day = localDay(d);
    last14.push({ day, count: byDay.get(day) ?? 0 });
  }

  return {
    pbSingle: pbs.find((p) => p.category === "single")?.timeMs ?? null,
    ao5: windowStat(session, 5),
    ao12: windowStat(session, 12),
    trend,
    trendWord,
    weekSolves: thisWeek,
    weekDays,
    streak: current,
    today: byDay.get(localDay(now)) ?? 0,
    last14,
    total: metrics.length,
  };
}
