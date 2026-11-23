import { describe, expect, it } from "vitest";

import type { VariantStats } from "@/lib/drill/types";
import { summariseDrillQueue } from "@/lib/home/drill-queue";

const NOW = Date.parse("2026-11-24T12:00:00Z");

function stat(algorithmId: string, caseId: string, over: Partial<VariantStats> = {}): VariantStats {
  return {
    algorithmId,
    caseId,
    attempts: 12,
    successes: 12,
    medianMs: 2000,
    medianRecognitionMs: null,
    lastAttemptAt: "2026-11-20T10:00:00Z",
    ease: 2.5,
    nextReviewAt: "2026-12-10T00:00:00Z",
    ...over,
  };
}

const kase = (id: string, algs: { id: string; is_main: boolean }[]) => ({
  id,
  name: id.toUpperCase(),
  subset: "pll",
  caseNumber: 1,
  algorithms: algs,
});

describe("summariseDrillQueue", () => {
  it("counts due cases and orders the slowest by recognition plus execution", () => {
    const cases = [
      kase("ua", [{ id: "ua1", is_main: true }]),
      kase("ub", [{ id: "ub1", is_main: true }]),
      kase("h", [{ id: "h1", is_main: true }]),
      kase("z", [{ id: "z1", is_main: true }]),
      kase("t", [{ id: "t1", is_main: true }]),
    ];
    const q = summariseDrillQueue(
      cases,
      [
        stat("ua1", "ua", { medianMs: 1500, nextReviewAt: "2026-11-24T11:00:00Z" }),
        stat("ub1", "ub", { medianMs: 1800, medianRecognitionMs: 900 }),
        stat("h1", "h", { medianMs: 2600 }),
        stat("z1", "z", { medianMs: 2100, nextReviewAt: "2026-11-23T00:00:00Z" }),
      ],
      NOW,
    );
    expect(q.due).toBe(2);
    expect(q.slowest.map((c) => c.id)).toEqual(["ub", "h", "z"]);
    expect(q.slowest[0].ms).toBe(2700);
    expect(q.started).toBe(true);
  });

  it("suggests switching when an alternative is clearly faster", () => {
    const cases = [kase("ua", [{ id: "main", is_main: true }, { id: "alt", is_main: false }])];
    const q = summariseDrillQueue(
      cases,
      [
        stat("main", "ua", { medianMs: 2400, lastAttemptAt: "2026-11-22T00:00:00Z" }),
        stat("alt", "ua", { medianMs: 2000, lastAttemptAt: "2026-11-21T00:00:00Z" }),
      ],
      NOW,
    );
    expect(q.suggestion).toMatchObject({ caseId: "ua", name: "UA" });
    expect(q.suggestion!.gainMs).toBe(400);
  });

  it("is empty for someone who has never drilled", () => {
    const q = summariseDrillQueue([kase("ua", [{ id: "ua1", is_main: true }])], [], NOW);
    expect(q).toEqual({ due: 0, slowest: [], suggestion: null, started: false });
  });
});
