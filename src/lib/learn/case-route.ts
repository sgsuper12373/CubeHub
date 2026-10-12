import { caseCategory } from "@/lib/learn/case-category";

/**
 * Helpers for the per-case pages at /learn/[puzzle]/[series]/[case], where
 * [case] is the case number (/learn/333/oll/27). Pure, so the card, the page,
 * the OG image and the sitemap all build the same URLs and titles.
 */

/** A case number from the URL: a positive whole number, nothing else. */
export function parseCaseNumber(segment: string): number | null {
  return /^[1-9]\d{0,3}$/.test(segment) ? Number(segment) : null;
}

export function casePath(puzzle: string, series: string, caseNumber: number): string {
  return `/learn/${encodeURIComponent(puzzle)}/${encodeURIComponent(series)}/${caseNumber}`;
}

/** The cases either side of `caseNumber`, in case-number order. */
export function adjacentCases<T extends { case_number: number }>(
  cases: readonly T[],
  caseNumber: number,
): { prev: T | null; next: T | null } {
  const sorted = [...cases].sort((a, b) => a.case_number - b.case_number);
  const i = sorted.findIndex((c) => c.case_number === caseNumber);
  if (i === -1) return { prev: null, next: null };
  return { prev: sorted[i - 1] ?? null, next: sorted[i + 1] ?? null };
}

/**
 * The nickname in a "Group · note" description: the note, when it starts with
 * a capital letter ("OCLL · Sune" → "Sune"). Lowercase notes are plain facts
 * ("mirror of OLL 6"), not names; see the OLL categories seed.
 */
export function caseNickname(description: string | null | undefined): string | null {
  const i = description?.indexOf(" · ") ?? -1;
  if (!description || i <= 0) return null;
  const note = description.slice(i + 3).trim();
  return /^\p{Lu}/u.test(note) ? note : null;
}

/**
 * The case's heading. A plain numbered name ("OLL 27") gains its nickname or,
 * failing that, its group: "OLL 27 (Sune)", "OLL 5 (Square)". Names that
 * already say what the case is ("Aa Perm", "Sune 1") are used as they are.
 */
export function caseHeading(
  c: { name: string; case_number: number; description: string | null },
  setName: string,
): string {
  if (c.name !== `${setName} ${c.case_number}`) return c.name;
  const qualifier = caseNickname(c.description) ?? caseCategory(c.description);
  return qualifier ? `${c.name} (${qualifier})` : c.name;
}

/** The page's <title>, e.g. "OLL 27 (Sune) Algorithm · 3x3 Cube | CubeHub". */
export function caseMetaTitle(
  heading: string,
  setName: string,
  puzzleName: string,
  algorithmCount: number,
): string {
  const noun = algorithmCount > 1 ? "Algorithms" : "Algorithm";
  const set = heading.includes(setName) ? "" : ` · ${setName}`;
  return `${heading} ${noun}${set} · ${puzzleName} | CubeHub`;
}
