"use client";

import { useEffect, useMemo, useState } from "react";

import { ChartFrame, ChartTable } from "@/components/stats/chart/chart-frame";
import { Heatmap } from "@/components/stats/chart/heatmap";
import { Histogram } from "@/components/stats/chart/histogram";
import { formatDayLabel } from "@/components/stats/chart/scale";
import { TrendChart } from "@/components/stats/chart/trend-chart";
import { ConsistencyCard } from "@/components/stats/analytics/consistency-card";
import { PbRow } from "@/components/stats/analytics/pb-row";
import { CubeLoader } from "@/components/ui/cube-loader";
import { formatMs } from "@/lib/timer/format";
import { localRepo } from "@/lib/timer/repo-local";
import type { SolveRepository } from "@/lib/timer/repo";
import { createSupabaseRepo } from "@/lib/timer/repo-supabase";
import { dailyCounts, histogramBuckets } from "@/lib/timer/stats";
import type {
  PersonalBest,
  Session,
  SolveMetric,
  TimerPuzzle,
} from "@/lib/timer/types";
import { cn } from "@/lib/utils";

/**
 * The analytics page.
 *
 * Reads through the same repository boundary the timer uses, so it works
 * logged out over localStorage exactly as it works signed in over the cloud —
 * a cuber who has never made an account still gets their year of practice back.
 *
 * One fetch feeds every block: the charts all derive from a single
 * `loadSolveMetrics` array rather than each asking the database its own
 * question. Personal bests are the one thing that does not derive from it,
 * because all-time bests reach beyond whatever window is on screen.
 */

const RANGES = [
  { key: "30d", label: "30 days", days: 30 },
  { key: "90d", label: "90 days", days: 90 },
  { key: "12m", label: "12 months", days: 365 },
  { key: "all", label: "All time", days: null },
] as const;

type RangeKey = (typeof RANGES)[number]["key"];

const PUZZLES: { key: TimerPuzzle; label: string }[] = [
  { key: "333", label: "3x3" },
  { key: "222", label: "2x2" },
];

export function StatsScreen({ userId }: { userId: string | null }) {
  const [puzzle, setPuzzle] = useState<TimerPuzzle>("333");
  const [range, setRange] = useState<RangeKey>("12m");
  const [sessionId, setSessionId] = useState<string>("all");

  /**
   * What is currently on screen is identified by the query that produced it, so
   * "loading" is derived rather than stored. Resetting a loading flag at the top
   * of the effect would set state synchronously during render, which cascades;
   * comparing keys gets the same behaviour with one render.
   */
  const queryKey = `${userId ?? "local"}|${puzzle}|${range}`;

  const [result, setResult] = useState<{
    key: string;
    metrics: SolveMetric[];
    bests: PersonalBest[];
    sessions: Session[];
    error: string | null;
  } | null>(null);

  const repo: SolveRepository = useMemo(
    () => (userId ? createSupabaseRepo(userId) : localRepo),
    [userId],
  );

  useEffect(() => {
    let cancelled = false;

    const days = RANGES.find((r) => r.key === range)?.days ?? null;
    const since =
      days === null
        ? undefined
        : new Date(Date.now() - days * 86_400_000).toISOString();

    (async () => {
      try {
        const [metrics, bests, sessions] = await Promise.all([
          repo.loadSolveMetrics(puzzle, { since }),
          repo.loadPersonalBests(puzzle),
          repo.loadSessions(puzzle),
        ]);
        if (cancelled) return;
        setResult({ key: queryKey, metrics, bests, sessions, error: null });
      } catch (err) {
        console.error("stats: load failed", err);
        if (cancelled) return;
        setResult({
          key: queryKey,
          metrics: [],
          bests: [],
          sessions: [],
          error: "Couldn't load your solves. Check your connection and retry.",
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [repo, puzzle, range, queryKey]);

  const loaded = result?.key === queryKey ? result : null;
  const metrics = loaded?.metrics ?? null;
  const bests = loaded?.bests ?? [];
  const sessions = loaded?.sessions ?? [];
  const error = loaded?.error ?? null;

  // Session filtering is client-side — the metrics already carry sessionId, so
  // narrowing costs nothing and never re-hits the network.
  const filtered = useMemo(() => {
    if (!metrics) return null;
    if (sessionId === "all") return metrics;
    return metrics.filter((m) => m.sessionId === sessionId);
  }, [metrics, sessionId]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">Stats</h1>
        <p className="text-sm text-muted-foreground">
          Every solve you have kept, not just this session.
        </p>
      </header>

      {/* ── Filters: one row, above everything they affect ── */}
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl
          label="Puzzle"
          options={PUZZLES.map((p) => ({ key: p.key, label: p.label }))}
          value={puzzle}
          onChange={(v) => setPuzzle(v as TimerPuzzle)}
        />
        <SegmentedControl
          label="Range"
          options={RANGES.map((r) => ({ key: r.key, label: r.label }))}
          value={range}
          onChange={(v) => setRange(v as RangeKey)}
        />
        {sessions.length > 1 && (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="sr-only">Session</span>
            <select
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              className="rounded-md border border-border bg-card px-2 py-1.5 text-xs text-foreground"
            >
              <option value="all">All sessions</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-foreground">
          {error}
        </p>
      )}

      {filtered === null ? (
        <div className="flex flex-1 items-center justify-center py-24">
          <CubeLoader />
        </div>
      ) : (
        <>
          <PbRow bests={bests} isAuthed={userId !== null} />

          <ChartFrame
            title="Times over time"
            hint={`${filtered.length} solve${filtered.length === 1 ? "" : "s"} in this range`}
            isEmpty={filtered.length < 2}
            emptyMessage="Two solves in this range and the trend appears."
            table={<TrendTable metrics={filtered} />}
          >
            <TrendChart metrics={filtered} />
          </ChartFrame>

          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <ChartFrame
              title="Distribution"
              hint="Where your times cluster · DNFs excluded"
              isEmpty={filtered.length < 3}
              emptyMessage="A few more solves and the shape of your times appears."
              table={<HistogramTable metrics={filtered} />}
            >
              <Histogram metrics={filtered} />
            </ChartFrame>

            <ConsistencyCard metrics={filtered} />
          </div>

          <ChartFrame
            title="Practice"
            hint="Solves per day, in your local time"
            isEmpty={filtered.length === 0}
            emptyMessage="Your practice days will show up here."
            table={<PracticeTable metrics={filtered} />}
          >
            <Heatmap metrics={filtered} />
          </ChartFrame>
        </>
      )}
    </div>
  );
}

function SegmentedControl({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex rounded-md border border-border bg-card p-0.5"
    >
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          aria-pressed={value === o.key}
          onClick={() => onChange(o.key)}
          className={cn(
            "rounded px-2.5 py-1 text-xs font-medium transition-colors",
            value === o.key
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── Table views ──
// Every chart ships one. Charts are the fast read; these are the exact one, and
// the only one available when colour is not.

function TrendTable({ metrics }: { metrics: SolveMetric[] }) {
  // Newest first, capped — a table is for checking a number, not scrolling a year.
  const rows = metrics
    .slice(0, 100)
    .map((m) => [
      formatDayLabel(m.createdAt),
      m.penalty === "dnf" ? "DNF" : formatMs(m.effectiveTimeMs ?? m.timeMs),
    ]);
  return <ChartTable headers={["Date", "Time"]} rows={rows} />;
}

function HistogramTable({ metrics }: { metrics: SolveMetric[] }) {
  const { buckets } = histogramBuckets(metrics);
  return (
    <ChartTable
      headers={["Range", "Solves"]}
      rows={buckets.map((b) => [
        `${formatMs(b.fromMs)} – ${formatMs(b.toMs)}`,
        b.count,
      ])}
    />
  );
}

function PracticeTable({ metrics }: { metrics: SolveMetric[] }) {
  const days = dailyCounts(metrics).slice(-60).reverse();
  return (
    <ChartTable
      headers={["Day", "Solves", "Best"]}
      rows={days.map((d) => [
        d.day,
        d.count,
        d.bestMs === null ? "—" : formatMs(d.bestMs),
      ])}
    />
  );
}
