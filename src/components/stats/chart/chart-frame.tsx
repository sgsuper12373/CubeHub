"use client";

import { BarChart3 } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The card every chart sits in: heading, optional controls, the drawing, and
 * the table view underneath it.
 *
 * The table is not an optional extra. It is how the chart stays readable when
 * colour is unavailable — screen readers, printing, forced-colors mode — so it
 * ships with every chart rather than being remembered per chart.
 */
export function ChartFrame({
  title,
  hint,
  action,
  isEmpty,
  emptyMessage = "Not enough solves yet.",
  table,
  children,
  className,
}: {
  title: string;
  /** One line under the heading — what the reader is looking at. */
  hint?: string;
  /** Controls that belong to this chart alone, right-aligned in the header. */
  action?: ReactNode;
  isEmpty: boolean;
  emptyMessage?: string;
  /** The same numbers as a table, revealed on demand. */
  table?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col rounded-lg border border-border bg-card p-4",
        className,
      )}
    >
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {hint && (
            <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
          )}
        </div>
        {action}
      </header>

      {isEmpty ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
          <BarChart3 className="size-8 text-muted-foreground/25" aria-hidden />
          <p className="max-w-[18rem] text-sm text-balance text-muted-foreground">
            {emptyMessage}
          </p>
        </div>
      ) : (
        <>
          <figure className="min-w-0">{children}</figure>
          {table && (
            <details className="group mt-3">
              <summary className="cursor-pointer text-xs text-muted-foreground transition-colors hover:text-foreground">
                View as table
              </summary>
              <div className="mt-2 max-h-64 overflow-auto">{table}</div>
            </details>
          )}
        </>
      )}
    </section>
  );
}

/**
 * Legend for two or more series. Never omitted above one series — identity must
 * not rest on colour alone — and never used for one, where the title already
 * names what is drawn.
 */
export function ChartLegend({
  items,
}: {
  items: { label: string; color: string; dashed?: boolean }[];
}) {
  return (
    <ul className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
      {items.map((item) => (
        <li
          key={item.label}
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <svg width="14" height="8" aria-hidden className="shrink-0">
            <line
              x1="0"
              y1="4"
              x2="14"
              y2="4"
              stroke={item.color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={item.dashed ? "3 3" : undefined}
            />
          </svg>
          {item.label}
        </li>
      ))}
    </ul>
  );
}

/** Shared table styling, so every chart's table view looks like the same thing. */
export function ChartTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | number)[][];
}) {
  return (
    <table className="w-full text-left text-xs">
      <thead className="sticky top-0 bg-card">
        <tr className="border-b border-border">
          {headers.map((h) => (
            <th key={h} className="py-1.5 pr-3 font-medium text-muted-foreground">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-b border-border/40 last:border-0">
            {row.map((cell, j) => (
              <td
                key={j}
                className={cn(
                  "py-1 pr-3",
                  j === 0 ? "text-muted-foreground" : "font-mono tabular-nums text-foreground",
                )}
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
