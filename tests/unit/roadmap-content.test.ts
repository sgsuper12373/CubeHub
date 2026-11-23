import { describe, expect, it } from "vitest";

import { FAQ } from "@/content/faq";
import { ROADMAP, ROADMAP_COLUMNS, roadmapColumn } from "@/content/roadmap";

describe("roadmap content", () => {
  it("every item has a known column, a status and text", () => {
    const columns = new Set(ROADMAP_COLUMNS.map((c) => c.id));
    for (const item of ROADMAP) {
      expect(columns.has(item.column)).toBe(true);
      expect(["shipped", "building", "planned"]).toContain(item.status);
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.detail.length).toBeGreaterThan(0);
    }
  });

  it("only Now holds shipped items, and every column has some", () => {
    for (const c of ROADMAP_COLUMNS) expect(roadmapColumn(c.id).length).toBeGreaterThan(0);
    expect(ROADMAP.filter((i) => i.status === "shipped").every((i) => i.column === "now")).toBe(true);
  });

  it("FAQ questions are unique and answered", () => {
    expect(new Set(FAQ.map((f) => f.q)).size).toBe(FAQ.length);
    for (const f of FAQ) expect(f.a.length).toBeGreaterThan(10);
  });
});
