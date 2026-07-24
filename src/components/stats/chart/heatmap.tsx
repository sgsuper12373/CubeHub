"use client";

import { useMemo, useState } from "react";

import { ChartTooltip, TooltipRow } from "@/components/stats/chart/tooltip";
import { formatMs } from "@/lib/timer/format";
import { dailyCounts } from "@/lib/timer/stats";
import type { SolveMetric } from "@/lib/timer/types";

/**
 * Practice heatmap — a year of days, coloured by how much was solved.
 *
 * A grid of magnitudes, so the colour job is **sequential**: one hue, dim → bright
 * on the dark canvas (where "more" reads as more light) and light → dark on the
 * white one. Never a categorical palette — the squares are not identities.
 *
 * Days with no practice keep a visible empty square rather than disappearing.
 * The gaps are the point: a heatmap that only draws the days you showed up
 * flatters you, and this is a chart about consistency.
 */

const CELL = 11;
const GAP = 3;
const WEEKDAYS = ["Mon", "", "Wed", "", "Fri", "", "Sun"];
/** Colour steps, quietest first. Thresholds are solves-per-day. */
const STEPS = [
  { min: 1, color: "var(--chart-seq-1)" },
  { min: 5, color: "var(--chart-seq-2)" },
  { min: 15, color: "var(--chart-seq-3)" },
  { min: 40, color: "var(--chart-seq-4)" },
];

interface Cell {
  day: string;
  date: Date;
  count: number;
  bestMs: number | null;
  col: number;
  row: number;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** Monday-indexed weekday: JS getDay() is Sunday-first, cubers are not. */
function weekdayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

export function Heatmap({
  metrics,
  weeks = 53,
}: {
  metrics: SolveMetric[];
  weeks?: number;
}) {
  const [hover, setHover] = useState<Cell | null>(null);

  const { cells, monthLabels, width } = useMemo(() => {
    const counts = new Map(dailyCounts(metrics).map((d) => [d.day, d]));

    // Anchor on today in the viewer's own timezone, then walk back to the
    // Monday that starts the earliest column so the grid is never ragged.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(start.getDate() - (weeks * 7 - 1));
    start.setDate(start.getDate() - weekdayIndex(start));

    const cells: Cell[] = [];
    const monthLabels: { col: number; text: string }[] = [];
    let lastMonth = -1;

    for (
      let d = new Date(start), i = 0;
      d <= today;
      d.setDate(d.getDate() + 1), i++
    ) {
      const key = dayKey(d);
      const entry = counts.get(key);
      const col = Math.floor(i / 7);

      if (d.getMonth() !== lastMonth) {
        lastMonth = d.getMonth();
        // Skip a label that would collide with the previous one.
        if (
          monthLabels.length === 0 ||
          col - monthLabels[monthLabels.length - 1].col >= 3
        ) {
          monthLabels.push({
            col,
            text: d.toLocaleDateString(undefined, { month: "short" }),
          });
        }
      }

      cells.push({
        day: key,
        date: new Date(d),
        count: entry?.count ?? 0,
        bestMs: entry?.bestMs ?? null,
        col,
        row: weekdayIndex(d),
      });
    }

    const totalCols = cells.length === 0 ? 0 : cells[cells.length - 1].col + 1;
    return { cells, monthLabels, width: totalCols * (CELL + GAP) };
  }, [metrics, weeks]);

  const colorFor = (count: number) => {
    if (count === 0) return "var(--chart-seq-0)";
    let color = STEPS[0].color;
    for (const step of STEPS) if (count >= step.min) color = step.color;
    return color;
  };

  const LABEL_W = 30;
  const HEADER_H = 14;
  const height = HEADER_H + 7 * (CELL + GAP);

  return (
    <div className="relative">
      {/* The year is wider than a phone. Let the grid scroll, never the page. */}
      <div className="overflow-x-auto pb-1">
        <svg
          role="img"
          aria-label={`Practice heatmap: solves per day over the last ${weeks} weeks`}
          width={LABEL_W + width}
          height={height}
          onMouseLeave={() => setHover(null)}
        >
          {monthLabels.map((m) => (
            <text
              key={`${m.text}-${m.col}`}
              x={LABEL_W + m.col * (CELL + GAP)}
              y={10}
              className="fill-muted-foreground text-[10px]"
            >
              {m.text}
            </text>
          ))}

          {WEEKDAYS.map((label, row) =>
            label ? (
              <text
                key={label}
                x={LABEL_W - 6}
                y={HEADER_H + row * (CELL + GAP) + CELL / 2}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-muted-foreground text-[10px]"
              >
                {label}
              </text>
            ) : null,
          )}

          {cells.map((cell) => (
            <rect
              key={cell.day}
              x={LABEL_W + cell.col * (CELL + GAP)}
              y={HEADER_H + cell.row * (CELL + GAP)}
              width={CELL}
              height={CELL}
              rx={2}
              fill={colorFor(cell.count)}
              stroke={hover?.day === cell.day ? "var(--foreground)" : "none"}
              strokeWidth={1}
              onMouseEnter={() => setHover(cell)}
            >
              <title>{`${cell.day}: ${cell.count} solve${cell.count === 1 ? "" : "s"}`}</title>
            </rect>
          ))}
        </svg>
      </div>

      {hover && (
        <ChartTooltip
          x={Math.min(LABEL_W + hover.col * (CELL + GAP), 320)}
          y={HEADER_H + hover.row * (CELL + GAP)}
          containerWidth={360}
        >
          <p className="mb-1 font-medium text-foreground">
            {hover.date.toLocaleDateString(undefined, {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
          <TooltipRow label="Solves" value={String(hover.count)} />
          {hover.bestMs !== null && (
            <TooltipRow label="Best" value={formatMs(hover.bestMs)} />
          )}
        </ChartTooltip>
      )}

      <div className="mt-2 flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
        <span>Less</span>
        {["var(--chart-seq-0)", ...STEPS.map((s) => s.color)].map((c) => (
          <span
            key={c}
            className="size-2.5 rounded-[2px]"
            style={{ background: c }}
            aria-hidden
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
