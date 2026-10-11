import { describe, expect, it } from "vitest";

import { deletedAgo } from "@/components/timer/recently-deleted";
import { localRepo } from "@/lib/timer/repo-local";
import type { Solve } from "@/lib/timer/types";

function solve(id: string, extra: Partial<Solve> = {}): Solve {
  return {
    id,
    sessionId: "sess",
    puzzle: "333",
    timeMs: 10000,
    penalty: "none",
    effectiveTimeMs: null,
    scramble: "R U",
    notes: null,
    createdAt: "2026-10-01T00:00:00.000Z",
    ...extra,
  };
}

describe("local recently deleted", () => {
  it("lists recent soft deletes newest first, and purges only deleted solves", async () => {
    const day = 24 * 60 * 60 * 1000;
    await localRepo.saveSolve(solve("live"));
    await localRepo.saveSolve(solve("old", { deletedAt: new Date(Date.now() - 40 * day).toISOString() }));
    await localRepo.saveSolve(solve("pyra", { puzzle: "pyra", deletedAt: new Date().toISOString() }));
    await localRepo.saveSolve(solve("a", { deletedAt: new Date(Date.now() - 2 * day).toISOString() }));
    await localRepo.saveSolve(solve("b"));
    await localRepo.deleteSolve("b"); // deleted just now

    const deleted = await localRepo.loadDeletedSolves("333");
    expect(deleted.map((s) => s.id)).toEqual(["b", "a"]);

    // "live" is not in the trash, so purging it must do nothing.
    await localRepo.purgeSolves(["a", "live"]);
    expect((await localRepo.loadDeletedSolves("333")).map((s) => s.id)).toEqual(["b"]);
    expect((await localRepo.loadSolves("sess")).map((s) => s.id)).toEqual(["live"]);

    await localRepo.restoreSolves(["b"]);
    expect(await localRepo.loadDeletedSolves("333")).toEqual([]);
    expect((await localRepo.loadSolves("sess")).map((s) => s.id).sort()).toEqual(["b", "live"]);
  });
});

describe("deletedAgo", () => {
  const now = Date.UTC(2026, 9, 11, 12);
  const ago = (ms: number) => new Date(now - ms).toISOString();

  it("reads naturally", () => {
    expect(deletedAgo(ago(20_000), now)).toBe("just now");
    expect(deletedAgo(ago(5 * 60_000), now)).toBe("5 minutes ago");
    expect(deletedAgo(ago(3 * 3_600_000), now)).toBe("3 hours ago");
    expect(deletedAgo(ago(24 * 3_600_000), now)).toBe("yesterday");
    expect(deletedAgo(ago(6 * 24 * 3_600_000), now)).toBe("6 days ago");
  });
});
