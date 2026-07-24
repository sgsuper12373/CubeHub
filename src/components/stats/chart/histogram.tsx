"use client";

import { useMemo, useState } from "react";

import { AXIS_LABEL_CLASS } from "@/components/stats/chart/axes";
import { linearScale } from "@/components/stats/chart/scale";
import { ChartTooltip, TooltipRow } from "@/components/stats/chart/tooltip";
import { useMeasuredWidth } from "@/components/stats/chart/use-measured-width";
import { formatMs } from "@/lib/timer/format";
import { histogramBuckets } from "@/lib/timer/stats";
import type { SolveMetric } from "@/lib/timer/types";

/**
 * Where the times actually cluster.
 *
 * Magnitude low → high, so this is a **sequential** job: one hue, no
 * categorical palette. Bars are separated by a 2px surface gap rather than a
 * stroke, which keeps the fill honest at any width.
 *
 * DNFs are absent by construction — they have no time to bucket — and the hint
 * under the title says so rather than leaving the count unexplained.
 */

const MARGIN = { top: 8, right: 8, bottom: 30, left: 34 };
const HEIGHT = 200;
const BAR_GAP = 2;

export function Histogram({ metrics }: { metrics: SolveMetric[] }) {
  const { ref, width } = useMeasuredWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const { buckets } = useMemo(() => histogramBuckets(metrics), [metrics]);

  const innerW = Math.max(0, width - MARGIN.left - MARGIN.right);
  const innerH = HEIGHT - MARGIN.top - MARGIN.bottom;

  if (width === 0 || buckets.length === 0) {
    return <div ref={ref} style={{ height: HEIGHT }} />;
  }

  const maxCount = Math.max(...buckets.map((b) => b.count));
  const y = linearScale([0, maxCount], [MARGIN.top + innerH, MARGIN.top]);
  const slot = innerW / buckets.length;
  const barW = Math.max(1, slot - BAR_GAP);

  // Only the ends and the tallest bucket are labelled — a number on every bar
  // is noise, and the peak is the one a reader looks for.
  const peak = buckets.reduce(
    (best, b, i) => (b.count > buckets[best].count ? i : best),
    0,
  );
  const labelled = new Set([0, peak, buckets.length - 1]);

  return (
    <div ref={ref} className="relative">
      <svg
        role="img"
        aria-label={`Distribution of ${metrics.length} solves across ${buckets.length} time buckets`}
        width={width}
        height={HEIGHT}
        onMouseLeave={() => setHover(null)}
      >
        {/* Baseline — bars are anchored to it, so it stays visible. */}
        <line
          x1={MARGIN.left}
          x2={MARGIN.left + innerW}
          y1={MARGIN.top + innerH}
          y2={MARGIN.top + innerH}
          stroke="var(--border)"
          strokeWidth={1}
        />

        {buckets.map((b, i) => {
          const h = MARGIN.top + innerH - y(b.count);
          return (
            <g key={b.fromMs}>
              {/* Full-height hit target: bigger than the mark it selects. */}
              <rect
                x={MARGIN.left + i * slot}
                y={MARGIN.top}
                width={slot}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
              />
              {b.count > 0 && (
                <rect
                  x={MARGIN.left + i * slot + BAR_GAP / 2}
                  y={y(b.count)}
                  width={barW}
                  height={Math.max(1, h)}
                  rx={2}
                  fill="var(--chart-1)"
                  opacity={hover === null || hover === i ? 1 : 0.45}
                  className="transition-opacity"
                  pointerEvents="none"
                />
              )}
            </g>
          );
        })}

        {/* y axis: 0 and the peak count are the only numbers worth printing. */}
        {[0, maxCount].map((v) => (
          <text
            key={v}
            x={MARGIN.left - 6}
            y={y(v)}
            textAnchor="end"
            dominantBaseline="middle"
            className={AXIS_LABEL_CLASS}
          >
            {v}
          </text>
        ))}

        {buckets.map((b, i) =>
          labelled.has(i) ? (
            <text
              key={`l-${b.fromMs}`}
              x={MARGIN.left + i * slot + slot / 2}
              y={MARGIN.top + innerH + 14}
              textAnchor="middle"
              className={AXIS_LABEL_CLASS}
            >
              {formatMs(b.fromMs)}
            </text>
          ) : null,
        )}
      </svg>

      {hover !== null && (
        <ChartTooltip
          x={MARGIN.left + hover * slot + slot / 2}
          y={HEIGHT / 2}
          containerWidth={width}
        >
          <p className="mb-1 font-medium text-foreground">
            {formatMs(buckets[hover].fromMs)} – {formatMs(buckets[hover].toMs)}
          </p>
          <TooltipRow
            label="Solves"
            value={String(buckets[hover].count)}
            color="var(--chart-1)"
          />
        </ChartTooltip>
      )}
    </div>
  );
}
