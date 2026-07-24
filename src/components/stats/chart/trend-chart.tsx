"use client";

import { useMemo, useState } from "react";

import { TimeGrid, XLabels } from "@/components/stats/chart/axes";
import { ChartLegend } from "@/components/stats/chart/chart-frame";
import {
  formatDayLabel,
  linearScale,
  spacedIndices,
  timeTicks,
} from "@/components/stats/chart/scale";
import { ChartTooltip, TooltipRow } from "@/components/stats/chart/tooltip";
import { useMeasuredWidth } from "@/components/stats/chart/use-measured-width";
import { formatAverage, formatMs } from "@/lib/timer/format";
import { effectiveMs, rollingAverages } from "@/lib/timer/stats";
import type { SolveMetric } from "@/lib/timer/types";

/**
 * Times over time: every single as context, with the Ao5 and Ao12 drawn over
 * them.
 *
 * This is an **emphasis** chart, not three equal series. The singles are what
 * the averages are made of, so they recede to a grey density band; the two
 * averages — the thing a cuber actually tracks — carry the categorical hues.
 *
 * Above a few hundred solves the singles stop being individually readable, so
 * they collapse to one vertical min–max segment per pixel column. That is more
 * honest than sampling: nothing is dropped, and the spread at each moment stays
 * visible. Below that threshold they draw as dots.
 */

const MARGIN = { top: 10, right: 14, bottom: 34, left: 46 };
const HEIGHT = 280;
/** Height of the strip under the plot where DNFs are marked. */
const DNF_RAIL = 10;
const DOT_THRESHOLD = 220;

export function TrendChart({ metrics }: { metrics: SolveMetric[] }) {
  const { ref, width } = useMeasuredWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  // The store and repositories hand out newest-first; a chart reads left to
  // right in time, so this reversal is load-bearing.
  const series = useMemo(() => {
    const chrono = [...metrics].reverse();
    const ao5 = rollingAverages(metrics, 5).reverse();
    const ao12 = rollingAverages(metrics, 12).reverse();
    return {
      chrono,
      singles: chrono.map(effectiveMs),
      ao5,
      ao12,
    };
  }, [metrics]);

  const innerW = Math.max(0, width - MARGIN.left - MARGIN.right);
  const innerH = HEIGHT - MARGIN.top - MARGIN.bottom;
  const n = series.chrono.length;

  const geometry = useMemo(() => {
    const finite: number[] = [];
    for (const v of series.singles) if (v !== null) finite.push(v);
    for (const v of series.ao5) if (typeof v === "number") finite.push(v);
    for (const v of series.ao12) if (typeof v === "number") finite.push(v);
    if (finite.length === 0) return null;

    const { ticks, domain } = timeTicks(
      Math.min(...finite),
      Math.max(...finite),
    );
    const y = linearScale(domain, [MARGIN.top + innerH, MARGIN.top]);
    const x = linearScale([0, Math.max(1, n - 1)], [
      MARGIN.left,
      MARGIN.left + innerW,
    ]);
    return { ticks, x, y };
  }, [series, innerW, innerH, n]);

  if (width === 0) {
    // First paint, before measurement — reserve the height so the card does
    // not jump when the chart appears.
    return <div ref={ref} style={{ height: HEIGHT }} />;
  }
  if (!geometry) return <div ref={ref} style={{ height: HEIGHT }} />;

  const { ticks, x, y } = geometry;

  /**
   * Averages break at every gap rather than interpolating across it — a DNF
   * average is missing information, not a value to draw through.
   *
   * A run of one point still has to render: a cuber with exactly five solves
   * has exactly one Ao5, and a one-point polyline draws nothing at all, so the
   * line would be invisible until their sixth solve.
   */
  const runsOf = (values: (number | "DNF" | null)[]) => {
    const runs: { i: number; v: number }[][] = [];
    let current: { i: number; v: number }[] = [];
    values.forEach((v, i) => {
      if (typeof v !== "number") {
        if (current.length) runs.push(current);
        current = [];
      } else {
        current.push({ i, v });
      }
    });
    if (current.length) runs.push(current);
    return runs;
  };

  const renderSeries = (
    values: (number | "DNF" | null)[],
    color: string,
    key: string,
  ) =>
    runsOf(values).map((run, ri) =>
      run.length === 1 ? (
        <circle
          key={`${key}-${ri}`}
          cx={x(run[0].i)}
          cy={y(run[0].v)}
          r={2.5}
          fill={color}
        />
      ) : (
        <polyline
          key={`${key}-${ri}`}
          points={run.map((p) => `${x(p.i)},${y(p.v)}`).join(" ")}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ),
    );

  // Density band: one min–max segment per pixel column.
  const columns: { x: number; lo: number; hi: number }[] = [];
  if (n > DOT_THRESHOLD) {
    const byColumn = new Map<number, { lo: number; hi: number }>();
    series.singles.forEach((v, i) => {
      if (v === null) return;
      const col = Math.round(x(i));
      const found = byColumn.get(col);
      if (found) {
        if (v < found.lo) found.lo = v;
        if (v > found.hi) found.hi = v;
      } else {
        byColumn.set(col, { lo: v, hi: v });
      }
    });
    for (const [col, { lo, hi }] of byColumn) columns.push({ x: col, lo, hi });
  }

  const labels = spacedIndices(n, width < 480 ? 3 : 5).map((i) => ({
    x: x(i),
    text: formatDayLabel(series.chrono[i].createdAt),
  }));

  const railY = MARGIN.top + innerH + 6;

  const move = (clientX: number, rect: DOMRect) => {
    const px = clientX - rect.left;
    const ratio = (px - MARGIN.left) / Math.max(1, innerW);
    setHover(Math.max(0, Math.min(n - 1, Math.round(ratio * (n - 1)))));
  };

  const hoverSingle = hover === null ? null : series.singles[hover];
  const hoverAo5 = hover === null ? null : series.ao5[hover];
  const hoverAo12 = hover === null ? null : series.ao12[hover];

  return (
    <div ref={ref} className="relative">
      <svg
        role="img"
        aria-label={`Solve times over ${n} solves, with the rolling average of 5 and average of 12`}
        width={width}
        height={HEIGHT}
        tabIndex={0}
        className="touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        onMouseMove={(e) => move(e.clientX, e.currentTarget.getBoundingClientRect())}
        onMouseLeave={() => setHover(null)}
        onFocus={() => setHover((h) => h ?? n - 1)}
        onBlur={() => setHover(null)}
        onKeyDown={(e) => {
          if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
          e.preventDefault();
          const step = e.key === "ArrowLeft" ? -1 : 1;
          setHover((h) => Math.max(0, Math.min(n - 1, (h ?? n - 1) + step)));
        }}
      >
        <TimeGrid
          ticks={ticks}
          y={y}
          left={MARGIN.left}
          right={MARGIN.left + innerW}
        />

        {/* ── Singles: context, never a competing series ── */}
        {n > DOT_THRESHOLD
          ? columns.map((c) => (
              <line
                key={c.x}
                x1={c.x}
                x2={c.x}
                y1={y(c.hi)}
                y2={y(c.lo)}
                stroke="var(--chart-4)"
                strokeWidth={1}
                opacity={0.45}
              />
            ))
          : series.singles.map((v, i) =>
              v === null ? null : (
                <circle
                  key={series.chrono[i].id}
                  cx={x(i)}
                  cy={y(v)}
                  r={1.8}
                  fill="var(--chart-4)"
                  opacity={0.55}
                />
              ),
            )}

        {/* ── DNF rail: outside the time scale, because a DNF is not a time ── */}
        {series.singles.map((v, i) =>
          v !== null ? null : (
            <line
              key={`dnf-${series.chrono[i].id}`}
              x1={x(i)}
              x2={x(i)}
              y1={railY}
              y2={railY + DNF_RAIL}
              stroke="var(--timer-hold)"
              strokeWidth={1.5}
            />
          ),
        )}

        {renderSeries(series.ao12, "var(--chart-2)", "ao12")}
        {renderSeries(series.ao5, "var(--chart-1)", "ao5")}

        {/* ── Crosshair ── */}
        {hover !== null && (
          <g>
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={MARGIN.top}
              y2={MARGIN.top + innerH}
              stroke="var(--muted-foreground)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            {typeof hoverAo5 === "number" && (
              <circle
                cx={x(hover)}
                cy={y(hoverAo5)}
                r={4}
                fill="var(--chart-1)"
                stroke="var(--card)"
                strokeWidth={2}
              />
            )}
            {typeof hoverAo12 === "number" && (
              <circle
                cx={x(hover)}
                cy={y(hoverAo12)}
                r={4}
                fill="var(--chart-2)"
                stroke="var(--card)"
                strokeWidth={2}
              />
            )}
          </g>
        )}

        <XLabels labels={labels} bottom={MARGIN.top + innerH + DNF_RAIL + 4} />
      </svg>

      {hover !== null && (
        <ChartTooltip x={x(hover)} y={HEIGHT / 2} containerWidth={width}>
          <p className="mb-1 font-medium text-foreground">
            {formatDayLabel(series.chrono[hover].createdAt)} · #{hover + 1}
          </p>
          <TooltipRow
            label="Single"
            value={hoverSingle === null ? "DNF" : formatMs(hoverSingle)}
            color="var(--chart-4)"
          />
          <TooltipRow
            label="Ao5"
            value={formatAverage(hoverAo5 ?? null)}
            color="var(--chart-1)"
          />
          <TooltipRow
            label="Ao12"
            value={formatAverage(hoverAo12 ?? null)}
            color="var(--chart-2)"
          />
        </ChartTooltip>
      )}

      <ChartLegend
        items={[
          { label: "Ao5", color: "var(--chart-1)" },
          { label: "Ao12", color: "var(--chart-2)" },
          { label: "Singles", color: "var(--chart-4)" },
        ]}
      />
    </div>
  );
}
