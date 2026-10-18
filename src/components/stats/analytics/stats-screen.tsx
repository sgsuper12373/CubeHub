"use client";

import { useEffect, useMemo, useState } from "react";

import { ChartFrame, ChartTable } from "@/components/stats/chart/chart-frame";
import { Heatmap } from "@/components/stats/chart/heatmap";
import { Histogram } from "@/components/stats/chart/histogram";
import { formatDayLabel } from "@/components/stats/chart/scale";
import { TrendChart } from "@/components/stats/chart/trend-chart";
import { ConsistencyCard } from "@/components/stats/analytics/consistency-card";
import { DataMenu, useImportFlow } from "@/components/stats/analytics/data-tools";
import { EventPills } from "@/components/stats/analytics/event-pills";
import { PbRow } from "@/components/stats/analytics/pb-row";
import { StatsOnboarding, STATS_UNLOCK_SOLVES } from "@/components/stats/analytics/stats-onboarding";
import { CubeLoader } from "@/components/ui/cube-loader";
import { eventLabel } from "@/lib/timer/events";
import { formatMs } from "@/lib/timer/format";
import { countedSolves } from "@/lib/timer/misfire";
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

// "This session" is the timer's active session for the event, all time.
// `short` is what fits five across on a phone.
const RANGES = [
  { key: "session", label: "This session", short: "Session", days: null },
  { key: "30d", label: "30 days", short: "30d", days: 30 },
  { key: "90d", label: "90 days", short: "90d", days: 90 },
  { key: "12m", label: "12 months", short: "12m", days: 365 },
  { key: "all", label: "All time", short: "All", days: null },
] as const;

type RangeKey = (typeof RANGES)[number]["key"];

/**
 * Ceiling on one page load. Generous — a cuber doing 100 solves a day reaches
 * it in about seven weeks of "all time" — but it is a ceiling, and a chart
 * drawn from a truncated history while claiming to be all-time would be a lie.
 * When it bites, the page says so.
 */
const METRIC_LIMIT = 5000;

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
  const [reloads, setReloads] = useState(0);
  const queryKey = `${userId ?? "local"}|${puzzle}|${range}|${reloads}`;

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

  // Solves per event, for the pills and the empty state. Keyed like the
  // metrics so it's never shown for the wrong account or a stale import.
  const countsKey = `${userId ?? "local"}|${reloads}`;
  const [countsResult, setCountsResult] = useState<{
    key: string;
    counts: Partial<Record<TimerPuzzle, number>>;
  } | null>(null);
  useEffect(() => {
    let cancelled = false;
    repo
      .loadEventCounts()
      .then((counts) => {
        if (!cancelled) setCountsResult({ key: countsKey, counts });
      })
      .catch((err) => {
        console.error("stats: event counts failed", err);
        if (!cancelled) setCountsResult({ key: countsKey, counts: {} });
      });
    return () => {
      cancelled = true;
    };
  }, [repo, countsKey]);
  const counts = countsResult?.key === countsKey ? countsResult.counts : null;

  const importFlow = useImportFlow({
    repo,
    puzzle,
    onImported: () => setReloads((n) => n + 1),
  });

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
          repo.loadSolveMetrics(puzzle, { since, limit: METRIC_LIMIT }),
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
  const activeSession = sessions.find((s) => s.isActive) ?? null;
  // "This session" pins the session filter to the active one.
  const effectiveSessionId =
    range === "session" ? (activeSession?.id ?? "none") : sessionId;

  // Session filtering is client-side — the metrics already carry sessionId, so
  // narrowing costs nothing and never re-hits the network.
  // Excluded solves (flagged mis-stops included) don't count here, as on the timer.
  const filtered = useMemo(() => {
    if (!metrics) return null;
    const counted = countedSolves(metrics);
    if (effectiveSessionId === "all") return counted;
    return counted.filter((m) => m.sessionId === effectiveSessionId);
  }, [metrics, effectiveSessionId]);
  const eventSolves = counts?.[puzzle] ?? 0;
  const locked = counts !== null && eventSolves < STATS_UNLOCK_SOLVES;
  const practiceDays = useMemo(() => (filtered ? dailyCounts(filtered) : []), [filtered]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4">
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-foreground">Stats</h1>
          <p className="text-sm text-muted-foreground">
            Every solve you have kept, not just this session.
          </p>
        </div>
        <DataMenu repo={repo} puzzle={puzzle} onImport={importFlow.openPicker} />
      </header>
      {importFlow.ui}

      {/* ── Filters: above everything they affect, and kept in reach on scroll ── */}
      <div
        className="sticky top-0 z-30 -mx-4 flex flex-col gap-2 border-b border-border/60 bg-background/90 px-4 py-2 backdrop-blur-sm md:top-14"
        data-testid="stats-filters"
      >
        <EventPills value={puzzle} counts={counts} onChange={setPuzzle} />
        {!locked && (
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl
              label="Range"
              options={RANGES.map((r) => ({ key: r.key, label: r.label, short: r.short }))}
              value={range}
              onChange={(v) => setRange(v as RangeKey)}
            />
            {range !== "session" && sessions.length > 1 && (
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
        )}
      </div>

      {metrics !== null && metrics.length === METRIC_LIMIT && (
        <p className="rounded-lg border border-border bg-card px-4 py-2.5 text-xs text-muted-foreground">
          Showing your most recent {METRIC_LIMIT.toLocaleString()} solves. Older
          ones are safe — they are just not in these charts. Personal bests below
          still cover everything.
        </p>
      )}

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-foreground">
          {error}
        </p>
      )}

      {filtered === null || counts === null ? (
        <div className="flex flex-1 items-center justify-center py-24">
          <CubeLoader />
        </div>
      ) : locked ? (
        <StatsOnboarding puzzle={puzzle} solves={eventSolves} onImport={importFlow.openPicker} />
      ) : filtered.length === 0 ? (
        <>
          <PbRow bests={bests} isAuthed={userId !== null} />
          <section className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-card px-4 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              {range === "session"
                ? `No ${eventLabel(puzzle)} solves in this session yet.`
                : `No ${eventLabel(puzzle)} solves in this range.`}
            </p>
            <button
              type="button"
              onClick={() => {
                setRange("all");
                setSessionId("all");
              }}
              className="text-sm font-medium text-primary hover:underline"
            >
              Show all time
            </button>
          </section>
        </>
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
            <Heatmap days={practiceDays} since={practiceDays[0]?.day ?? null} />
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
  options: { key: string; label: string; short?: string }[];
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
          aria-label={o.short ? o.label : undefined}
          onClick={() => onChange(o.key)}
          className={cn(
            "whitespace-nowrap rounded px-2.5 py-1 text-xs font-medium transition-colors",
            value === o.key
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.short ? (
            <>
              <span className="sm:hidden" aria-hidden>{o.short}</span>
              <span className="hidden sm:inline" aria-hidden>{o.label}</span>
            </>
          ) : (
            o.label
          )}
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
