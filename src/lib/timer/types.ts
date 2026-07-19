/**
 * Shared types for the timer module. Kept dependency-free so the stores,
 * repositories and pure stat helpers can all import from here without
 * pulling React, Zustand or Supabase into each other's bundles.
 *
 * DB mapping notes (see docs/database.md):
 * - `TimerPuzzle` is the Phase-1 subset of the DB `puzzle_type` enum.
 * - `Penalty` mirrors the DB `penalty_type` enum exactly.
 * - `InspectionMode` is a UI concept; it maps to `user_settings` as
 *   off → inspection_type 'none', 8s → 'custom' + custom_inspection_secs 8,
 *   15s → 'wca_15s'.
 */

export type TimerPuzzle = "333" | "222";

export type Penalty = "none" | "plus2" | "dnf";

export type InspectionMode = "off" | "8s" | "15s";

export type TimerPhase =
  | "idle"
  | "inspecting"
  | "holding"
  | "ready"
  | "running"
  | "stopped";

export interface TimerSettings {
  inspectionMode: InspectionMode;
  hideTimeWhileSolving: boolean;
  showScramblePreview: boolean;
  /** Informational (mirrors user_settings.timer_trigger); both input engines are always active. */
  trigger: "spacebar" | "touch";
  /** Hold-to-start threshold in ms. Client-only (localStorage). */
  holdMs: number;
  /** Decimal places in time display. Client-only (localStorage). */
  precision: 2 | 3;
  /** Whether inspection voice callouts are enabled. Client-only (localStorage). */
  voiceEnabled: boolean;
  /**
   * 2D net or a 3D cube. 3D costs a WebGL context, so 2D is the default.
   * Placement and size are not settings — the preview is a panel in the
   * layout grid, so it is positioned and resized there.
   */
  previewDimension: "2D" | "3D";
}

export const DEFAULT_TIMER_SETTINGS: TimerSettings = {
  inspectionMode: "15s",
  hideTimeWhileSolving: false,
  showScramblePreview: true,
  trigger: "spacebar",
  holdMs: 300,
  precision: 2,
  voiceEnabled: true,
  previewDimension: "2D",
};

export interface Solve {
  /** Client-generated UUID — also the cloud primary key; makes sync idempotent. */
  id: string;
  sessionId: string;
  puzzle: TimerPuzzle;
  /** Raw stopped time. The DB check requires > 0; a DNF keeps its real time. */
  timeMs: number;
  penalty: Penalty;
  /**
   * Cloud rows: the DB generated column `effective_time_ms`, read back as-is.
   * Local rows: null — derive on demand with `effectiveMs()` from stats.ts,
   * the one place allowed to mirror the DB CASE expression.
   */
  effectiveTimeMs: number | null;
  scramble: string;
  notes: string | null;
  /** ISO timestamp. Wall-clock is fine for metadata; never used for timing math. */
  createdAt: string;
}

export interface Session {
  /** Client-generated UUID, same rationale as Solve.id. */
  id: string;
  puzzle: TimerPuzzle;
  name: string;
  isActive: boolean;
  orderIndex: number;
}
