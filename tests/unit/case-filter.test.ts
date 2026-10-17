import { describe, it, expect } from "vitest";

import {
  NO_FILTER,
  filterFromParams,
  filterQuery,
  filterToParams,
  filteredNeighbours,
  isFiltered,
  matchesCaseFilter,
  nextUnlearned,
  type CaseFilter,
} from "@/lib/learn/case-filter";

const c = (n: number, learned: boolean, description: string | null = null, moves = "R U R'") => ({
  case_number: n,
  name: `OLL ${n}`,
  description,
  learned,
  algorithms: [{ moves }],
});

// Out of order on purpose: everything walks case-number order.
const cases = [
  c(3, false, "Dot · Anti-Frying Pan"),
  c(1, true, "Dot · Run"),
  c(2, false, "Dot · Zamboni"),
  c(26, true, "OCLL · Anti-Sune", "R U2 R' U' R U' R'"),
  c(27, false, "OCLL · Sune"),
  c(28, false, "Lightning · Arrow"),
];

const f = (over: Partial<CaseFilter>): CaseFilter => ({ ...NO_FILTER, ...over });

describe("matchesCaseFilter", () => {
  it("combines status, category and search", () => {
    const sune = cases[4];
    expect(matchesCaseFilter(sune, NO_FILTER)).toBe(true);
    expect(matchesCaseFilter(sune, f({ status: "unlearned", category: "OCLL" }))).toBe(true);
    expect(matchesCaseFilter(sune, f({ status: "learned" }))).toBe(false);
    expect(matchesCaseFilter(sune, f({ category: "Dot" }))).toBe(false);
    expect(matchesCaseFilter(sune, f({ search: "  SUNE " }))).toBe(true);
    expect(matchesCaseFilter(cases[3], f({ search: "r u2" }))).toBe(true);
  });
});

describe("filter URL params", () => {
  it("leaves defaults out", () => {
    expect(filterQuery(NO_FILTER)).toBe("");
    expect(isFiltered(NO_FILTER)).toBe(false);
    expect(isFiltered(f({ search: "  " }))).toBe(false);
  });

  it("round-trips through URLSearchParams and a searchParams object", () => {
    const filter = f({ status: "unlearned", category: "Small Lightning", search: "sune" });
    const params = filterToParams(filter);
    expect(filterFromParams(params)).toEqual(filter);
    expect(filterFromParams(Object.fromEntries(params))).toEqual(filter);
    expect(filterQuery(filter)).toBe("?status=unlearned&group=Small+Lightning&q=sune");
  });

  it("ignores junk", () => {
    expect(filterFromParams({ status: "bogus", group: " ", q: undefined })).toEqual(NO_FILTER);
    expect(filterFromParams({ status: ["learned", "unlearned"] }).status).toBe("learned");
  });
});

describe("filteredNeighbours", () => {
  it("is plain case order without a filter", () => {
    const { prev, next } = filteredNeighbours(cases, 2, NO_FILTER);
    expect([prev?.case_number, next?.case_number]).toEqual([1, 3]);
  });

  it("skips cases outside the filter", () => {
    const { prev, next } = filteredNeighbours(cases, 3, f({ status: "unlearned" }));
    expect([prev?.case_number, next?.case_number]).toEqual([2, 27]);
  });

  it("works from a case that no longer matches (just marked learned)", () => {
    const { prev, next } = filteredNeighbours(cases, 26, f({ status: "unlearned" }));
    expect([prev?.case_number, next?.case_number]).toEqual([3, 27]);
  });

  it("has nothing past the ends", () => {
    expect(filteredNeighbours(cases, 1, NO_FILTER).prev).toBeNull();
    expect(filteredNeighbours(cases, 28, NO_FILTER).next).toBeNull();
  });
});

describe("nextUnlearned", () => {
  it("finds the next unlearned case after this one", () => {
    expect(nextUnlearned(cases, 3, NO_FILTER)?.case_number).toBe(27);
  });

  it("wraps round to the start", () => {
    expect(nextUnlearned(cases, 28, NO_FILTER)?.case_number).toBe(2);
  });

  it("stays within the filter and never returns the current case", () => {
    expect(nextUnlearned(cases, 27, f({ category: "OCLL" }))).toBeNull();
    expect(nextUnlearned(cases, 2, f({ category: "Dot" }))?.case_number).toBe(3);
  });

  it("is null once everything else is learned", () => {
    const allLearned = cases.map((x) => ({ ...x, learned: x.case_number !== 27 ? true : x.learned }));
    expect(nextUnlearned(allLearned, 27, NO_FILTER)).toBeNull();
  });
});
