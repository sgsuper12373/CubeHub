"use client";

import { useId, useMemo, useState } from "react";

import { TimeGrid, XLabels } from "@/components/stats/chart/axes";
import { ChartLegend } from "@/components/stats/chart/chart-frame";
import { formatDayLabel, linearScale, spacedIndices, timeTicks } from "@/components/stats/chart/scale";
import { SegmentedControl } from "@/components/stats/chart/segmented-control";
import { ChartTooltip, TooltipRow } from "@/components/stats/chart/tooltip";
import {
  buildTrendPoints,
  nearestPoint,
  pbMarks,
  type TrendPoint,
} from "@/components/stats/chart/trend-data";
import { useMeasuredWidth } from "@/components/stats/chart/use-measured-width";
import { formatAverage, formatMs } from "@/lib/timer/format";
import { slowOutlierCeiling } from "@/lib/timer/stats";
import type { PersonalBest, SolveMetric } from "@/lib/timer/types";

/**
 * Times over time: every single as context, with the Ao5 and Ao12 drawn over
 * them.
 *
 * This is an **emphasis** chart, not three equal series. The singles are what
 * the averages are made of, so they recede to a grey density band; the two
 * averages — the thing a cuber actually tracks — carry the categorical hues.
 *
 * Above a few hundred visible solves the singles stop being individually
 * readable, so they collapse to one vertical min–max segment per pixel column.
 * That is more honest than sampling: nothing is dropped, and the spread at
 * each moment stays visible. Below that threshold they draw as dots.
 *
 * It is also the way into a solve: clicking (or Enter on) a point opens it.
 * All-time PBs are starred, flagged mis-stops are hollow points on the same
 * time line (never averaged), the x axis can run by solve or by date, and
 * dragging across a range zooms into it.
 */

const MARGIN = { top: 10, right: 14, bottom: 34, left: 46 };
const HEIGHT = 280;
/** Height of the strip under the plot where DNFs are marked. */
const DNF_RAIL = 10;
const DOT_THRESHOLD = 220;
/** A drag shorter than this is a click. */
const DRAG_MIN_PX = 8;
/** By date, average lines break across a pause longer than this. */
const DATE_GAP_MS = 2 * 86_400_000;

type Mode = "solve" | "date";

export function TrendChart({
  metrics,
  flagged = [],
  bests = [],
  onSelect,
}: {
  /** Counted solves, newest first. */
  metrics: SolveMetric[];
  /** Flagged mis-stops in the same range, newest first. */
  flagged?: SolveMetric[];
  /** All-time PBs, starred where their solve is on the chart. */
  bests?: PersonalBest[];
  /** Open a solve. Without it, points aren't clickable. */
  onSelect?: (solveId: string) => void;
}) {
  const { ref, width } = useMeasuredWidth<HTMLDivElement>();
  const clipId = useId();
  const [mode, setMode] = useState<Mode>("solve");
  const [zoom, setZoom] = useState<[number, number] | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ start: number; now: number } | null>(null);

  const points = useMemo(() => buildTrendPoints(metrics, flagged), [metrics, flagged]);
  const marks = useMemo(() => pbMarks(points, bests), [points, bests]);
  const xOf = mode === "solve" ? (p: TrendPoint) => p.idx : (p: TrendPoint) => p.t;

  const innerW = Math.max(0, width - MARGIN.left - MARGIN.right);
  const innerH = HEIGHT - MARGIN.top - MARGIN.bottom;

  const full: [number, number] =
    points.length > 0 ? [xOf(points[0]), xOf(points[points.length - 1])] : [0, 1];
  const [d0, d1] = zoom ?? full;
  const domain: [number, number] = [d0, d1];

  const { visible, counted, geometry } = useMemo(() => {
    const at = mode === "solve" ? (p: TrendPoint) => p.idx : (p: TrendPoint) => p.t;
    const visible = points.filter((p) => at(p) >= d0 && at(p) <= d1);
    const counted = visible.filter((p) => !p.flagged);

    // One very slow solve would stretch the axis until everything else is a
    // flat line, so the axis stops at the outlier ceiling and slower points
    // sit on the top edge as markers. The tooltip still shows the real time.
    const cap = slowOutlierCeiling(
      counted.map((p) =>
        p.single === null
          ? { timeMs: 0, penalty: "dnf" as const, effectiveTimeMs: null }
          : { timeMs: p.single, penalty: "none" as const, effectiveTimeMs: p.single },
      ),
    );
    const limit = cap ?? Infinity;
    const finite: number[] = [];
    for (const p of counted) {
      if (p.single !== null && p.single <= limit) finite.push(p.single);
      if (typeof p.ao5 === "number" && p.ao5 <= limit) finite.push(p.ao5);
      if (typeof p.ao12 === "number" && p.ao12 <= limit) finite.push(p.ao12);
    }
    // Only mis-stops in view: let them set the axis rather than draw nothing.
    if (finite.length === 0) for (const p of visible) if (p.single !== null) finite.push(p.single);
    if (finite.length === 0) return { visible, counted, geometry: null };

    const { ticks, domain: yDomain } = timeTicks(Math.min(...finite), Math.max(...finite));
    const scale = linearScale(yDomain, [MARGIN.top + innerH, MARGIN.top]);
    // Clamped: past the top, or (a mis-stop) under the bottom, sits on the edge.
    const y = (v: number) => scale(Math.min(Math.max(v, yDomain[0]), yDomain[1]));
    const x = linearScale(d0 === d1 ? [d0 - 1, d1 + 1] : [d0, d1], [MARGIN.left, MARGIN.left + innerW]);
    return { visible, counted, geometry: { ticks, x, y, cap } };
  }, [points, d0, d1, mode, innerW, innerH]);

  if (width === 0 || !geometry) {
    // First paint, before measurement — reserve the height so the card does
    // not jump when the chart appears.
    return <div ref={ref} style={{ height: HEIGHT + 40 }} />;
  }

  const { ticks, x, y, cap } = geometry;
  const px = (p: TrendPoint) => x(xOf(p));

  /**
   * Averages break at every gap rather than interpolating across it — a DNF
   * average is missing information, not a value to draw through.
   *
   * A run of one point still has to render: a cuber with exactly five solves
   * has exactly one Ao5, and a one-point polyline draws nothing at all.
   *
   * By date, a long pause breaks the line too: a straight line across two
   * weeks off would draw averages nobody solved.
   */
  const runsOf = (key: "ao5" | "ao12") => {
    const runs: { p: TrendPoint; v: number }[][] = [];
    let current: { p: TrendPoint; v: number }[] = [];
    for (const p of points) {
      if (p.flagged) continue;
      const v = p[key];
      const paused =
        mode === "date" && current.length > 0 && p.t - current[current.length - 1].p.t > DATE_GAP_MS;
      if (paused) {
        runs.push(current);
        current = [];
      }
      if (typeof v !== "number") {
        if (current.length) runs.push(current);
        current = [];
      } else {
        current.push({ p, v });
      }
    }
    if (current.length) runs.push(current);
    return runs;
  };

  const renderSeries = (key: "ao5" | "ao12", color: string) =>
    runsOf(key).map((run, ri) =>
      run.length === 1 ? (
        <circle key={`${key}-${ri}`} cx={px(run[0].p)} cy={y(run[0].v)} r={2.5} fill={color} />
      ) : (
        <polyline
          key={`${key}-${ri}`}
          points={run.map(({ p, v }) => `${px(p)},${y(v)}`).join(" ")}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ),
    );

  // Density band: one min–max segment per pixel column.
  const dense = counted.length > DOT_THRESHOLD;
  const columns: { x: number; lo: number; hi: number }[] = [];
  if (dense) {
    const byColumn = new Map<number, { lo: number; hi: number }>();
    for (const p of counted) {
      if (p.single === null) continue;
      const col = Math.round(px(p));
      const found = byColumn.get(col);
      if (found) {
        if (p.single < found.lo) found.lo = p.single;
        if (p.single > found.hi) found.hi = p.single;
      } else {
        byColumn.set(col, { lo: p.single, hi: p.single });
      }
    }
    for (const [col, { lo, hi }] of byColumn) columns.push({ x: col, lo, hi });
  }

  const labelCount = width < 480 ? 3 : 5;
  const labels =
    mode === "solve"
      ? spacedIndices(visible.length, labelCount).map((i) => ({
          x: px(visible[i]),
          text: formatDayLabel(visible[i].createdAt),
        }))
      : spacedIndices(labelCount, labelCount).map((i) => {
          const t = domain[0] + ((domain[1] - domain[0]) * i) / (labelCount - 1);
          return { x: x(t), text: formatDayLabel(new Date(t).toISOString()) };
        });
  if (labels.length > 1) {
    labels[0] = { ...labels[0], anchor: "start" } as (typeof labels)[number];
    labels[labels.length - 1] = { ...labels[labels.length - 1], anchor: "end" } as (typeof labels)[number];
  }

  const railY = MARGIN.top + innerH + 6;
  const hover = hoverId === null ? null : (visible.find((p) => p.id === hoverId) ?? null);

  // ── Pointer: hover, click to open, drag to zoom ──
  const plotX = (clientX: number, rect: DOMRect) =>
    Math.max(MARGIN.left, Math.min(MARGIN.left + innerW, clientX - rect.left));
  const toData = (pixel: number) =>
    domain[0] + ((pixel - MARGIN.left) / Math.max(1, innerW)) * (domain[1] - domain[0]);
  const nearest = (pixel: number) => nearestPoint(visible, toData(pixel), xOf);

  const finishDrag = (end: number) => {
    if (!drag) return;
    setDrag(null);
    if (Math.abs(end - drag.start) >= DRAG_MIN_PX) {
      const a = toData(Math.min(drag.start, end));
      const b = toData(Math.max(drag.start, end));
      // A zoom needs something to show.
      if (visible.filter((p) => xOf(p) >= a && xOf(p) <= b).length >= 2) {
        setZoom([a, b]);
        setHoverId(null);
      }
      return;
    }
    const p = nearest(end);
    if (p && onSelect) onSelect(p.id);
  };

  const hoverAt = hover ? px(hover) : 0;
  const zoomed = zoom !== null;
  const flaggedInView = visible.some((p) => p.flagged);

  return (
    <div ref={ref} className="relative">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <SegmentedControl
          label="X axis"
          options={[
            { key: "solve", label: "By solve" },
            { key: "date", label: "By date" },
          ]}
          value={mode}
          onChange={(v) => {
            setMode(v as Mode);
            setZoom(null);
          }}
        />
        {zoomed && (
          <button
            type="button"
            onClick={() => setZoom(null)}
            className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
          >
            Reset zoom
          </button>
        )}
        <span className="text-xs text-muted-foreground">
          {zoomed ? `${visible.length} solves in view · ` : ""}Drag across to zoom
          {onSelect ? " · click a solve to open it" : ""}
        </span>
      </div>

      <svg
        role="img"
        aria-label={`Solve times over ${visible.length} solves, with the rolling average of 5 and average of 12${onSelect ? ". Use the arrow keys to pick a solve and Enter to open it." : ""}`}
        width={width}
        height={HEIGHT}
        tabIndex={0}
        data-testid="trend-chart"
        className="touch-pan-y select-none outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        style={{ cursor: onSelect ? "pointer" : undefined }}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          const at = plotX(e.clientX, e.currentTarget.getBoundingClientRect());
          setDrag({ start: at, now: at });
        }}
        onPointerMove={(e) => {
          const at = plotX(e.clientX, e.currentTarget.getBoundingClientRect());
          if (drag) setDrag({ ...drag, now: at });
          setHoverId(nearest(at)?.id ?? null);
        }}
        onPointerUp={(e) => finishDrag(plotX(e.clientX, e.currentTarget.getBoundingClientRect()))}
        onPointerCancel={() => setDrag(null)}
        onPointerLeave={() => {
          if (!drag) setHoverId(null);
        }}
        onFocus={() => setHoverId((h) => h ?? visible[visible.length - 1]?.id ?? null)}
        onBlur={() => setHoverId(null)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && zoomed) {
            setZoom(null);
            return;
          }
          if (e.key === "Enter" && hover && onSelect) {
            e.preventDefault();
            onSelect(hover.id);
            return;
          }
          if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
          e.preventDefault();
          const i = hover ? visible.indexOf(hover) : visible.length - 1;
          const next = Math.max(0, Math.min(visible.length - 1, i + (e.key === "ArrowLeft" ? -1 : 1)));
          setHoverId(visible[next]?.id ?? null);
        }}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={MARGIN.left - 4} y={MARGIN.top - 8} width={innerW + 8} height={innerH + DNF_RAIL + 16} />
          </clipPath>
        </defs>

        <TimeGrid ticks={ticks} y={y} left={MARGIN.left} right={MARGIN.left + innerW} />

        <g clipPath={`url(#${clipId})`}>
          {/* ── Above the axis: a marker on the top edge per slow single ── */}
          {cap !== null &&
            counted.map((p) =>
              p.single === null || p.single <= cap ? null : (
                <path
                  key={`over-${p.id}`}
                  d={`M ${px(p) - 4} ${MARGIN.top + 6} L ${px(p)} ${MARGIN.top} L ${px(p) + 4} ${MARGIN.top + 6} Z`}
                  fill="var(--muted-foreground)"
                />
              ),
            )}

          {/* ── Singles: context, never a competing series ── */}
          {dense
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
            : counted.map((p) =>
                p.single === null ? null : (
                  <circle key={p.id} cx={px(p)} cy={y(p.single)} r={1.8} fill="var(--chart-4)" opacity={0.55} />
                ),
              )}

          {/* ── Mis-stops: hollow, on the same time line, never averaged ── */}
          {visible.map((p) =>
            !p.flagged || p.single === null ? null : (
              <circle
                key={`m-${p.id}`}
                cx={px(p)}
                cy={y(p.single)}
                r={3.2}
                fill="var(--card)"
                stroke="var(--warning)"
                strokeWidth={1.5}
                data-testid="trend-misstop"
              />
            ),
          )}

          {/* ── DNF rail: outside the time scale, because a DNF is not a time ── */}
          {counted.map((p) =>
            p.single !== null ? null : (
              <line
                key={`dnf-${p.id}`}
                x1={px(p)}
                x2={px(p)}
                y1={railY}
                y2={railY + DNF_RAIL}
                stroke="var(--timer-hold)"
                strokeWidth={1.5}
              />
            ),
          )}

          {renderSeries("ao12", "var(--chart-2)")}
          {renderSeries("ao5", "var(--chart-1)")}

          {/* ── PB stars ── */}
          {marks.map((m) => {
            const p = points.find((q) => q.id === m.id);
            if (!p || xOf(p) < domain[0] || xOf(p) > domain[1]) return null;
            const cy = m.category === "single" && p.single !== null ? y(p.single) : y(m.ms);
            const fill =
              m.category === "single" ? "var(--timer-ready)" : m.category === "ao5" ? "var(--chart-1)" : "var(--chart-2)";
            return (
              <path
                key={`pb-${m.category}`}
                d={starPath(px(p), cy, 6)}
                fill={fill}
                stroke="var(--card)"
                strokeWidth={1.2}
                data-testid={`trend-pb-${m.category}`}
              />
            );
          })}
        </g>

        {/* ── Crosshair ── */}
        {hover && !drag && (
          <g>
            <line
              x1={hoverAt}
              x2={hoverAt}
              y1={MARGIN.top}
              y2={MARGIN.top + innerH}
              stroke="var(--muted-foreground)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            {hover.single !== null && (
              <circle
                cx={hoverAt}
                cy={y(hover.single)}
                r={4}
                fill={hover.flagged ? "var(--card)" : "var(--chart-4)"}
                stroke={hover.flagged ? "var(--warning)" : "var(--card)"}
                strokeWidth={2}
              />
            )}
            {typeof hover.ao5 === "number" && (
              <circle cx={hoverAt} cy={y(hover.ao5)} r={4} fill="var(--chart-1)" stroke="var(--card)" strokeWidth={2} />
            )}
            {typeof hover.ao12 === "number" && (
              <circle cx={hoverAt} cy={y(hover.ao12)} r={4} fill="var(--chart-2)" stroke="var(--card)" strokeWidth={2} />
            )}
          </g>
        )}

        {/* ── Zoom selection ── */}
        {drag && Math.abs(drag.now - drag.start) >= DRAG_MIN_PX && (
          <rect
            x={Math.min(drag.start, drag.now)}
            y={MARGIN.top}
            width={Math.abs(drag.now - drag.start)}
            height={innerH}
            fill="var(--primary)"
            opacity={0.12}
            stroke="var(--primary)"
            strokeOpacity={0.5}
          />
        )}

        <XLabels labels={labels} bottom={MARGIN.top + innerH + DNF_RAIL + 4} />
      </svg>

      {hover && !drag && (
        <ChartTooltip x={hoverAt} y={HEIGHT / 2 + 40} containerWidth={width}>
          <p className="mb-1 font-medium text-foreground">
            {formatDayLabel(hover.createdAt)} · #{hover.idx + 1}
          </p>
          {hover.flagged ? (
            <TooltipRow
              label="Mis-stop? (left out)"
              value={hover.single === null ? "DNF" : formatMs(hover.single)}
              color="var(--warning)"
            />
          ) : (
            <>
              <TooltipRow
                label="Single"
                value={hover.single === null ? "DNF" : formatMs(hover.single)}
                color="var(--chart-4)"
              />
              <TooltipRow label="Ao5" value={formatAverage(hover.ao5)} color="var(--chart-1)" />
              <TooltipRow label="Ao12" value={formatAverage(hover.ao12)} color="var(--chart-2)" />
            </>
          )}
          {onSelect && <p className="mt-1 text-[0.65rem] text-muted-foreground">Click to open</p>}
        </ChartTooltip>
      )}

      <div className="flex flex-wrap items-center gap-x-4">
        <ChartLegend
          items={[
            { label: "Ao5", color: "var(--chart-1)" },
            { label: "Ao12", color: "var(--chart-2)" },
            { label: "Singles", color: "var(--chart-4)" },
          ]}
        />
        {marks.length > 0 && (
          <span className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <svg width="12" height="12" aria-hidden>
              <path d={starPath(6, 6.5, 5.5)} fill="var(--timer-ready)" />
            </svg>
            All-time PB
          </span>
        )}
        {flaggedInView && (
          <span className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <svg width="10" height="10" aria-hidden>
              <circle cx={5} cy={5} r={3.5} fill="none" stroke="var(--warning)" strokeWidth={1.5} />
            </svg>
            Mis-stop? (left out)
          </span>
        )}
      </div>
      {cap !== null && (
        <p className="mt-1 text-xs text-muted-foreground">
          ▲ marks a solve slower than {formatMs(cap)}, above the top of the chart.
        </p>
      )}
    </div>
  );
}

/** A five-pointed star centred on (cx, cy) with outer radius r. */
function starPath(cx: number, cy: number, r: number): string {
  const inner = r * 0.45;
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`);
  }
  return `M ${pts.join(" L ")} Z`;
}
