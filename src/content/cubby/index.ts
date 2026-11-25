import type { PageContent } from "@/lib/companion/content";
import type { CompanionPage } from "@/lib/companion/pages";

/**
 * Cubby's content files, one per page (docs/companion-plan.md step 6).
 * A page without an entry gets the dock but no tour, greeting or tips.
 */
export const CUBBY_CONTENT: Partial<Record<CompanionPage, PageContent>> = {};

export function contentFor(page: CompanionPage | null): PageContent | null {
  return page ? (CUBBY_CONTENT[page] ?? null) : null;
}
