import type { VariantStats } from "./types";

/** A `v_drill_variant_stats` row as PostgREST returns it. */
export interface VariantStatsRow {
  algorithm_id: string;
  case_id: string;
  attempts: number;
  successes: number;
  median_ms: number | null;
  median_recognition_ms: number | null;
  last_attempt_at: string | null;
  ease: number | string | null;
  next_review_at: string | null;
}

export const VARIANT_STATS_COLUMNS =
  "algorithm_id, case_id, attempts, successes, median_ms, median_recognition_ms, last_attempt_at, ease, next_review_at";

export function toVariantStats(row: VariantStatsRow): VariantStats {
  return {
    algorithmId: row.algorithm_id,
    caseId: row.case_id,
    attempts: row.attempts,
    successes: row.successes,
    medianMs: row.median_ms,
    medianRecognitionMs: row.median_recognition_ms,
    lastAttemptAt: row.last_attempt_at,
    // numeric comes back as a string from PostgREST.
    ease: row.ease === null ? null : Number(row.ease),
    nextReviewAt: row.next_review_at,
  };
}
