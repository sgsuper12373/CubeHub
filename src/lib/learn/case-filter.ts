import { caseCategory } from "@/lib/learn/case-category";

/**
 * The case list's filters (status, category, search), shared by the list, its
 * side panel and the case page, so "previous", "next" and "next unlearned"
 * walk the same cases everywhere. Pure, and round-trips through the URL
 * (?status=unlearned&group=Dot&q=sune) so a filtered case page can be linked.
 */
export type CaseStatus = "all" | "unlearned" | "learned";

export type CaseFilter = {
  status: CaseStatus;
  category: string | null;
  search: string;
};

export const NO_FILTER: CaseFilter = { status: "all", category: null, search: "" };

type FilterableCase = {
  case_number: number;
  name: string;
  description: string | null;
  learned: boolean;
  algorithms: ReadonlyArray<{ moves: string }>;
};

export function isFiltered(f: CaseFilter): boolean {
  return f.status !== "all" || f.category !== null || f.search.trim() !== "";
}

export function matchesCaseFilter(c: FilterableCase, f: CaseFilter): boolean {
  if (f.category && caseCategory(c.description) !== f.category) return false;
  if (f.status === "learned" && !c.learned) return false;
  if (f.status === "unlearned" && c.learned) return false;
  const q = f.search.toLowerCase().trim();
  if (!q) return true;
  return (
    c.name.toLowerCase().includes(q) ||
    c.case_number.toString().includes(q) ||
    (c.description?.toLowerCase().includes(q) ?? false) ||
    c.algorithms.some((a) => a.moves.toLowerCase().includes(q))
  );
}

/** The filter as URL params; defaults are left out, so no filter is "". */
export function filterToParams(f: CaseFilter): URLSearchParams {
  const params = new URLSearchParams();
  if (f.status !== "all") params.set("status", f.status);
  if (f.category) params.set("group", f.category);
  if (f.search.trim()) params.set("q", f.search.trim());
  return params;
}

/** "?status=unlearned" or "", for appending to a path. */
export function filterQuery(f: CaseFilter): string {
  const s = filterToParams(f).toString();
  return s ? `?${s}` : "";
}

type ParamSource =
  | { get(key: string): string | null }
  | Record<string, string | string[] | undefined>;

function read(params: ParamSource, key: string): string | null {
  if (typeof params.get === "function") {
    return (params as { get(key: string): string | null }).get(key);
  }
  const v = (params as Record<string, string | string[] | undefined>)[key];
  return (Array.isArray(v) ? v[0] : v) ?? null;
}

/** Reads a filter back from URLSearchParams or a page's searchParams object. */
export function filterFromParams(params: ParamSource): CaseFilter {
  const status = read(params, "status");
  return {
    status: status === "learned" || status === "unlearned" ? status : "all",
    category: read(params, "group")?.trim() || null,
    search: read(params, "q")?.slice(0, 100) ?? "",
  };
}

function sortedByNumber<T extends { case_number: number }>(cases: readonly T[]): T[] {
  return [...cases].sort((a, b) => a.case_number - b.case_number);
}

/**
 * The matching cases either side of `caseNumber`, in case-number order. The
 * current case needn't match the filter itself: once you mark a case learned
 * under "To learn", previous and next still lead somewhere sensible.
 */
export function filteredNeighbours<T extends FilterableCase>(
  cases: readonly T[],
  caseNumber: number,
  f: CaseFilter,
): { prev: T | null; next: T | null } {
  const sorted = sortedByNumber(cases);
  const prev = sorted.filter((c) => c.case_number < caseNumber && matchesCaseFilter(c, f)).at(-1);
  const next = sorted.find((c) => c.case_number > caseNumber && matchesCaseFilter(c, f));
  return { prev: prev ?? null, next: next ?? null };
}

/**
 * The next unlearned case after `caseNumber` that matches the filter, wrapping
 * round to the start of the set. Never the current case; null once every
 * other matching case is learned.
 */
export function nextUnlearned<T extends FilterableCase>(
  cases: readonly T[],
  caseNumber: number,
  f: CaseFilter,
): T | null {
  const sorted = sortedByNumber(cases);
  const after = sorted.filter((c) => c.case_number > caseNumber);
  const before = sorted.filter((c) => c.case_number < caseNumber);
  return (
    [...after, ...before].find((c) => !c.learned && matchesCaseFilter(c, f)) ?? null
  );
}
