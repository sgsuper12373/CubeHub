import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { parsePublicStatsRow, showableStats, STAT_MINIMUM } from "@/lib/marketing/public-stats";

const none = { solves: null, cubers: null, casesDrilled: null, clubs: null };

describe("showableStats", () => {
  it("shows nothing when public_stats() is missing or empty", () => {
    expect(showableStats(null)).toEqual([]);
    expect(showableStats(none)).toEqual([]);
  });

  it("hides counts below their minimum", () => {
    expect(
      showableStats({ ...none, cubers: STAT_MINIMUM.cubers - 1, clubs: 2, casesDrilled: STAT_MINIMUM.casesDrilled - 1 }),
    ).toEqual([]);
  });

  it("shows real counts at or above the minimum, in order", () => {
    expect(showableStats({ solves: 50_000, cubers: 250, casesDrilled: 4_000, clubs: 12 }).map((s) => s.label)).toEqual([
      "solves timed",
      "cubers",
      "cases drilled",
      "college clubs",
    ]);
  });
});

describe("parsePublicStatsRow", () => {
  it("reads the function's one row, with bigints as numbers or strings", () => {
    expect(parsePublicStatsRow([{ solves: "12000", cubers: 140, cases_drilled: "1500" }])).toEqual({
      solves: 12_000,
      cubers: 140,
      casesDrilled: 1_500,
    });
  });

  it("is null for no row, an empty array or a row with nothing usable", () => {
    expect(parsePublicStatsRow(null)).toBeNull();
    expect(parsePublicStatsRow([])).toBeNull();
    expect(parsePublicStatsRow([{ solves: null, cubers: "x", cases_drilled: -1 }])).toBeNull();
  });
});
