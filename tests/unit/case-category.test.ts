import { describe, it, expect } from "vitest";

import { caseCategories, caseCategory } from "@/lib/learn/case-category";

describe("caseCategory", () => {
  it("takes the text before ' · '", () => {
    expect(caseCategory("Sune · first layer solved")).toBe("Sune");
    expect(caseCategory("Anti-Sune · first layer has an adjacent swap")).toBe("Anti-Sune");
    expect(caseCategory("PBL · adjacent swap on one layer only (do x2 first if it's on the bottom)")).toBe("PBL");
    expect(caseCategory("Orient last layer · repeat with U turns")).toBe("Orient last layer");
  });

  it("has no category without the separator", () => {
    expect(caseCategory("Dot, Run")).toBeNull();
    expect(caseCategory("Adjacent corner swap, adjacent edge swap. Full block on one side.")).toBeNull();
    expect(caseCategory(" · leading separator")).toBeNull();
    expect(caseCategory("")).toBeNull();
    expect(caseCategory(null)).toBeNull();
  });
});

describe("caseCategories", () => {
  const d = (description: string | null) => ({ description });

  it("lists categories in first-seen order with counts", () => {
    expect(
      caseCategories([d("OLL · a"), d("OLL · b"), d("PBL · c"), d("OLL · d"), d("PBL · e")]),
    ).toEqual([
      { name: "OLL", count: 3 },
      { name: "PBL", count: 2 },
    ]);
  });

  it("is empty when any case lacks a category", () => {
    expect(caseCategories([d("OLL · a"), d("PBL · b"), d("no separator")])).toEqual([]);
    expect(caseCategories([d("OLL · a"), d(null)])).toEqual([]);
  });

  it("is empty when there is only one category", () => {
    expect(caseCategories([d("Sune · a"), d("Sune · b")])).toEqual([]);
    expect(caseCategories([])).toEqual([]);
  });
});
