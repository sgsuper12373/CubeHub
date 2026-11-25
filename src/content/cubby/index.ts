import drill from "@/content/cubby/drill.json";
import learnSeries from "@/content/cubby/learn-series.json";
import learn from "@/content/cubby/learn.json";
import playground from "@/content/cubby/playground.json";
import timer from "@/content/cubby/timer.json";
import type { PageContent } from "@/lib/companion/content";
import type { CompanionPage } from "@/lib/companion/pages";

/**
 * Cubby's content files, one per page (docs/companion-plan.md step 6). The
 * beta tours: Timer, Learn (the index and a set's page), Drill Lab and
 * Playground. A page without an entry gets the dock but no tour or greeting.
 * `tests/unit/cubby-content-files.test.ts` validates every file and checks
 * that each step's target is a `data-tour` marker somewhere in src/.
 */
export const CUBBY_CONTENT: Partial<Record<CompanionPage, PageContent>> = {
  timer: timer as PageContent,
  learn: learn as PageContent,
  "learn-series": learnSeries as PageContent,
  drill: drill as PageContent,
  playground: playground as PageContent,
};

export function contentFor(page: CompanionPage | null): PageContent | null {
  return page ? (CUBBY_CONTENT[page] ?? null) : null;
}
