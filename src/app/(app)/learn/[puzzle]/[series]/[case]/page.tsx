import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CaseDetail } from "@/components/learn/case-detail";
import { getCase } from "@/lib/learn/dal";
import { mainAlgorithm } from "@/lib/learn/case-diagram";
import {
  caseHeading,
  caseMetaTitle,
  casePath,
  parseCaseNumber,
} from "@/lib/learn/case-route";

interface Props {
  params: Promise<{ puzzle: string; series: string; case: string }>;
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

export default async function CasePage({ params }: Props) {
  const data = await load(params);
  if (!data) notFound();

  const { puzzle, series, algCase, prev, next } = data;
  const heading = caseHeading(algCase, series.name);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-4">
        <Link
          href={`/learn/${puzzle.id}/${series.slug}`}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-3 text-muted-foreground")}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          {series.name}
        </Link>
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

      <CaseDetail algCase={algCase} puzzle={puzzle.id} />

      <nav aria-label="Other cases" className="flex items-center justify-between gap-4 border-t border-border/50 pt-6">
        {prev ? (
          <Link
            href={casePath(puzzle.id, series.slug, prev.case_number)}
            rel="prev"
            className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4 shrink-0" />
            <span className="truncate">{prev.name}</span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link
            href={casePath(puzzle.id, series.slug, next.case_number)}
            rel="next"
            className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <span className="truncate">{next.name}</span>
            <ChevronRight className="h-4 w-4 shrink-0" />
          </Link>
        )}
      </nav>
    </div>
  );
}
