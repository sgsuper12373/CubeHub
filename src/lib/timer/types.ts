import type { TimerEventId } from "./events";

/**
 * Shared types for the timer module. Kept dependency-free so the stores,
 * repositories and pure stat helpers can all import from here without
 * pulling React, Zustand or Supabase into each other's bundles.
 *
 * DB mapping notes (see docs/database.md):
 * - `TimerPuzzle` is the subset of the DB `puzzle_type` enum the timer offers
 *   (see events.ts).
 * - `Penalty` mirrors the DB `penalty_type` enum exactly.
 * - `InspectionMode` is a UI concept; it maps to `user_settings` as
 *   off → inspection_type 'none', 8s → 'custom' + custom_inspection_secs 8,
 *   15s → 'wca_15s'.
 */

export type TimerPuzzle = TimerEventId;

export type Penalty = "none" | "plus2" | "dnf";

export type InspectionMode = "off" | "8s" | "15s";

export type InspectionAlert = "voice" | "beep" | "off";

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
  /**
   * How inspection calls out the 8s/12s marks (4s/6s with 8s inspection):
   * spoken, beeps, or not at all. Client-only (localStorage).
   */
  inspectionAlert: InspectionAlert;
  /**
   * 2D net or a 3D cube. 3D costs a WebGL context, so 2D is the default.
   * Placement and size are not settings — the preview is a panel in the
   * layout grid, so it is positioned and resized there.
   */
  previewDimension: "2D" | "3D";
  /** Font size percentage for the main timer digits. 100 = default size. */
  timerFontSize: number;
  /** Disable starting the timer by clicking with a mouse (touch is still allowed) */
  disableMouseClick: boolean;
  /** Time solves with the timer, or type results in. Client-only (localStorage). */
  inputMode: "timer" | "typing";
}

export const DEFAULT_TIMER_SETTINGS: TimerSettings = {
  inspectionMode: "15s",
  hideTimeWhileSolving: false,
  showScramblePreview: true,
  trigger: "spacebar",
  holdMs: 300,
  precision: 2,
  inspectionAlert: "voice",
  previewDimension: "2D",
  timerFontSize: 100,
  disableMouseClick: false,
  inputMode: "timer",
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
  /**
   * How the time was produced (DB `solves.source`). Absent means "web", the
   * timer. "manual" marks a typed-in time, so leaderboards can leave it out.
   */
  source?: "web" | "manual";
  /**
   * DB `solves.scramble_type`. Absent means "random_state", a generated
   * scramble; "custom" marks one the user pasted in.
   */
  scrambleType?: "random_state" | "custom";
  /** ISO timestamp. Wall-clock is fine for metadata; never used for timing math. */
  createdAt: string;
  /**
   * Soft-delete marker. `null`/absent = live. Reset and delete set it instead
   * of removing the row, so undo is durable (survives reload) and a future
   * "Recently deleted" view / retention policy has data to work with. Reads
   * filter it out; the DB PB-recompute trigger treats a set value as gone.
   */
  deletedAt?: string | null;
  /**
   * Left out of records (DB `solves.excluded`). Absent = false. See
   * misfire.ts for which solves count.
   */
  excluded?: boolean;
  /**
   * Why it's left out: "auto_misstop" when the timer flagged it as a
   * suspected mis-stop, "user" when its owner left it out. Absent when it counts.
   */
  excludedReason?: "user" | "auto_misstop";
  /** Its owner marked a flagged solve as real, so nothing flags it again. */
  misstopConfirmed?: boolean;
}

/**
 * A solve stripped to what analytics actually plot. `Solve` minus `puzzle`,
 * `scramble`, `notes` and `deletedAt` — the scramble alone is ~60 bytes a row,
 * which is nothing over one session and a lot over a year of them.
 *
 * The field names deliberately match `Solve`, so a `SolveMetric` satisfies the
 * `SolveTimes` shape every helper in `stats.ts` already takes and none of them
 * needed changing. `timeMs` is kept for exactly that reason: local rows have no
 * database to generate `effectiveTimeMs`, so `effectiveMs()` derives it.
 */
export interface SolveMetric {
  id: string;
  sessionId: string;
  timeMs: number;
  penalty: Penalty;
  effectiveTimeMs: number | null;
  createdAt: string;
  excluded?: boolean;
  /** As `Solve.excludedReason`: the trend chart draws flagged mis-stops hollow. */
  excludedReason?: "user" | "auto_misstop";
}

/** Categories `personal_bests.category` accepts that the timer produces. */
export type PbCategory = "single" | "mean3" | "ao5" | "ao12" | "ao50" | "ao100";

/**
 * An all-time personal best. Cloud users read these from `personal_bests`,
 * maintained by database triggers; logged-out users get the same shape computed
 * from local storage. `solveId` is null when the solve behind it was deleted —
 * the row itself is authoritative either way.
 */
export interface PersonalBest {
  category: PbCategory;
  timeMs: number;
  solveId: string | null;
  achievedAt: string;
}

export interface Session {
  /** Client-generated UUID, same rationale as Solve.id. */
  id: string;
  puzzle: TimerPuzzle;
  name: string;
  isActive: boolean;
  orderIndex: number;
}
