import type { AlgorithmCase } from "@/lib/learn/dal";
import { caseCategory } from "@/lib/learn/case-category";
import { caseDiagram, type CaseDiagram } from "@/lib/learn/case-diagram";
import { caseHeading } from "@/lib/learn/case-route";

/** One case in the case switcher: just what it draws, not the algorithms. */
export type CaseOption = {
  caseNumber: number;
  heading: string;
  category: string | null;
  learned: boolean;
  diagram: CaseDiagram;
};

/** Pure, so the case page (server) and the side panel (client) share it. */
export function caseOptions(cases: readonly AlgorithmCase[], setName: string): CaseOption[] {
  return cases.map((c) => ({
    caseNumber: c.case_number,
    heading: caseHeading(c, setName),
    category: caseCategory(c.description),
    learned: c.learned,
    diagram: caseDiagram(c),
  }));
}
