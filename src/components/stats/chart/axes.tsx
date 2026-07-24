"use client";

import { formatMs } from "@/lib/timer/format";

/**
 * Axes and grid. Recessive by design — the grid is a reading aid, not a mark,
 * so it sits at a low opacity behind the data and never competes with it.
 */

export const AXIS_LABEL_CLASS = "fill-muted-foreground text-[10px]";

/** Horizontal grid lines with time labels down the left. */
export function TimeGrid({
  ticks,
  y,
  left,
  right,
}: {
  ticks: number[];
  y: (v: number) => number;
  /** Left edge of the plot area — labels sit to the left of it. */
  left: number;
  right: number;
}) {
  return (
    <g aria-hidden>
      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={left}
            x2={right}
            y1={y(t)}
            y2={y(t)}
            stroke="var(--border)"
            strokeWidth={1}
          />
          <text
            x={left - 6}
            y={y(t)}
            textAnchor="end"
            dominantBaseline="middle"
            className={AXIS_LABEL_CLASS}
          >
            {formatMs(t)}
          </text>
        </g>
      ))}
    </g>
  );
}

/** Labels along the bottom, already positioned by the caller. */
export function XLabels({
  labels,
  bottom,
}: {
  labels: { x: number; text: string }[];
  bottom: number;
}) {
  return (
    <g aria-hidden>
      {labels.map((l, i) => (
        <text
          key={`${l.text}-${i}`}
          x={l.x}
          y={bottom + 14}
          textAnchor="middle"
          className={AXIS_LABEL_CLASS}
        >
          {l.text}
        </text>
      ))}
    </g>
  );
}
