"use server";

import { getUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import type { Penalty } from "@/lib/timer/types";

import { toVariantStats, VARIANT_STATS_COLUMNS, type VariantStatsRow } from "./rows";
import type { VariantStats } from "./types";

/**
 * Drill attempt writes. Everything goes through the caller's own Supabase
 * client, so RLS (owner-scoped) is the real boundary; the checks here only turn
 * obviously bad input into a clear error instead of a database one.
 * drill_state is never written from here: triggers derive it from the attempts.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PENALTIES: ReadonlySet<string> = new Set(["none", "plus2", "dnf"]);
/** A single algorithm is seconds; anything past ten minutes is a forgotten timer. */
const MAX_TIME_MS = 10 * 60 * 1000;

export interface RecordAttemptInput {
  algorithmId: string;
  caseId: string;
  timeMs: number;
  penalty: Penalty;
  recognitionMs: number | null;
}

export interface AttemptResult {
  id: string;
  createdAt: string;
  /** Refreshed stats for every variant of the attempt's case. */
  stats: VariantStats[];
}

async function requireUser() {
  const user = await getUser();
  if (!user) throw new Error("Sign in to save drill attempts");
  return user;
}

function assertIds(...ids: string[]) {
  for (const id of ids) if (!UUID.test(id)) throw new Error("Invalid id");
}

function assertPenalty(p: string): asserts p is Penalty {
  if (!PENALTIES.has(p)) throw new Error("Invalid penalty");
}

async function caseStats(userId: string, caseId: string): Promise<VariantStats[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_drill_variant_stats")
    .select(VARIANT_STATS_COLUMNS)
    .eq("user_id", userId)
    .eq("case_id", caseId);
  if (error) throw new Error("Failed to load drill stats");
  return ((data ?? []) as VariantStatsRow[]).map(toVariantStats);
}

export async function recordDrillAttempt(input: RecordAttemptInput): Promise<AttemptResult> {
  const user = await requireUser();
  assertIds(input.algorithmId, input.caseId);
  assertPenalty(input.penalty);
  const timeMs = Math.round(input.timeMs);
  if (!Number.isFinite(timeMs) || timeMs <= 0 || timeMs > MAX_TIME_MS) throw new Error("Invalid time");
  const recognitionMs = input.recognitionMs === null ? null : Math.round(input.recognitionMs);
  if (recognitionMs !== null && (!Number.isFinite(recognitionMs) || recognitionMs < 0 || recognitionMs > MAX_TIME_MS)) {
    throw new Error("Invalid recognition time");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("drill_attempts")
    .insert({
      user_id: user.id,
      algorithm_id: input.algorithmId,
      time_ms: timeMs,
      penalty: input.penalty,
      recognition_ms: recognitionMs,
      source: "drill",
    })
    .select("id, created_at")
    .single();
  if (error || !data) {
    console.error("recordDrillAttempt failed", error);
    throw new Error("Failed to save attempt");
  }

  return { id: data.id, createdAt: data.created_at, stats: await caseStats(user.id, input.caseId) };
}

export async function setDrillAttemptPenalty(
  attemptId: string,
  caseId: string,
  penalty: Penalty,
): Promise<VariantStats[]> {
  const user = await requireUser();
  assertIds(attemptId, caseId);
  assertPenalty(penalty);

  const supabase = await createClient();
  const { error } = await supabase
    .from("drill_attempts")
    .update({ penalty })
    .eq("id", attemptId)
    .eq("user_id", user.id);
  if (error) {
    console.error("setDrillAttemptPenalty failed", error);
    throw new Error("Failed to update attempt");
  }
  return caseStats(user.id, caseId);
}

export async function deleteDrillAttempt(attemptId: string, caseId: string): Promise<VariantStats[]> {
  const user = await requireUser();
  assertIds(attemptId, caseId);

  const supabase = await createClient();
  const { error } = await supabase
    .from("drill_attempts")
    .delete()
    .eq("id", attemptId)
    .eq("user_id", user.id);
  if (error) {
    console.error("deleteDrillAttempt failed", error);
    throw new Error("Failed to delete attempt");
  }
  return caseStats(user.id, caseId);
}
