import { describe, it, expect } from "vitest";

import {
  adjacentCases,
  caseHeading,
  caseMetaTitle,
  caseNickname,
  casePath,
  parseCaseNumber,
} from "@/lib/learn/case-route";

describe("parseCaseNumber", () => {
  it("accepts positive whole numbers only", () => {
    expect(parseCaseNumber("27")).toBe(27);
    expect(parseCaseNumber("1")).toBe(1);
    for (const bad of ["0", "-1", "27abc", "abc", "", "1.5", "027", " 27", "99999"]) {
      expect(parseCaseNumber(bad), bad).toBeNull();
    }
  });
});

describe("casePath", () => {
  it("builds the case URL", () => {
    expect(casePath("333", "oll", 27)).toBe("/learn/333/oll/27");
    expect(casePath("222", "eg1", 3)).toBe("/learn/222/eg1/3");
  });
});

describe("adjacentCases", () => {
  const cases = [{ case_number: 3 }, { case_number: 1 }, { case_number: 2 }];

  it("finds the neighbours in number order", () => {
    expect(adjacentCases(cases, 2)).toEqual({ prev: { case_number: 1 }, next: { case_number: 3 } });
    expect(adjacentCases(cases, 1)).toEqual({ prev: null, next: { case_number: 2 } });
    expect(adjacentCases(cases, 3)).toEqual({ prev: { case_number: 2 }, next: null });
    expect(adjacentCases(cases, 9)).toEqual({ prev: null, next: null });
  });
});

describe("caseNickname", () => {
  it("is the note only when it is a name", () => {
    expect(caseNickname("OCLL · Sune")).toBe("Sune");
    expect(caseNickname("Fish · Kite")).toBe("Kite");
    expect(caseNickname("Square · mirror of OLL 6")).toBeNull();
    expect(caseNickname("Sune · first layer solved")).toBeNull();
    expect(caseNickname("Adjacent corner swap. Headlights at back.")).toBeNull();
    expect(caseNickname(null)).toBeNull();
  });
});

describe("caseHeading", () => {
  const c = (name: string, case_number: number, description: string | null) => ({
    name,
    case_number,
    description,
  });

  it("adds the nickname, or else the group, to a numbered name", () => {
    expect(caseHeading(c("OLL 27", 27, "OCLL · Sune"), "OLL")).toBe("OLL 27 (Sune)");
    expect(caseHeading(c("OLL 5", 5, "Square · mirror of OLL 6"), "OLL")).toBe("OLL 5 (Square)");
    expect(caseHeading(c("OLL 5", 5, "Dot, Run"), "OLL")).toBe("OLL 5");
  });

  it("keeps names that already say what the case is", () => {
    expect(caseHeading(c("Aa Perm", 1, "Adjacent corner swap."), "PLL")).toBe("Aa Perm");
    expect(caseHeading(c("Sune 1", 1, "Sune · first layer solved"), "CLL")).toBe("Sune 1");
  });
});

describe("caseMetaTitle", () => {
  it("names the set only when the heading doesn't", () => {
    expect(caseMetaTitle("OLL 27 (Sune)", "OLL", "3x3 Cube", 4)).toBe(
      "OLL 27 (Sune) Algorithms · 3x3 Cube | CubeHub",
    );
    expect(caseMetaTitle("Aa Perm", "PLL", "3x3 Cube", 1)).toBe(
      "Aa Perm Algorithm · PLL · 3x3 Cube | CubeHub",
    );
  });
});
