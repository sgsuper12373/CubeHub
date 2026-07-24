import { createClient } from "@/lib/supabase/client";
import type { SolveRepository } from "./repo";
import type {
  PbCategory,
  Penalty,
  PersonalBest,
  Session,
  Solve,
  SolveMetric,
  TimerPuzzle,
} from "./types";

/**
 * Supabase-backed repository for authenticated users.
 *
 * Uses the browser client (RLS validates via the session cookie). All IDs
 * are client-generated UUIDs that also serve as the primary key — this makes
 * the local → cloud sync a plain idempotent upsert.
 *
 * DB design notes (docs/database.md):
 * - `effective_time_ms` is a generated column — never written, always read.
 * - `penalty` column drives the generated value; updating it is enough.
 * - `uq_one_active_session (user_id, puzzle_type) WHERE is_active` — only
 *   one active session per puzzle per user. Activation must deactivate first.
 * - Composite FK: `solves(session_id, user_id) → sessions(id, user_id)`.
 * - `(SELECT auth.uid()) = user_id` in policies; inserts must carry user_id.
 */

function getClient() {
  return createClient();
}

export function createSupabaseRepo(userId: string): SolveRepository {
  return {
    async loadSessions(puzzle) {
      const { data, error } = await getClient()
        .from("sessions")
        .select("id, puzzle_type, name, is_active, order_index")
        .eq("user_id", userId)
        .eq("puzzle_type", puzzle)
        .order("order_index");

      if (error) throw error;
      return (data ?? []).map(mapSession);
    },

    async loadSolves(sessionId, limit = 500) {
      const { data, error } = await getClient()
        .from("solves")
        .select(
          "id, session_id, puzzle_type, time_ms, penalty, effective_time_ms, scramble, notes, created_at",
        )
        .eq("session_id", sessionId)
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data ?? []).map(mapSolve);
    },

    async saveSolve(solve) {
      const { error } = await getClient().from("solves").upsert(
        {
          id: solve.id,
          user_id: userId,
          session_id: solve.sessionId,
          puzzle_type: solve.puzzle,
          time_ms: solve.timeMs,
          penalty: solve.penalty,
          scramble: solve.scramble,
          source: "web",
          created_at: solve.createdAt,
        },
        { onConflict: "id", ignoreDuplicates: true },
      );
      if (error) throw error;
    },

    async updatePenalty(id, penalty) {
      const { error } = await getClient()
        .from("solves")
        .update({ penalty })
        .eq("id", id)
        .eq("user_id", userId);
      if (error) throw error;
    },

    async updateNotes(id, notes) {
      const { error } = await getClient()
        .from("solves")
        .update({ notes })
        .eq("id", id)
        .eq("user_id", userId);
      if (error) throw error;
    },

    async deleteSolve(id) {
      // Soft delete — the AFTER UPDATE OF deleted_at trigger recomputes the PB.
      const { error } = await getClient()
        .from("solves")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", userId)
        .is("deleted_at", null);
      if (error) throw error;
    },

    async upsertSession(session) {
      // Deactivate other sessions of the same puzzle if this one is being activated.
      // This satisfies uq_one_active_session.
      if (session.isActive) {
        await getClient()
          .from("sessions")
          .update({ is_active: false })
          .eq("user_id", userId)
          .eq("puzzle_type", session.puzzle)
          .neq("id", session.id)
          .eq("is_active", true);
      }

      const { error } = await getClient().from("sessions").upsert(
        {
          id: session.id,
          user_id: userId,
          puzzle_type: session.puzzle,
          name: session.name,
          is_active: session.isActive,
          order_index: session.orderIndex,
        },
        { onConflict: "id" },
      );
      if (error) throw error;
    },

    async deleteSession(id) {
      const { error } = await getClient()
        .from("sessions")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      if (error) throw error;
    },

    async deleteSolvesInSession(sessionId) {
      // Soft delete the whole session's live solves in one statement; the
      // statement-level trigger recomputes the PB once.
      const { error } = await getClient()
        .from("solves")
        .update({ deleted_at: new Date().toISOString() })
        .eq("session_id", sessionId)
        .eq("user_id", userId)
        .is("deleted_at", null);
      if (error) throw error;
    },

    async restoreSolves(ids) {
      if (ids.length === 0) return;
      const { error } = await getClient()
        .from("solves")
        .update({ deleted_at: null })
        .in("id", ids)
        .eq("user_id", userId);
      if (error) throw error;
    },

    async loadSolveMetrics(puzzle, { since, limit = 5000 } = {}) {
      // Served by idx_solves_user_puzzle (user_id, puzzle_type, created_at desc).
      // The select is deliberately narrow — no scramble, no notes.
      let query = getClient()
        .from("solves")
        .select("id, session_id, time_ms, penalty, effective_time_ms, created_at")
        .eq("user_id", userId)
        .eq("puzzle_type", puzzle)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (since) query = query.gte("created_at", since);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map(mapMetric);
    },

    async loadPersonalBests(puzzle) {
      const { data, error } = await getClient()
        .from("personal_bests")
        .select("category, time_ms, solve_id, achieved_at")
        .eq("user_id", userId)
        .eq("puzzle_type", puzzle);

      if (error) throw error;
      // `category` also permits 'mean3', which the timer never produces.
      return (data ?? [])
        .filter((row) => CATEGORIES.includes(row.category as PbCategory))
        .map(mapPersonalBest);
    },

    async loadSolvesForExport(puzzle) {
      const { data, error } = await getClient()
        .from("solves")
        .select(
          "id, session_id, puzzle_type, time_ms, penalty, effective_time_ms, scramble, notes, created_at",
        )
        .eq("user_id", userId)
        .eq("puzzle_type", puzzle)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data ?? []).map(mapSolve);
    },
  };
}

const CATEGORIES: PbCategory[] = ["single", "ao5", "ao12", "ao50", "ao100"];

// ── Row → domain mappers ──

function mapSession(row: {
  id: string;
  puzzle_type: string;
  name: string;
  is_active: boolean;
  order_index: number;
}): Session {
  return {
    id: row.id,
    puzzle: row.puzzle_type as TimerPuzzle,
    name: row.name,
    isActive: row.is_active,
    orderIndex: row.order_index,
  };
}

function mapMetric(row: {
  id: string;
  session_id: string;
  time_ms: number;
  penalty: string;
  effective_time_ms: number | null;
  created_at: string;
}): SolveMetric {
  return {
    id: row.id,
    sessionId: row.session_id,
    timeMs: row.time_ms,
    penalty: row.penalty as Penalty,
    effectiveTimeMs: row.effective_time_ms,
    createdAt: row.created_at,
  };
}

function mapPersonalBest(row: {
  category: string;
  time_ms: number;
  solve_id: string | null;
  achieved_at: string;
}): PersonalBest {
  return {
    category: row.category as PbCategory,
    timeMs: row.time_ms,
    solveId: row.solve_id,
    achievedAt: row.achieved_at,
  };
}

function mapSolve(row: {
  id: string;
  session_id: string;
  puzzle_type: string;
  time_ms: number;
  penalty: string;
  effective_time_ms: number | null;
  scramble: string;
  notes: string | null;
  created_at: string;
}): Solve {
  return {
    id: row.id,
    sessionId: row.session_id,
    puzzle: row.puzzle_type as TimerPuzzle,
    timeMs: row.time_ms,
    penalty: row.penalty as Penalty,
    effectiveTimeMs: row.effective_time_ms,
    scramble: row.scramble,
    notes: row.notes,
    createdAt: row.created_at,
  };
}
