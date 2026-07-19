/**
 * The rearrangeable /timer layout.
 *
 * Stored as plain `{i,x,y,w,h}` cells on a 12-column grid — the same shape
 * react-grid-layout uses, which is what lets the normal (non-editing) view
 * render the identical arrangement with nothing but CSS grid. The library is
 * only pulled in when the user actually opens the layout editor, so a regular
 * practice session pays none of its bundle cost. `docs/roadmap.md` makes "the
 * timer loads in under a second" a design principle; this keeps that true.
 *
 * Desktop only. Below `md` the timer renders its original fixed stack, because
 * the primary mobile interaction is tapping anywhere on a full-bleed stage and
 * a grid would take that away.
 */

export const PANEL_IDS = [
  "scramble",
  "timer",
  "preview",
  "stats",
  "trend",
  "solves",
] as const;

export type PanelId = (typeof PANEL_IDS)[number];

export interface PanelCell {
  i: PanelId;
  x: number;
  y: number;
  w: number;
  h: number;
}

export const GRID_COLS = 12;
export const GRID_ROW_HEIGHT = 48;
export const GRID_GAP = 8;

/** Human labels for the editor's panel headers. */
export const PANEL_LABELS: Record<PanelId, string> = {
  scramble: "Scramble",
  timer: "Timer",
  preview: "Cube preview",
  stats: "Averages",
  trend: "Trend",
  solves: "Solves",
};

/** Floors, so a panel can't be dragged down to an unreadable sliver. */
export const PANEL_MIN: Record<PanelId, { w: number; h: number }> = {
  scramble: { w: 3, h: 2 },
  timer: { w: 3, h: 4 },
  preview: { w: 2, h: 3 },
  stats: { w: 2, h: 2 },
  trend: { w: 2, h: 2 },
  solves: { w: 2, h: 3 },
};

/** Mirrors the pre-grid arrangement, so nothing moves for existing users. */
export const DEFAULT_LAYOUT: PanelCell[] = [
  { i: "scramble", x: 0, y: 0, w: 8, h: 2 },
  { i: "timer", x: 0, y: 2, w: 8, h: 7 },
  { i: "preview", x: 8, y: 0, w: 4, h: 4 },
  { i: "stats", x: 8, y: 4, w: 4, h: 2 },
  { i: "trend", x: 8, y: 6, w: 4, h: 2 },
  { i: "solves", x: 8, y: 8, w: 4, h: 5 },
];

const STORAGE_KEY = "cubehub.layout.v1";

function isPanelId(v: unknown): v is PanelId {
  return typeof v === "string" && (PANEL_IDS as readonly string[]).includes(v);
}

function coerceCell(raw: unknown): PanelCell | null {
  if (typeof raw !== "object" || raw === null) return null;
  const c = raw as Record<string, unknown>;
  if (!isPanelId(c.i)) return null;

  const num = (v: unknown, fallback: number) =>
    typeof v === "number" && Number.isFinite(v) ? Math.round(v) : fallback;

  const min = PANEL_MIN[c.i];
  const w = Math.min(GRID_COLS, Math.max(min.w, num(c.w, min.w)));
  const x = Math.min(GRID_COLS - w, Math.max(0, num(c.x, 0)));
  return {
    i: c.i,
    x,
    w,
    y: Math.max(0, num(c.y, 0)),
    h: Math.max(min.h, num(c.h, min.h)),
  };
}

/**
 * Read the saved layout, repairing anything malformed rather than throwing.
 * Any panel missing from storage (e.g. one added in a later release) is
 * appended from the default, so an old saved layout never hides a new panel.
 */
export function loadLayout(): PanelCell[] {
  if (typeof localStorage === "undefined") return DEFAULT_LAYOUT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LAYOUT;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_LAYOUT;

    const cells = parsed
      .map(coerceCell)
      .filter((c): c is PanelCell => c !== null);
    if (cells.length === 0) return DEFAULT_LAYOUT;

    const seen = new Set(cells.map((c) => c.i));
    const maxY = Math.max(...cells.map((c) => c.y + c.h), 0);
    let appendY = maxY;
    for (const fallback of DEFAULT_LAYOUT) {
      if (seen.has(fallback.i)) continue;
      cells.push({ ...fallback, x: 0, y: appendY });
      appendY += fallback.h;
    }
    return cells;
  } catch {
    return DEFAULT_LAYOUT;
  }
}

export function saveLayout(cells: PanelCell[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cells));
  } catch {
    // Private browsing or a full quota — the layout just won't persist.
  }
}

export function resetLayout(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing actionable.
  }
}

/**
 * Panels that also appear on mobile. The stats trio lives in the existing
 * slide-up drawer there, so showing them in the stack too would duplicate them.
 */
export const MOBILE_PANELS: PanelId[] = ["scramble", "preview", "timer"];

/**
 * Placement is emitted as custom properties rather than `grid-column` /
 * `grid-row` directly, because the grid must only apply from `md` up and an
 * inline style cannot carry a media query. `globals.css` consumes these inside
 * the breakpoint, so below `md` the same markup lays out as a plain flex stack
 * — one DOM tree, no JS breakpoint check, and <TouchStage/> mounts exactly
 * once (it owns window-level key listeners, so a second mount would double
 * every press).
 */
export function cellStyle(cell: PanelCell): React.CSSProperties {
  return {
    "--gc": `${cell.x + 1} / span ${cell.w}`,
    "--gr": `${cell.y + 1} / span ${cell.h}`,
  } as React.CSSProperties;
}

/** DOM order drives the mobile stack, so sort by reading order. */
export function inReadingOrder(cells: PanelCell[]): PanelCell[] {
  return [...cells].sort((a, b) => a.y - b.y || a.x - b.x);
}
