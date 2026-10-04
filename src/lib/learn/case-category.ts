/**
 * A case's category is the part of its description before " · ", e.g.
 * "Sune · first layer solved" → "Sune", "PBL · adjacent swap on both layers"
 * → "PBL". The seed scripts write descriptions in this form on purpose (see
 * supabase/DataSeeds/). Descriptions without the separator have no category:
 * splitting on anything looser, like a comma, would cut PLL descriptions such
 * as "Adjacent corner swap, adjacent edge swap" in half.
 */
const SEPARATOR = " · ";

export function caseCategory(description: string | null | undefined): string | null {
  const i = description?.indexOf(SEPARATOR) ?? -1;
  if (!description || i <= 0) return null;
  return description.slice(0, i).trim() || null;
}

export type CaseCategoryCount = { name: string; count: number };

/**
 * The categories of a set of cases, in the order they first appear (cases come
 * sorted by case number, so this follows the set's own order). Returns an empty
 * list unless every case has a category and there are at least two: a partial
 * or single-category filter would only hide cases without helping.
 */
export function caseCategories(
  cases: ReadonlyArray<{ description: string | null }>,
): CaseCategoryCount[] {
  const counts = new Map<string, number>();
  for (const c of cases) {
    const category = caseCategory(c.description);
    if (!category) return [];
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  if (counts.size < 2) return [];
  return [...counts].map(([name, count]) => ({ name, count }));
}
