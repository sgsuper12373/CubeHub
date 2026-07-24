"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The hover readout. HTML rather than SVG `<text>`, so it inherits the app's
 * type and card styling instead of reimplementing them in shapes.
 *
 * Positioned by the caller in pixels relative to the chart container, which
 * must be `relative`. It flips to the left of the cursor past the midpoint so
 * it never runs off the right edge, and it is `pointer-events-none` so it can
 * never sit between the pointer and the marks it describes.
 */
export function ChartTooltip({
  x,
  y,
  containerWidth,
  children,
}: {
  x: number;
  y: number;
  containerWidth: number;
  children: ReactNode;
}) {
  const flip = x > containerWidth / 2;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "pointer-events-none absolute z-10 min-w-[7rem] rounded-md border border-border",
        "bg-popover px-2.5 py-1.5 text-xs shadow-lg",
      )}
      style={{
        left: x,
        top: y,
        transform: `translate(${flip ? "calc(-100% - 12px)" : "12px"}, -50%)`,
      }}
    >
      {children}
    </div>
  );
}

/** One label/value line inside a tooltip. */
export function TooltipRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  /** Series swatch — the mark carries identity, the text stays ink-coloured. */
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {color && (
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ background: color }}
            aria-hidden
          />
        )}
        {label}
      </span>
      <span className="font-mono tabular-nums text-foreground">{value}</span>
    </div>
  );
}
