"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Dialog } from "@base-ui/react/dialog";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import type { AlgorithmCase } from "@/lib/learn/dal";
import { Button, buttonVariants } from "@/components/ui/button";
import { CaseDetail } from "@/components/learn/case-detail";
import { CaseSwitcher } from "@/components/learn/case-switcher";
import { useCaseKeys } from "@/components/learn/use-case-keys";
import {
  filterQuery,
  filteredNeighbours,
  matchesCaseFilter,
  nextUnlearned,
  type CaseFilter,
} from "@/lib/learn/case-filter";
import { caseOptions } from "@/lib/learn/case-options";
import { caseHeading, casePath } from "@/lib/learn/case-route";
import { cn } from "@/lib/utils";

/**
 * A case opened from the list, in a panel over the grid, so the list keeps its
 * filters and scroll position. Previous, next, ← → and Learn mode all walk the
 * list as it's filtered; the switcher jumps anywhere in the set. "Full page"
 * opens the case's own page with the same filters.
 */
export function CasePanel({
  algCase,
  cases,
  filter,
  puzzle,
  series,
  seriesName,
  onSelect,
  onClose,
}: {
  /** The open case, or null when the panel is closed. */
  algCase: AlgorithmCase | null;
  cases: AlgorithmCase[];
  filter: CaseFilter;
  puzzle: string;
  series: string;
  seriesName: string;
  onSelect: (caseNumber: number) => void;
  onClose: () => void;
}) {
  // Keep showing the last case while the panel animates closed.
  const [shown, setShown] = useState(algCase);
  if (algCase && algCase !== shown) setShown(algCase);

  const options = useMemo(() => caseOptions(cases, seriesName), [cases, seriesName]);
  const query = filterQuery(filter);
  const current = shown?.case_number ?? 0;
  const { prev, next } = filteredNeighbours(cases, current, filter);
  const upNext = nextUnlearned(cases, current, filter);
  const matching = cases.filter((c) => matchesCaseFilter(c, filter));
  const position = matching.findIndex((c) => c.case_number === current);

  // Each case starts at the top, with its player in view.
  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [current]);

  useCaseKeys(
    algCase && prev ? () => onSelect(prev.case_number) : null,
    algCase && next ? () => onSelect(next.case_number) : null,
  );

  return (
    <Dialog.Root open={algCase !== null} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-border bg-card shadow-2xl outline-none transition-transform duration-200 ease-out data-[ending-style]:translate-x-full data-[starting-style]:translate-x-full sm:max-w-2xl">
          {shown && (
            <>
              <header className="space-y-3 border-b border-border/60 px-4 pb-3 pt-4 sm:px-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <Dialog.Title className="text-2xl font-bold tracking-tight">
                      {caseHeading(shown, seriesName)}
                    </Dialog.Title>
                    {shown.description && (
                      <Dialog.Description className="text-sm text-muted-foreground">
                        {shown.description}
                      </Dialog.Description>
                    )}
                  </div>
                  <Dialog.Close
                    render={
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Close" />
                    }
                  >
                    <X className="h-4 w-4" />
                  </Dialog.Close>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={!prev}
                      onClick={() => prev && onSelect(prev.case_number)}
                      aria-label={prev ? `Previous: ${prev.name}` : "No previous case"}
                      title="Previous case (←)"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={!next}
                      onClick={() => next && onSelect(next.case_number)}
                      aria-label={next ? `Next: ${next.name}` : "No next case"}
                      title="Next case (→)"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    {position >= 0 && (
                      <span className="px-1.5 text-xs tabular-nums text-muted-foreground">
                        {position + 1} of {matching.length}
                      </span>
                    )}
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <CaseSwitcher
                      puzzle={puzzle}
                      series={series}
                      current={current}
                      options={options}
                      query={query}
                      onSelect={onSelect}
                    />
                    <Link
                      href={casePath(puzzle, series, current) + query}
                      className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-muted-foreground")}
                      title="Open the case's own page"
                    >
                      <Maximize2 className="mr-1.5 h-3.5 w-3.5" />
                      Full page
                    </Link>
                  </div>
                </div>
              </header>

              <div ref={bodyRef} className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
                <CaseDetail
                  // A fresh detail per case, so the picked algorithm resets.
                  key={shown.id}
                  algCase={shown}
                  puzzle={puzzle}
                  nextUnlearned={
                    upNext
                      ? {
                          caseNumber: upNext.case_number,
                          heading: caseHeading(upNext, seriesName),
                          href: casePath(puzzle, series, upNext.case_number) + query,
                        }
                      : null
                  }
                  onSelectCase={onSelect}
                />
              </div>
            </>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
