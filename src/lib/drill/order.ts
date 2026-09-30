import { medianMs } from "@/lib/timer/stats";

import type { DrillCaseRef, DrillOrder, StatsByAlgorithm, VariantStats } from "./types";

/**
 * The variant a user drills for a case: whichever they used most recently,
 * else the case's main algorithm, else its first approved one. Derived from the
 * attempts, so switching variant is simply drilling the other one.
 */
export function currentVariantId(c: DrillCaseRef, stats: StatsByAlgorithm): string | null {
  let latest: VariantStats | null = null;
  for (const a of c.algorithms) {
    const s = stats.get(a.id);
    if (s?.lastAttemptAt && (!latest || s.lastAttemptAt > (latest.lastAttemptAt ?? ""))) {
      latest = s;
    }
  }
  if (latest) return latest.algorithmId;
  return (c.algorithms.find((a) => a.is_main) ?? c.algorithms[0])?.id ?? null;
}

interface CaseWeakness {
  c: DrillCaseRef;
  /** 0 = due for review, 1 = never drilled, 2 = everything else. */
  tier: 0 | 1 | 2;
  /** Higher is weaker. Only meaningful within tiers 0 and 2. */
  score: number;
}

function weakness(
  c: DrillCaseRef,
  stats: StatsByAlgorithm,
  setMedian: number | null,
  now: number,
): CaseWeakness {
  let attempts = 0;
  let successes = 0;
  let due = false;
  for (const a of c.algorithms) {
    const s = stats.get(a.id);
    if (!s) continue;
    attempts += s.attempts;
    successes += s.successes;
    if (s.nextReviewAt && Date.parse(s.nextReviewAt) <= now) due = true;
  }
  if (attempts === 0) return { c, tier: 1, score: 0 };

  // Speed is judged on the variant actually in use, relative to the set.
  const currentId = currentVariantId(c, stats);
  const median = currentId ? (stats.get(currentId)?.medianMs ?? null) : null;
  const slowness = median !== null && setMedian ? median / setMedian : 1;
  const failRate = 1 - successes / attempts;

  // Failing a case outweighs being slow at it: a botched algorithm is a wrong
  // cube, a slow one is merely slow. Half the reps failed scores as badly as
  // being three times the set median.
  return { c, tier: due ? 0 : 2, score: failRate * 4 + slowness };
}

function medianOf(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Cases from weakest to strongest: due reviews first, then cases never drilled
 * (in their set order), then the rest by failure rate and relative slowness.
 */
export function weakestFirst(
  cases: readonly DrillCaseRef[],
  stats: StatsByAlgorithm,
  now: number = Date.now(),
): DrillCaseRef[] {
  const medians: number[] = [];
  for (const c of cases) {
    const id = currentVariantId(c, stats);
    const m = id ? stats.get(id)?.medianMs : null;
    if (m != null) medians.push(m);
  }
  const setMedian = medianOf(medians);

  return cases
    .map((c, index) => ({ ...weakness(c, stats, setMedian, now), index }))
    .sort((a, b) => a.tier - b.tier || (a.tier === 1 ? a.index - b.index : b.score - a.score))
    .map((w) => w.c);
}

/** How many of the weakest cases the next pick is drawn from. */
const WEAKEST_POOL = 3;

/**
 * Picks the next case to drill. Never the same case twice in a row (unless the
 * set has only one). "weakest" draws from the few weakest cases, weighted
 * towards the weakest, so the order is not predictable enough to memorise.
 */
export function nextCase<T extends DrillCaseRef>(
  cases: readonly T[],
  stats: StatsByAlgorithm,
  order: DrillOrder,
  lastCaseId: string | null,
  random: () => number = Math.random,
  now: number = Date.now(),
): T | null {
  if (cases.length === 0) return null;
  const candidates = cases.length > 1 ? cases.filter((c) => c.id !== lastCaseId) : [...cases];

  if (order === "random") {
    return candidates[Math.floor(random() * candidates.length)];
  }

  const ranked = weakestFirst(candidates, stats, now) as T[];
  const pool = ranked.slice(0, WEAKEST_POOL);
  // Weights n, n-1, … 1: the weakest case is the most likely pick.
  const weights = pool.map((_, i) => pool.length - i);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = random() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r < 0) return pool[i];
  }
  return pool[pool.length - 1];
}

/**
 * Per-variant statistics computed from in-memory attempts: the guest path, and
 * the optimistic path before the server answers. Mirrors the view's medians
 * (DNFs excluded, percentile_cont midpoint for even counts).
 */
export function statsFromAttempts(
  attempts: readonly {
    algorithmId: string;
    caseId: string;
    timeMs: number;
    penalty: "none" | "plus2" | "dnf";
    recognitionMs: number | null;
    createdAt: string;
  }[],
): Map<string, VariantStats> {
  const groups = new Map<string, (typeof attempts)[number][]>();
  for (const a of attempts) {
    const list = groups.get(a.algorithmId);
    if (list) list.push(a);
    else groups.set(a.algorithmId, [a]);
  }

  const out = new Map<string, VariantStats>();
  for (const [algorithmId, list] of groups) {
    // Penalties go through stats.ts, the one place allowed to mirror the
    // database's effective-time expression.
    const solves = list.map((a) => ({ timeMs: a.timeMs, penalty: a.penalty, effectiveTimeMs: null }));
    const recognition: number[] = [];
    let last = "";
    for (const a of list) {
      if (a.recognitionMs !== null) recognition.push(a.recognitionMs);
      if (a.createdAt > last) last = a.createdAt;
    }
    const r = medianOf(recognition);
    out.set(algorithmId, {
      algorithmId,
      caseId: list[0].caseId,
      attempts: list.length,
      successes: list.filter((a) => a.penalty !== "dnf").length,
      medianMs: medianMs(solves),
      medianRecognitionMs: r === null ? null : Math.round(r),
      lastAttemptAt: last || null,
      ease: null,
      nextReviewAt: null,
    });
  }
  return out;
}
