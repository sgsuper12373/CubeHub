import { describe, expect, it } from "vitest";

import type { Solve } from "@/lib/timer/types";

function solve(id: string, timeMs: number, minute: number): Solve {
  return {
    id,
    sessionId: "sess",
    puzzle: "333",
    timeMs,
    penalty: "none",
    effectiveTimeMs: null,
    scramble: "R U",
    notes: null,
    createdAt: new Date(Date.UTC(2026, 9, 1, 0, minute)).toISOString(),
  };
}

describe("local storage and mis-stops", () => {
  it("flags solves saved before flagging existed, once, and the cuber can count them", async () => {
    // A guest's storage from before: a 0.25 nobody flagged, and a real 14.00.
    localStorage.setItem(
      "cubehub.timer.v1",
      JSON.stringify({ sessions: [], solves: [solve("misstop", 250, 1), solve("real", 14000, 2)] }),
    );
    const { localRepo } = await import("@/lib/timer/repo-local");

    const [flagged] = (await localRepo.loadSolves("sess")).filter((s) => s.id === "misstop");
    expect(flagged).toMatchObject({ excluded: true, excludedReason: "auto_misstop" });
    expect((await localRepo.loadPersonalBests("333")).find((b) => b.category === "single")?.timeMs).toBe(14000);
    expect(await localRepo.loadRecentCountedTimes("333", 50)).toEqual([14000]);

    // "It was real": counted, confirmed, and now the single PB.
    await localRepo.updateExcluded("misstop", false);
    const [real] = (await localRepo.loadSolves("sess")).filter((s) => s.id === "misstop");
    expect(real.excluded).toBeUndefined();
    expect(real.excludedReason).toBeUndefined();
    expect(real.misstopConfirmed).toBe(true);
    expect((await localRepo.loadPersonalBests("333")).find((b) => b.category === "single")?.timeMs).toBe(250);

    // Leaving it out by hand: reason "user", no longer confirmed.
    await localRepo.updateExcluded("misstop", true);
    const [out] = (await localRepo.loadSolves("sess")).filter((s) => s.id === "misstop");
    expect(out).toMatchObject({ excluded: true, excludedReason: "user" });
    expect(out.misstopConfirmed).toBeUndefined();
  });
});
