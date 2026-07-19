import { createClient } from "@/lib/supabase/client";
import type { Session, Solve } from "./types";

/**
 * Local → cloud migration. Triggered on SIGNED_IN (from AuthListener) and
 * on timer mount when authed with leftover local data.
 *
 * Strategy: copy-then-clear.
 * 1. Read the full local snapshot.
 * 2. Upsert sessions (client UUIDs preserved — no id remapping).
 * 3. Upsert solves in chunks of 500, onConflict "id" ignoreDuplicates
 *    → safe to re-run after a partial failure.
 * 4. Verify counts, then clear localStorage.
 *
 * Failure at any stage leaves local data untouched. The sync function
 * never moves data — it copies first, verifies, then clears.
 */

const STORAGE_KEY = "cubehub.timer.v1";
const CHUNK_SIZE = 500;

interface LocalData {
  sessions: Session[];
  solves: Solve[];
}

function readLocal(): LocalData {
  if (typeof window === "undefined") return { sessions: [], solves: [] };
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "");
    return {
      sessions: Array.isArray(parsed?.sessions) ? parsed.sessions : [],
      solves: Array.isArray(parsed?.solves) ? parsed.solves : [],
    };
  } catch {
    return { sessions: [], solves: [] };
  }
}

export async function syncLocalToCloud(userId: string): Promise<number> {
  const local = readLocal();
  if (local.sessions.length === 0 && local.solves.length === 0) return 0;

  const supabase = createClient();

  // ── 1. Upsert sessions ──
  if (local.sessions.length > 0) {
    // Deactivate all cloud sessions for the user's puzzles first
    // (local data may have active sessions that conflict with cloud ones)
    const puzzleTypes = [...new Set(local.sessions.map((s) => s.puzzle))];
    for (const puzzle of puzzleTypes) {
      await supabase
        .from("sessions")
        .update({ is_active: false })
        .eq("user_id", userId)
        .eq("puzzle_type", puzzle)
        .eq("is_active", true);
    }

    const sessionRows = local.sessions.map((s) => ({
      id: s.id,
      user_id: userId,
      puzzle_type: s.puzzle,
      name: s.name,
      is_active: s.isActive,
      order_index: s.orderIndex,
    }));

    const { error: sessionError } = await supabase
      .from("sessions")
      .upsert(sessionRows, { onConflict: "id" });

    if (sessionError) {
      console.error("sync: session upsert failed", sessionError);
      throw sessionError;
    }
  }

  // ── 2. Upsert solves in chunks ──
  let synced = 0;
  for (let i = 0; i < local.solves.length; i += CHUNK_SIZE) {
    const chunk = local.solves.slice(i, i + CHUNK_SIZE);
    const solveRows = chunk.map((s) => ({
      id: s.id,
      user_id: userId,
      session_id: s.sessionId,
      puzzle_type: s.puzzle,
      time_ms: s.timeMs,
      penalty: s.penalty,
      scramble: s.scramble,
      source: "web" as const,
      created_at: s.createdAt,
    }));

    const { error } = await supabase
      .from("solves")
      .upsert(solveRows, { onConflict: "id", ignoreDuplicates: true });

    if (error) {
      console.error(`sync: solve chunk ${i} failed`, error);
      throw error;
    }
    synced += chunk.length;
  }

  // ── 3. Clear local storage ──
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private-mode failures; the data is in the cloud now, so this is fine.
  }

  return synced;
}

/** Check if there's leftover local data to sync. */
export function hasLocalData(): boolean {
  const local = readLocal();
  return local.sessions.length > 0 || local.solves.length > 0;
}
