import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, Filter, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CaseDetail } from "@/components/learn/case-detail";
import { CaseKeyNav } from "@/components/learn/case-key-nav";
import { CaseSwitcher } from "@/components/learn/case-switcher";
import { getCase } from "@/lib/learn/dal";
import { mainAlgorithm } from "@/lib/learn/case-diagram";
import {
  filterFromParams,
  filterQuery,
  filteredNeighbours,
  isFiltered,
  nextUnlearned,
  type CaseFilter,
} from "@/lib/learn/case-filter";
import { caseOptions } from "@/lib/learn/case-options";
import {
  caseHeading,
  caseMetaTitle,
  casePath,
  parseCaseNumber,
} from "@/lib/learn/case-route";

interface Props {
  params: Promise<{ puzzle: string; series: string; case: string }>;
  /** The list filters this case was opened with (see lib/learn/case-filter). */
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** "To learn · Dot · “sune”": the active filters, for the chip above the case. */
function describeFilter(f: CaseFilter): string {
  return [
    f.status === "unlearned" ? "To learn" : f.status === "learned" ? "Learned" : null,
    f.category,
    f.search.trim() ? `“${f.search.trim()}”` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

async function load(params: Props["params"]) {
  const { puzzle, series, case: segment } = await params;
  const n = parseCaseNumber(segment);
  return n === null ? null : getCase(puzzle, series, n);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await load(params);
  if (!data) return { title: "Not Found | CubeHub" };

  const { puzzle, series, algCase } = data;
  const heading = caseHeading(algCase, series.name);
  const title = caseMetaTitle(heading, series.name, puzzle.name, algCase.algorithms.length);
  const main = mainAlgorithm(algCase);
  const others = algCase.algorithms.length - 1;
  const description = main
    ? `${heading}: ${main.moves} (${main.move_count} moves)${
        others > 0 ? `, plus ${others} alternative${others > 1 ? "s" : ""}` : ""
      }. Watch it in 3D, then drill it on CubeHub.`
    : `${heading} on CubeHub.`;
  const path = casePath(puzzle.id, series.slug, algCase.case_number);

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, type: "article" },
  };
}

export default async function CasePage({ params, searchParams }: Props) {
  const data = await load(params);
  if (!data) notFound();

  const { puzzle, series, algCase, cases } = data;
  const heading = caseHeading(algCase, series.name);
  const options = caseOptions(cases, series.name);

  // Previous, next and Learn mode follow the list's filters, when it had any.
  const filter = filterFromParams(await searchParams);
  const query = filterQuery(filter);
  const { prev, next } = filteredNeighbours(cases, algCase.case_number, filter);
  const pathOf = (n: number) => casePath(puzzle.id, series.slug, n) + query;
  const upNext = nextUnlearned(cases, algCase.case_number, filter);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={`/learn/${puzzle.id}/${series.slug}${query}`}
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-3 text-muted-foreground")}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            {series.name}
          </Link>
          {options.length > 1 && (
            <CaseSwitcher
              puzzle={puzzle.id}
              series={series.slug}
              current={algCase.case_number}
              options={options}
              query={query}
            />
          )}
        </div>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {puzzle.name} · {series.name}
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{heading}</h1>
          {algCase.description && (
            <p className="max-w-2xl text-muted-foreground">{algCase.description}</p>
          )}
        </div>
      </div>

      {isFiltered(filter) && (
        <div className="-mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 font-medium text-foreground">
            <Filter className="h-3 w-3 text-primary" />
            {describeFilter(filter)}
          </span>
          <span>Previous and next stay within this filter.</span>
          <Link
            href={casePath(puzzle.id, series.slug, algCase.case_number)}
            className="flex items-center gap-1 rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <X className="h-3 w-3" />
            Clear
          </Link>
        </div>
      )}

      <CaseDetail
        algCase={algCase}
        puzzle={puzzle.id}
        nextUnlearned={
          upNext
            ? {
                caseNumber: upNext.case_number,
                heading: caseHeading(upNext, series.name),
                href: pathOf(upNext.case_number),
              }
            : null
        }
      />
      <CaseKeyNav
        prevHref={prev ? pathOf(prev.case_number) : null}
        nextHref={next ? pathOf(next.case_number) : null}
      />

      <nav aria-label="Other cases" className="flex items-center justify-between gap-4 border-t border-border/50 pt-6">
        {prev ? (
          <Link
            href={pathOf(prev.case_number)}
            rel="prev"
            className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4 shrink-0" />
            <span className="truncate">{prev.name}</span>
          </Link>
        ) : (
          <span />
        )}
        {(prev || next) && (
          <p className="hidden text-xs text-muted-foreground sm:block">
            Tip: use <kbd className="rounded border border-border px-1 font-mono">←</kbd>{" "}
            <kbd className="rounded border border-border px-1 font-mono">→</kbd> to switch cases
          </p>
        )}
        {next ? (
          <Link
            href={pathOf(next.case_number)}
            rel="next"
            className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <span className="truncate">{next.name}</span>
            <ChevronRight className="h-4 w-4 shrink-0" />
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
