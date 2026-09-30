import type { Penalty } from "@/lib/timer/types";

/**
 * Per-variant statistics: one row of `v_drill_variant_stats` for signed-in
 * users, or the same shape computed from in-memory attempts for guests.
 * Medians exclude DNFs, like the database.
 */
export interface VariantStats {
  algorithmId: string;
  caseId: string;
  attempts: number;
  successes: number;
  medianMs: number | null;
  medianRecognitionMs: number | null;
  lastAttemptAt: string | null;
  ease: number | null;
  nextReviewAt: string | null;
}

/** One timed rep, as held on the client. */
export interface DrillAttempt {
  id: string;
  algorithmId: string;
  caseId: string;
  timeMs: number;
  penalty: Penalty;
  recognitionMs: number | null;
  createdAt: string;
}

/** The minimum of a case the ordering and recommendation logic needs. */
export interface DrillCaseRef {
  id: string;
  algorithms: { id: string; is_main: boolean }[];
}

export type DrillOrder = "random" | "weakest";

export type StatsByAlgorithm = ReadonlyMap<string, VariantStats>;
