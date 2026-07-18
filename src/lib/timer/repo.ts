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
  /** Newest first. */
  loadSolves(sessionId: string, limit?: number): Promise<Solve[]>;
  saveSolve(s: Solve, userId?: string): Promise<void>;
  updatePenalty(id: string, p: Penalty): Promise<void>;
  deleteSolve(id: string): Promise<void>;
  upsertSession(s: Session, userId?: string): Promise<void>;
  deleteSolvesInSession(sessionId: string): Promise<void>;
}
