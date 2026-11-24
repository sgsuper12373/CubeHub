import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { showableStats, STAT_MINIMUM } from "@/lib/marketing/public-stats";

describe("showableStats", () => {
  it("shows nothing without real data", () => {
    expect(showableStats({ cubers: null, clubs: null, solves: null })).toEqual([]);
  });

  it("hides counts below their minimum", () => {
    expect(showableStats({ cubers: STAT_MINIMUM.cubers - 1, clubs: 2, solves: null })).toEqual([]);
  });

  it("shows real counts at or above the minimum, in order", () => {
    expect(showableStats({ cubers: 250, clubs: 12, solves: 50_000 }).map((s) => s.label)).toEqual([
      "solves timed",
      "cubers",
      "college clubs",
    ]);
  });
});
