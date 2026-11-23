import { currentVariantId } from "@/lib/drill/order";
import { recommendSwitch } from "@/lib/drill/recommend";
import type { DrillCaseRef, StatsByAlgorithm, VariantStats } from "@/lib/drill/types";

export type QueueCase = { id: string; name: string; subset: string; caseNumber: number | null; ms: number };

export type DrillQueue = {
  /** Cases with any variant due for review now. */
  due: number;
  /** The three slowest drilled cases, by median recognition plus execution of the variant in use. */
  slowest: QueueCase[];
  /** One "switch your main algorithm" suggestion, when recommend.ts has one. */
  suggestion: { caseId: string; name: string; subset: string; caseNumber: number | null; gainMs: number } | null;
  /** Whether the cuber has drilled anything at all. */
  started: boolean;
};

type Case = DrillCaseRef & { name: string; subset: string; caseNumber: number | null };

/** Home's drill queue card (docs/home-plan.md → Drill queue), from getDrillData(). */
export function summariseDrillQueue(cases: readonly Case[], statsList: readonly VariantStats[], now = Date.now()): DrillQueue {
  const stats: StatsByAlgorithm = new Map(statsList.map((s) => [s.algorithmId, s]));
  let due = 0;
  const timed: QueueCase[] = [];
  let suggestion: DrillQueue["suggestion"] = null;

  for (const c of cases) {
    if (c.algorithms.some((a) => {
      const at = stats.get(a.id)?.nextReviewAt;
      return at !== null && at !== undefined && Date.parse(at) <= now;
    })) {
      due += 1;
    }
    const currentId = currentVariantId(c, stats);
    const current = currentId ? stats.get(currentId) : undefined;
    if (current?.medianMs != null) {
      timed.push({
        id: c.id,
        name: c.name,
        subset: c.subset,
        caseNumber: c.caseNumber,
        ms: current.medianMs + (current.medianRecognitionMs ?? 0),
      });
    }
    if (!suggestion && currentId) {
      const rec = recommendSwitch(currentId, c.algorithms.map((a) => a.id), stats);
      if (rec?.kind === "switch") {
        suggestion = { caseId: c.id, name: c.name, subset: c.subset, caseNumber: c.caseNumber, gainMs: rec.gainMs };
      }
    }
  }

  timed.sort((a, b) => b.ms - a.ms);
  return { due, slowest: timed.slice(0, 3), suggestion, started: statsList.some((s) => s.attempts > 0) };
}
