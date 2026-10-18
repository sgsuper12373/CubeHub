"use client";

import { TIMER_EVENTS } from "@/lib/timer/events";
import type { TimerPuzzle } from "@/lib/timer/types";
import { cn } from "@/lib/utils";

/**
 * The Stats event picker: one pill per timer event with a small puzzle glyph
 * and its solve count, so it's clear which events have data. Events without
 * solves stay pickable but muted. A horizontal scroller on narrow screens.
 */
export function EventPills({
  value,
  counts,
  onChange,
}: {
  value: TimerPuzzle;
  /** Live solves per event; null while loading (no counts shown). */
  counts: Partial<Record<TimerPuzzle, number>> | null;
  onChange: (puzzle: TimerPuzzle) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Event"
      className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
    >
      {TIMER_EVENTS.map((ev) => {
        const active = ev.id === value;
        const count = counts?.[ev.id];
        const empty = counts !== null && !count;
        return (
          <button
            key={ev.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={counts === null ? ev.label : `${ev.label}, ${count ?? 0} solves`}
            onClick={() => onChange(ev.id)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : empty
                  ? "border-border/60 text-muted-foreground/70 hover:text-foreground"
                  : "border-border bg-card text-foreground hover:bg-muted",
            )}
          >
            <PuzzleGlyph puzzle={ev.id} className="size-3.5" />
            {ev.label}
            {counts !== null && (
              <span
                className={cn(
                  "font-mono tabular-nums",
                  active ? "text-primary-foreground/80" : "text-muted-foreground",
                )}
              >
                {(count ?? 0).toLocaleString()}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** A tiny line drawing of each puzzle, in the current text colour. */
export function PuzzleGlyph({ puzzle, className }: { puzzle: TimerPuzzle; className?: string }) {
  const common = {
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.3,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className,
  };
  const grid = (n: number) => {
    const step = 12 / n;
    const lines = [];
    for (let i = 1; i < n; i++) {
      const at = 2 + i * step;
      const w = n > 4 ? 0.55 : n > 3 ? 0.75 : 1;
      lines.push(<line key={`v${i}`} x1={at} y1={2} x2={at} y2={14} strokeWidth={w} />);
      lines.push(<line key={`h${i}`} x1={2} y1={at} x2={14} y2={at} strokeWidth={w} />);
    }
    return (
      <svg {...common}>
        <rect x={2} y={2} width={12} height={12} rx={1.5} />
        {lines}
      </svg>
    );
  };

  switch (puzzle) {
    case "222":
      return grid(2);
    case "444":
      return grid(4);
    case "555":
      return grid(5);
    case "333oh":
      // A 3x3 with one hand-sized corner filled in.
      return (
        <svg {...common}>
          <rect x={2} y={2} width={12} height={12} rx={1.5} />
          <line x1={6} y1={2} x2={6} y2={14} strokeWidth={1} />
          <line x1={10} y1={2} x2={10} y2={14} strokeWidth={1} />
          <line x1={2} y1={6} x2={14} y2={6} strokeWidth={1} />
          <line x1={2} y1={10} x2={14} y2={10} strokeWidth={1} />
          <rect x={10} y={10} width={4} height={4} fill="currentColor" stroke="none" />
        </svg>
      );
    case "pyra":
      return (
        <svg {...common}>
          <path d="M8 2 L14.5 13.5 H1.5 Z" />
          <path d="M5.8 9.6 H10.2 L8 13.5 Z" strokeWidth={1} />
        </svg>
      );
    case "skewb":
      return (
        <svg {...common}>
          <rect x={2} y={2} width={12} height={12} rx={1.5} />
          <path d="M8 2 L14 8 L8 14 L2 8 Z" strokeWidth={1} />
        </svg>
      );
    case "mega":
      return (
        <svg {...common}>
          <path d="M8 1.8 L14.2 6.3 L11.8 13.6 H4.2 L1.8 6.3 Z" />
          <path d="M8 5.2 L10.8 7.2 L9.7 10.5 H6.3 L5.2 7.2 Z" strokeWidth={1} />
        </svg>
      );
    default:
      return grid(3);
  }
}
