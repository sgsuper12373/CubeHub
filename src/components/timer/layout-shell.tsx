"use client";

import { Check, LayoutGrid, RotateCcw } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  cellStyle,
  GRID_GAP,
  GRID_ROW_HEIGHT,
  inReadingOrder,
  MOBILE_PANELS,
  PANEL_LABELS,
  type PanelId,
} from "@/lib/timer/layout";
import { cn } from "@/lib/utils";
import { useLayoutStore } from "@/stores/layout-store";

const LayoutEditorInner = dynamic(
  () => import("./layout-editor-inner").then((m) => m.LayoutEditorInner),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Loading editor…
      </div>
    ),
  },
);

/**
 * Desktop panel layout for /timer.
 *
 * Two render paths over one stored arrangement:
 *   - resting  → the `.layout-grid` CSS in globals.css. No library, no
 *                measurement, and it degrades to a flex stack below `md`.
 *   - editing  → react-grid-layout, imported on demand.
 *
 * Both consume the same `{i,x,y,w,h}` cells, so what you arrange in the editor
 * is exactly what you get back out of it. The library never enters the default
 * /timer chunk, which keeps the roadmap's "timer loads in under a second".
 */
export function LayoutShell({
  renderPanel,
  className,
}: {
  renderPanel: (id: PanelId) => React.ReactNode;
  className?: string;
}) {
  const cells = useLayoutStore((s) => s.cells);
  const editing = useLayoutStore((s) => s.editing);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    useLayoutStore.getState().hydrate();
  }, []);

  // react-grid-layout needs an explicit pixel width. Measured only while
  // editing — the resting path is fluid and needs no observer.
  useEffect(() => {
    if (!editing) return;
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, [editing]);

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      {/* Editing is a desktop affordance; the grid itself only exists at md+. */}
      <div className="hidden items-center justify-end gap-1 px-2 py-1 md:flex">
        {editing && (
          <Button
            variant="ghost"
            size="xs"
            onClick={(e) => {
              e.currentTarget.blur();
              useLayoutStore.getState().reset();
            }}
          >
            <RotateCcw />
            Reset
          </Button>
        )}
        <Button
          variant={editing ? "default" : "ghost"}
          size="xs"
          aria-pressed={editing}
          onClick={(e) => {
            // Blur so the next Space reaches the timer, not this button.
            e.currentTarget.blur();
            useLayoutStore.getState().setEditing(!editing);
          }}
        >
          {editing ? <Check /> : <LayoutGrid />}
          {editing ? "Done" : "Edit layout"}
        </Button>
      </div>

      <div ref={containerRef} className="flex min-h-0 flex-1 flex-col">
        {editing ? (
          <LayoutEditorInner
            cells={cells}
            width={width}
            onChange={(next) => useLayoutStore.getState().setCells(next)}
            renderPanel={renderPanel}
          />
        ) : (
          <div
            className="layout-grid"
            style={
              {
                "--layout-gap": `${GRID_GAP}px`,
                "--layout-row-h": `${GRID_ROW_HEIGHT}px`,
              } as React.CSSProperties
            }
          >
            {inReadingOrder(cells).map((cell) => (
              <div
                key={cell.i}
                data-panel={cell.i}
                style={cellStyle(cell)}
                className={cn(
                  "flex min-h-0 min-w-0 flex-col overflow-hidden",
                  // Stats panels live in the mobile drawer instead, so showing
                  // them in the stack too would duplicate them.
                  !MOBILE_PANELS.includes(cell.i) && "hidden md:flex",
                  // Titled card chrome from md up; mobile stays full-bleed so
                  // its flex layout is untouched.
                  "md:rounded-xl md:border md:border-border md:bg-card/40",
                )}
              >
                {/* The scramble reads for itself; every other panel is titled. */}
                {cell.i !== "scramble" && (
                  <div className="hidden shrink-0 items-center px-3 pt-2.5 pb-1 md:flex">
                    <span className="text-xs font-semibold text-foreground">
                      {PANEL_LABELS[cell.i]}
                    </span>
                  </div>
                )}
                {renderPanel(cell.i)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
