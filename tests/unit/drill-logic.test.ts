import { describe, it, expect } from "vitest";

import { currentVariantId, nextCase, statsFromAttempts, weakestFirst } from "@/lib/drill/order";
import {
  MIN_SUCCESSES,
  recommendSwitch,
  recommendationText,
  TRY_AFTER_SUCCESSES,
} from "@/lib/drill/recommend";
import type { DrillCaseRef, VariantStats } from "@/lib/drill/types";
import { medianMs } from "@/lib/timer/stats";

function stats(algorithmId: string, over: Partial<VariantStats> = {}): VariantStats {
  return {
    algorithmId,
    caseId: "case",
    attempts: 0,
    successes: 0,
    medianMs: null,
    medianRecognitionMs: null,
    lastAttemptAt: null,
    ease: null,
    nextReviewAt: null,
    ...over,
  };
}

const byId = (...rows: VariantStats[]) => new Map(rows.map((r) => [r.algorithmId, r]));

describe("medianMs", () => {
  const s = (timeMs: number, penalty: "none" | "plus2" | "dnf" = "none") => ({
    timeMs,
    penalty,
    effectiveTimeMs: null,
  });

  it("odd count, even count (midpoint, like percentile_cont), DNFs excluded, +2 applied", () => {
    expect(medianMs([s(3000), s(1000), s(2000)])).toBe(2000);
    expect(medianMs([s(1000), s(2000)])).toBe(1500);
    expect(medianMs([s(1000), s(5000, "dnf"), s(3000)])).toBe(2000);
    expect(medianMs([s(1000, "plus2"), s(2000)])).toBe(2500);
    expect(medianMs([s(1000, "dnf")])).toBeNull();
  });
});

describe("recommendSwitch", () => {
  const variants = ["a", "b"];

  it("recommends the switch when both are measured and the alternative is clearly faster", () => {
    const rec = recommendSwitch(
      "a",
      variants,
      byId(
        stats("a", { attempts: 34, successes: 34, medianMs: 1820 }),
        stats("b", { attempts: 11, successes: 11, medianMs: 1540 }),
      ),
    );
    expect(rec).toMatchObject({ kind: "switch", gainMs: 280 });
    const text = recommendationText(rec!, new Map([["a", "R U R' U'"], ["b", "R' F R F'"]]));
    expect(text).toBe(
      "You have used R U R' U' 34 times, median 1.82s. You have used the alternative R' F R F' 11 times, median 1.54s. Consider switching.",
    );
  });

  it("stays quiet without enough evidence on either side", () => {
    expect(
      recommendSwitch("a", variants, byId(
        // Below TRY_AFTER_SUCCESSES too, so not even a "try" suggestion yet.
        stats("a", { attempts: 15, successes: 15, medianMs: 1820 }),
        stats("b", { attempts: MIN_SUCCESSES - 1, successes: MIN_SUCCESSES - 1, medianMs: 1000 }),
      )),
    ).toBeNull();
    expect(
      recommendSwitch("a", variants, byId(
        stats("a", { attempts: 5, successes: 5, medianMs: 1820 }),
        stats("b", { attempts: 30, successes: 30, medianMs: 1000 }),
      )),
    ).toBeNull();
  });

  it("ignores gains that are small in relative or absolute terms", () => {
    // 4% faster: below the 5% bar.
    expect(
      recommendSwitch("a", variants, byId(
        stats("a", { successes: 20, attempts: 20, medianMs: 2000 }),
        stats("b", { successes: 20, attempts: 20, medianMs: 1920 }),
      )),
    ).toBeNull();
    // 10% faster but only 90 ms.
    expect(
      recommendSwitch("a", variants, byId(
        stats("a", { successes: 20, attempts: 20, medianMs: 900 }),
        stats("b", { successes: 20, attempts: 20, medianMs: 810 }),
      )),
    ).toBeNull();
  });

  it("does not recommend a slower or equal alternative", () => {
    expect(
      recommendSwitch("a", variants, byId(
        stats("a", { successes: 20, attempts: 20, medianMs: 1500 }),
        stats("b", { successes: 20, attempts: 20, medianMs: 1500 }),
      )),
    ).toBeNull();
  });

  it("suggests trying an unmeasured alternative once the current one is well measured", () => {
    const rec = recommendSwitch("a", variants, byId(
      stats("a", { successes: TRY_AFTER_SUCCESSES, attempts: TRY_AFTER_SUCCESSES, medianMs: 1500 }),
    ));
    expect(rec).toMatchObject({ kind: "try", alternativeId: "b" });
  });

  it("picks the fastest of several qualifying alternatives", () => {
    const rec = recommendSwitch("a", ["a", "b", "c"], byId(
      stats("a", { successes: 20, attempts: 20, medianMs: 2000 }),
      stats("b", { successes: 20, attempts: 20, medianMs: 1700 }),
      stats("c", { successes: 20, attempts: 20, medianMs: 1500 }),
    ));
    expect(rec).toMatchObject({ kind: "switch", better: { algorithmId: "c" } });
  });
});

describe("case ordering", () => {
  const c = (id: string, algs = [`${id}-main`]): DrillCaseRef => ({
    id,
    algorithms: algs.map((a, i) => ({ id: a, is_main: i === 0 })),
  });
  const NOW = Date.parse("2026-09-30T12:00:00Z");

  it("current variant: most recently used, else main, else first", () => {
    const k = c("k", ["k1", "k2"]);
    expect(currentVariantId(k, new Map())).toBe("k1");
    expect(
      currentVariantId(k, byId(
        stats("k1", { lastAttemptAt: "2026-09-01T00:00:00Z" }),
        stats("k2", { lastAttemptAt: "2026-09-02T00:00:00Z" }),
      )),
    ).toBe("k2");
  });

  it("weakest first: due, then never drilled (set order), then weakest by fails and speed", () => {
    const cases = [c("fast"), c("new1"), c("slow"), c("due"), c("new2"), c("failing")];
    const s = byId(
      stats("fast-main", { attempts: 10, successes: 10, medianMs: 1000 }),
      stats("slow-main", { attempts: 10, successes: 10, medianMs: 3000 }),
      stats("failing-main", { attempts: 10, successes: 5, medianMs: 1500 }),
      stats("due-main", { attempts: 10, successes: 10, medianMs: 1000, nextReviewAt: "2026-09-29T00:00:00Z" }),
    );
    expect(weakestFirst(cases, s, NOW).map((x) => x.id)).toEqual([
      "due", "new1", "new2", "failing", "slow", "fast",
    ]);
  });

  it("never repeats the last case, and handles tiny sets", () => {
    const cases = [c("a"), c("b")];
    for (let i = 0; i < 20; i++) {
      expect(nextCase(cases, new Map(), "random", "a", Math.random)?.id).toBe("b");
      expect(nextCase(cases, new Map(), "weakest", "b", Math.random)?.id).toBe("a");
    }
    expect(nextCase([c("only")], new Map(), "random", "only")?.id).toBe("only");
    expect(nextCase([], new Map(), "random", null)).toBeNull();
  });

  it("weakest mode draws from the weakest few, favouring the weakest", () => {
    const cases = [c("w1"), c("w2"), c("w3"), c("strong")];
    const s = byId(
      stats("w1-main", { attempts: 10, successes: 2, medianMs: 2000 }),
      stats("w2-main", { attempts: 10, successes: 4, medianMs: 2000 }),
      stats("w3-main", { attempts: 10, successes: 6, medianMs: 2000 }),
      stats("strong-main", { attempts: 10, successes: 10, medianMs: 1000 }),
    );
    expect(nextCase(cases, s, "weakest", null, () => 0, NOW)?.id).toBe("w1");
    expect(nextCase(cases, s, "weakest", null, () => 0.999, NOW)?.id).toBe("w3");
    for (let i = 0; i < 50; i++) {
      expect(nextCase(cases, s, "weakest", null, Math.random, NOW)?.id).not.toBe("strong");
    }
  });
});

describe("statsFromAttempts", () => {
  it("matches the view: counts, DNF-free median, recognition median, last attempt", () => {
    const at = (timeMs: number, penalty: "none" | "plus2" | "dnf", createdAt: string, recognitionMs: number | null = null) => ({
      algorithmId: "x", caseId: "c", timeMs, penalty, recognitionMs, createdAt,
    });
    const s = statsFromAttempts([
      at(2000, "none", "2026-01-01T00:00:00Z", 400),
      at(1800, "plus2", "2026-01-01T00:01:00Z", 600),
      at(1900, "dnf", "2026-01-01T00:02:00Z"),
    ]).get("x")!;
    expect(s).toMatchObject({
      attempts: 3,
      successes: 2,
      medianMs: 2900,
      medianRecognitionMs: 500,
      lastAttemptAt: "2026-01-01T00:02:00Z",
    });
  });
});
