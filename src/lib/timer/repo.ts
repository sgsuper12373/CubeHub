import type { Penalty, Session, Solve, TimerPuzzle } from "./types";

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
  /** Soft delete — sets deleted_at. Reversible via restoreSolves. */
  deleteSolve(id: string): Promise<void>;
  upsertSession(s: Session, userId?: string): Promise<void>;
  /** Hard delete — removes the session; its solves cascade away for good. */
  deleteSession(id: string): Promise<void>;
  /** Soft delete every live solve in the session. Reversible via restoreSolves. */
  deleteSolvesInSession(sessionId: string): Promise<void>;
  /** Clear the soft-delete marker, bringing the solves back. */
  restoreSolves(ids: string[]): Promise<void>;
}
