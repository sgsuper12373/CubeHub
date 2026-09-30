import { describe, it, expect } from "vitest";

import { toJson } from "@/lib/timer/export";
import { parseCsTimer, toSolves } from "@/lib/timer/import-cstimer";
import type { Session, Solve } from "@/lib/timer/types";

/**
 * A backup you cannot restore is not a backup. CubeHub's own JSON export must
 * come back through the importer with nothing lost, and importing the same
 * file twice must produce the same ids, so the repositories' upsert-on-id
 * makes the second import a no-op instead of doubling the history.
 */
const sessions: Session[] = [
  { id: "0a4c2f3e-1b2d-4c5e-8f6a-7b8c9d0e1f2a", puzzle: "333", name: "Main", isActive: true, orderIndex: 0 },
  { id: "1b5d3a4f-2c3e-4d6f-9a7b-8c9d0e1f2a3b", puzzle: "333", name: "OH practice, with a comma", isActive: false, orderIndex: 1 },
];

const solves: Solve[] = [
  {
    id: "2c6e4b5a-3d4f-4e7a-8b8c-9d0e1f2a3b4c",
    sessionId: sessions[0].id,
    puzzle: "333",
    timeMs: 11234,
    penalty: "none",
    effectiveTimeMs: 11234,
    scramble: "R U R' U' F2 D' L2",
    notes: null,
    createdAt: "2026-09-01T10:00:00.000Z",
  },
  {
    id: "3d7f5c6b-4e5a-4f8b-9c9d-0e1f2a3b4c5d",
    sessionId: sessions[0].id,
    puzzle: "333",
    timeMs: 12500,
    penalty: "plus2",
    effectiveTimeMs: 14500,
    scramble: "F2 U' B2",
    notes: "stackmat \"slipped\", then +2",
    createdAt: "2026-09-01T10:01:00.000Z",
  },
  {
    id: "4e8a6d7c-5f6b-4a9c-8d0e-1f2a3b4c5d6e",
    sessionId: sessions[1].id,
    puzzle: "333",
    timeMs: 20100,
    penalty: "dnf",
    effectiveTimeMs: null,
    scramble: "L' D2 R",
    notes: "lost the F2L\nnew line too",
    createdAt: "2026-09-02T08:30:00.000Z",
  },
];

function restore(json: string) {
  const parse = parseCsTimer(json, "333");
  return { parse, ...toSolves(parse, "333", 5) };
}

describe("CubeHub backup round trip", () => {
  it("restores every solve with ids, times, penalties, scrambles, notes and timestamps intact", () => {
    const { parse, sessions: outSessions, solves: outSolves } = restore(toJson("333", sessions, solves));

    expect(parse.source).toBe("cubehub");
    expect(parse.warnings).toEqual([]);
    expect(parse.plus2Count).toBe(1);
    expect(parse.dnfCount).toBe(1);

    const pick = (s: Solve) => ({
      id: s.id,
      sessionId: s.sessionId,
      puzzle: s.puzzle,
      timeMs: s.timeMs,
      penalty: s.penalty,
      scramble: s.scramble,
      notes: s.notes,
      createdAt: s.createdAt,
    });
    expect(outSolves.map(pick).sort((a, b) => a.id.localeCompare(b.id))).toEqual(
      solves.map(pick).sort((a, b) => a.id.localeCompare(b.id)),
    );

    expect(outSessions.map((s) => ({ id: s.id, name: s.name, puzzle: s.puzzle }))).toEqual(
      sessions.map((s) => ({ id: s.id, name: s.name, puzzle: s.puzzle })),
    );
    // Restored sessions never take the active slot, and are appended after
    // the user's existing sessions.
    expect(outSessions.every((s) => !s.isActive)).toBe(true);
    expect(outSessions.map((s) => s.orderIndex)).toEqual([5, 6]);
  });

  it("importing the same backup twice yields identical rows (so the second import writes nothing)", () => {
    const json = toJson("333", sessions, solves);
    const first = restore(json);
    const second = restore(json);
    expect(second.solves.map((s) => s.id)).toEqual(first.solves.map((s) => s.id));
    expect(second.sessions.map((s) => s.id)).toEqual(first.sessions.map((s) => s.id));
  });

  it("keeps a session that has no solves yet", () => {
    const empty: Session = { id: "5f9b7e8d-6a7c-4b0d-9e1f-2a3b4c5d6e7f", puzzle: "333", name: "Empty", isActive: false, orderIndex: 2 };
    const { sessions: outSessions } = restore(toJson("333", [...sessions, empty], solves));
    expect(outSessions.map((s) => s.name)).toContain("Empty");
  });
});
