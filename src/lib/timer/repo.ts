import type {
  Penalty,
  PersonalBest,
  Session,
  Solve,
  SolveMetric,
  TimerPuzzle,
} from "./types";

/** How far back "Recently deleted" looks. */
export const RECENTLY_DELETED_DAYS = 30;

export function recentlyDeletedSince(now: Date = new Date()): string {
  return new Date(now.getTime() - RECENTLY_DELETED_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Persistence boundary for the timer. Two implementations:
 * repo-local.ts (localStorage, logged out) and repo-supabase.ts (cloud).
 * The session store picks one at hydrate time based on auth state; nothing
 * above the store knows which is active.
 *
 * All ids are client-generated UUIDs, so the same Solve/Session objects are
 * valid in both backends and the local → cloud migration (sync.ts) is a
 * plain idempotent upsert.
 */
export interface SolveRepository {
  loadSessions(puzzle: TimerPuzzle): Promise<Session[]>;
  /** Newest first. Excludes soft-deleted solves. */
  loadSolves(sessionId: string, limit?: number): Promise<Solve[]>;
  saveSolve(s: Solve, userId?: string): Promise<void>;
  updatePenalty(id: string, p: Penalty): Promise<void>;
  updateNotes(id: string, notes: string): Promise<void>;
  /**
   * Leave a solve out of records (reason "user"), or put it back. Putting it
   * back also marks it real (`misstopConfirmed`), so a flagged mis-stop is
   * never flagged again. The DB recomputes PBs and badges.
   */
  updateExcluded(id: string, excluded: boolean): Promise<void>;
  /**
   * Raw times of the newest counted solves for a puzzle, across sessions,
   * newest first: not excluded, not DNF, not deleted. What the relative
   * mis-stop rule compares against (misfire.ts).
   */
  loadRecentCountedTimes(puzzle: TimerPuzzle, limit: number): Promise<number[]>;
  /** Soft delete — sets deleted_at. Reversible via restoreSolves. */
  deleteSolve(id: string): Promise<void>;
  upsertSession(s: Session, userId?: string): Promise<void>;
  /** Hard delete — removes the session; its solves cascade away for good. */
  deleteSession(id: string): Promise<void>;
  /** Soft delete every live solve in the session. Reversible via restoreSolves. */
  deleteSolvesInSession(sessionId: string): Promise<void>;
  /** Clear the soft-delete marker, bringing the solves back. */
  restoreSolves(ids: string[]): Promise<void>;
  /**
   * Soft-deleted solves for a puzzle from the last `RECENTLY_DELETED_DAYS`,
   * most recently deleted first, with `deletedAt` set.
   */
  loadDeletedSolves(puzzle: TimerPuzzle, limit?: number): Promise<Solve[]>;
  /** One live solve with everything (scramble, notes), or null if it's gone. */
  loadSolve(id: string): Promise<Solve | null>;
  /** Hard delete — gone for good. Only offered for solves already soft-deleted. */
  purgeSolves(ids: string[]): Promise<void>;

  // ── Analytics reads (Phase 2) ──
  // Deliberately separate from loadSolves: these cross session boundaries and
  // can return thousands of rows, so they drop the scramble and notes that the
  // solve list needs and analytics never look at.

  /**
   * Every surviving solve for a puzzle, across all its sessions, newest first —
   * the same ordering as `loadSolves`, which is what the `stats.ts` helpers
   * expect. `since` is an ISO timestamp.
   */
  loadSolveMetrics(
    puzzle: TimerPuzzle,
    opts?: { since?: string; until?: string; limit?: number },
  ): Promise<SolveMetric[]>;

  /**
   * The solves behind a personal best, newest first: the `n` counted solves of
   * that solve's session up to and including it (n = 1 for a single), with
   * scrambles. Fewer if some have since been deleted.
   */
  loadWindowSolves(solveId: string, n: number): Promise<Solve[]>;

  /**
   * All-time personal bests for a puzzle. The cloud reads the authoritative
   * `personal_bests` rows the database maintains; local storage has no triggers,
   * so it computes the same values from the solves it holds.
   */
  loadPersonalBests(puzzle: TimerPuzzle): Promise<PersonalBest[]>;

  /**
   * How many live solves each puzzle has (deleted ones left out), for the
   * Stats event picker. Puzzles with none are absent.
   */
  loadEventCounts(): Promise<Partial<Record<TimerPuzzle, number>>>;

  /**
   * Every surviving solve for a puzzle with nothing dropped — scramble and
   * notes included. Separate from `loadSolveMetrics` because export has the
   * opposite requirement to analytics: losslessness over payload size.
   */
  loadSolvesForExport(puzzle: TimerPuzzle): Promise<Solve[]>;

  /**
   * Bulk-write imported sessions and solves, returning how many solves landed.
   *
   * Separate from `saveSolve` because an import is thousands of rows: one call
   * each would be thousands of round trips. Ids are caller-supplied and
   * deterministic, so this is idempotent — importing the same file twice adds
   * nothing the second time.
   */
  importData(sessions: Session[], solves: Solve[]): Promise<number>;
}
