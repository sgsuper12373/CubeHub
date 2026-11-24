/**
 * Reads and writes for the daily scramble, through the browser Supabase
 * client (guests can read everything; posting needs a session). Every read
 * returns null or empty when the tables don't exist yet, so the card and the
 * daily timer degrade to "not available" before the migration is applied.
 */
import { createClient } from "@/lib/supabase/client";
import type { Penalty } from "@/lib/timer/types";

export type DailyScramble = { day: string; puzzle: string; scramble: string };

export type DailyRow = {
  userId: string;
  username: string | null;
  displayName: string | null;
  timeMs: number | null;
  penalty: Penalty;
  effectiveMs: number | null;
};

type RawRow = {
  user_id: string;
  time_ms: number | null;
  penalty: string;
  effective_ms: number | null;
  profiles: { username: string; display_name: string | null } | { username: string; display_name: string | null }[] | null;
};

function toRow(r: RawRow): DailyRow {
  const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
  return {
    userId: r.user_id,
    username: p?.username ?? null,
    displayName: p?.display_name ?? null,
    timeMs: r.time_ms,
    penalty: r.penalty === "plus2" || r.penalty === "dnf" ? r.penalty : "none",
    effectiveMs: r.effective_ms,
  };
}

const ROW = "user_id, time_ms, penalty, effective_ms, profiles(username, display_name)";

export async function fetchDaily(day: string): Promise<DailyScramble | null> {
  try {
    const { data, error } = await createClient()
      .from("daily_scrambles")
      .select("day, puzzle, scramble")
      .eq("day", day)
      .maybeSingle();
    if (error || !data) return null;
    return data as DailyScramble;
  } catch {
    return null;
  }
}

/** How many posted a result, and the fastest `limit` ranked ones. */
export async function fetchBoard(day: string, limit: number): Promise<{ solved: number; top: DailyRow[] }> {
  try {
    const supabase = createClient();
    const [count, top] = await Promise.all([
      supabase.from("daily_results").select("user_id", { count: "exact", head: true }).eq("day", day),
      supabase
        .from("daily_results")
        .select(ROW)
        .eq("day", day)
        .not("effective_ms", "is", null)
        .order("effective_ms", { ascending: true })
        .order("created_at", { ascending: true })
        .limit(limit),
    ]);
    if (count.error || top.error) return { solved: 0, top: [] };
    return { solved: count.count ?? 0, top: ((top.data ?? []) as unknown as RawRow[]).map(toRow) };
  } catch {
    return { solved: 0, top: [] };
  }
}

/** This cuber's posted result for the day, and their rank when it's ranked. */
export async function fetchMine(day: string, userId: string): Promise<{ row: DailyRow; rank: number | null } | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.from("daily_results").select(ROW).eq("day", day).eq("user_id", userId).maybeSingle();
    if (error || !data) return null;
    const row = toRow(data as unknown as RawRow);
    if (row.effectiveMs === null) return { row, rank: null };
    const faster = await supabase
      .from("daily_results")
      .select("user_id", { count: "exact", head: true })
      .eq("day", day)
      .lt("effective_ms", row.effectiveMs);
    return { row, rank: faster.error ? null : (faster.count ?? 0) + 1 };
  } catch {
    return null;
  }
}

export type PostResult = { ok: true; recorded: boolean } | { ok: false; error: string };

/** Posts the signed-in cuber's attempt. `recorded: false` means they'd already posted that day. */
export async function postDailyResult(day: string, timeMs: number, penalty: Penalty): Promise<PostResult> {
  try {
    const { data, error } = await createClient().rpc("submit_daily_result", {
      p_day: day,
      p_time_ms: Math.round(timeMs),
      p_penalty: penalty,
    });
    if (error) {
      if (error.code === "42501") return { ok: false, error: "Sign in to post your result." };
      if (error.message.includes("closed")) return { ok: false, error: "This daily has closed." };
      if (error.message.includes("implausible")) return { ok: false, error: "That time can't go on the leaderboard." };
      return { ok: false, error: "Couldn't post just now. Try again in a moment." };
    }
    return { ok: true, recorded: data === true };
  } catch {
    return { ok: false, error: "Couldn't post just now. Try again in a moment." };
  }
}

/** A row's name for the board: display name, else @username, else a neutral label (blocked or gone). */
export function rowName(row: DailyRow): string {
  return row.displayName?.trim() || (row.username ? `@${row.username}` : "A cuber");
}
