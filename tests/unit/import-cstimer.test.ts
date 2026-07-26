import { describe, it, expect } from "vitest";
import { parseCsTimer, toSolves } from "@/lib/timer/import-cstimer";
import type { ExportEnvelope } from "@/lib/timer/export";

describe("parseCsTimer & toSolves", () => {
  it("parses valid standard csTimer export JSON", () => {
    const raw = JSON.stringify({
      session1: [
        [[0, 15320], "R U R' U'", "PB!", 1700000000],
        [[2000, 14200], "F R U", "", 1700000050],
        [[-1, 16000], "D2 L2", "", 1700000100],
      ],
      properties: {
        sessionData: JSON.stringify({
          1: { name: "3x3 Main", stat: [3, 0, 15000] },
        }),
      },
    });

    const parse = parseCsTimer(raw, "333");
    expect(parse.source).toBe("cstimer");
    expect(parse.totalSolves).toBe(3);
    expect(parse.plus2Count).toBe(1);
    expect(parse.dnfCount).toBe(1);

    const { sessions, solves } = toSolves(parse, "333");
    expect(sessions).toHaveLength(1);
    expect(sessions[0].name).toBe("3x3 Main");
    expect(solves).toHaveLength(3);
    expect(solves[0].penalty).toBe("none");
    expect(solves[1].penalty).toBe("plus2");
    expect(solves[2].penalty).toBe("dnf");
    expect(solves[0].puzzle).toBe("333");
  });

  it("parses native CubeHub ExportEnvelope JSON and preserves original UUIDs", () => {
    const originalSolveId = "11111111-2222-3333-4444-555555555555";
    const originalSessionId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

    const envelope: ExportEnvelope = {
      version: 1,
      exportedAt: "2026-07-26T12:00:00.000Z",
      puzzle: "333",
      sessions: [
        {
          id: originalSessionId,
          puzzle: "333",
          name: "Native Session",
          isActive: true,
          orderIndex: 0,
        },
      ],
      solves: [
        {
          id: originalSolveId,
          sessionId: originalSessionId,
          puzzle: "333",
          timeMs: 12345,
          penalty: "none",
          effectiveTimeMs: 12345,
          scramble: "B L U",
          notes: "Nice!",
          createdAt: "2026-07-26T12:00:00.000Z",
        },
      ],
    };

    const raw = JSON.stringify(envelope);
    const parse = parseCsTimer(raw, "333");

    expect(parse.source).toBe("cubehub");
    expect(parse.totalSolves).toBe(1);

    const { sessions, solves } = toSolves(parse, "333");
    expect(sessions[0].id).toBe(originalSessionId);
    expect(solves[0].id).toBe(originalSolveId);
    expect(solves[0].notes).toBe("Nice!");
  });

  it("warns when imported puzzle differs from active target puzzle without dropping supported solves", () => {
    const envelope: ExportEnvelope = {
      version: 1,
      exportedAt: "2026-07-26T12:00:00.000Z",
      puzzle: "222",
      sessions: [
        { id: "11111111-2222-3333-4444-555555555551", puzzle: "222", name: "2x2 Session", isActive: true, orderIndex: 0 },
      ],
      solves: [
        {
          id: "11111111-2222-3333-4444-555555555552",
          sessionId: "11111111-2222-3333-4444-555555555551",
          puzzle: "222",
          timeMs: 4500,
          penalty: "none",
          effectiveTimeMs: 4500,
          scramble: "R U R'",
          notes: null,
          createdAt: "2026-07-26T12:00:00.000Z",
        },
      ],
    };

    const parse = parseCsTimer(JSON.stringify(envelope), "333");
    expect(parse.warnings.length).toBeGreaterThan(0);
    expect(parse.warnings[0]).toContain("you are currently on the 3x3 tab");
    expect(parse.totalSolves).toBe(1);
  });

  it("warns and skips unsupported puzzles (like pyram)", () => {
    const envelope = {
      version: 1,
      exportedAt: "2026-07-26T12:00:00.000Z",
      puzzle: "pyram",
      sessions: [],
      solves: [],
    };

    const parse = parseCsTimer(JSON.stringify(envelope), "333");
    expect(parse.warnings[0]).toContain("unsupported puzzle (pyram)");
    expect(parse.totalSolves).toBe(0);
  });
});
