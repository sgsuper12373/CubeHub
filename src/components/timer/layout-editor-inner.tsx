"use client";

import { GridLayout, verticalCompactor } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import {
  GRID_COLS,
  GRID_GAP,
  GRID_ROW_HEIGHT,
  PANEL_LABELS,
  PANEL_MIN,
  type PanelCell,
  type PanelId,
} from "@/lib/timer/layout";

/**
 * The draggable/resizable grid.
 *
 * Split into its own module so `next/dynamic` keeps react-grid-layout and its
 * two stylesheets out of the default /timer chunk — they only download when
 * the editor is opened.
 *
 * Note this is the v2 API: configuration is grouped into `gridConfig` /
 * `dragConfig` / `resizeConfig` objects rather than the flat `cols`/`rowHeight`
 * props of v1, and compaction is a function rather than a string. Importing
 * from `react-grid-layout/legacy` would restore the v1 shape but also
 * reintroduce `ReactDOM.findDOMNode`, which React 19 removed — so don't.
 */
export function LayoutEditorInner({
  cells,
  width,
  onChange,
  renderPanel,
}: {
  cells: PanelCell[];
  width: number;
  onChange: (cells: PanelCell[]) => void;
  renderPanel: (id: PanelId) => React.ReactNode;
}) {
  // The library measures against an explicit width; nothing to lay out yet.
  if (width === 0) return <div className="h-64" />;

  const layout = cells.map((cell) => ({
    ...cell,
    minW: PANEL_MIN[cell.i].w,
    minH: PANEL_MIN[cell.i].h,
  }));

  return (
    <GridLayout
      layout={layout}
      width={width}
      gridConfig={{
        cols: GRID_COLS,
        rowHeight: GRID_ROW_HEIGHT,
        margin: [GRID_GAP, GRID_GAP],
        containerPadding: [0, 0],
      }}
      // Panels move by their title bar only. Dragging from anywhere would
      // steal presses meant for a panel's own content.
      dragConfig={{ enabled: true, handle: ".panel-drag-handle" }}
      resizeConfig={{ enabled: true }}
      compactor={verticalCompactor}
      onLayoutChange={(next) => {
        onChange(
          next.map((c) => ({
            i: c.i as PanelId,
            x: c.x,
            y: c.y,
            w: c.w,
            h: c.h,
          })),
        );
      }}
    >
      {cells.map((cell) => (
        <div
          key={cell.i}
          className="flex flex-col overflow-hidden rounded-xl border-2 border-dashed border-primary/40 bg-card/40"
        >
          <div className="panel-drag-handle flex cursor-grab items-center justify-between gap-2 border-b border-border/50 bg-card/80 px-2 py-1 active:cursor-grabbing">
            <span className="text-[0.65rem] font-medium text-muted-foreground">
              {PANEL_LABELS[cell.i]}
            </span>
            <span className="font-mono text-[0.6rem] text-muted-foreground/70">
              {cell.w}×{cell.h}
            </span>
          </div>
          {/* Inert while editing — this is a preview of the panel, not a
              working control, and a live timer here would be a trap. */}
          <div className="pointer-events-none flex-1 overflow-hidden opacity-60">
            {renderPanel(cell.i)}
          </div>
        </div>
      ))}
    </GridLayout>
  );
}
