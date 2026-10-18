import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DrillLab } from "@/components/drill/drill-lab";
import { buttonVariants } from "@/components/ui/button";
import { getUser } from "@/lib/auth/dal";
import { randomAuf } from "@/lib/drill/case-state";
import { getDrillData, type DrillSelection } from "@/lib/drill/dal";
import { nextCase } from "@/lib/drill/order";
import type { DrillOrder } from "@/lib/drill/types";
import { getPuzzle } from "@/lib/learn/dal";

interface Props {
  params: Promise<{ puzzle: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { puzzle } = await params;
  const data = await getPuzzle(puzzle);
  return { title: data ? `Drill Lab — ${data.name} | CubeHub` : "Not Found | CubeHub" };
}

function param(v: string | string[] | undefined): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

/** Custom sets travel in the URL, so a set can be bookmarked or shared. */
const MAX_CUSTOM_CASES = 200;

export default async function DrillPage({ params, searchParams }: Props) {
  const { puzzle: puzzleId } = await params;
  const sp = await searchParams;
  const puzzle = await getPuzzle(puzzleId);
  if (!puzzle) notFound();

  const firstSubset = puzzle.series.find((s) => s.type === "algorithms")?.slug ?? null;
  const single = param(sp.case);
  const custom = param(sp.cases);
  const set = param(sp.set) ?? firstSubset ?? "all";

  let selection: DrillSelection;
  let activeSet: string;
  if (single || custom) {
    const ids = (single ?? custom ?? "").split(",").slice(0, MAX_CUSTOM_CASES);
    selection = { kind: "cases", ids };
    activeSet = "custom";
  } else if (set === "all") {
    selection = { kind: "all" };
    activeSet = "all";
  } else {
    selection = { kind: "subset", slug: set };
    activeSet = set;
  }

  const [data, user] = await Promise.all([getDrillData(puzzleId, selection), getUser()]);
  if (!data) notFound();

  // A set starts with the cases marked learned in Learn, so Learn and Drill
  // work as one; "All" drills the whole set. With nothing learned yet, all.
  const learnedIds = new Set(data.learnedCaseIds);
  const learnedHere = data.cases.filter((c) => learnedIds.has(c.id));
  const scope: "learned" | "all" | null =
    selection.kind !== "subset" ? null : param(sp.scope) === "all" || learnedHere.length === 0 ? "all" : "learned";
  const cases = scope === "learned" ? learnedHere : data.cases;

  if (data.cases.length === 0) {
    return (
      <div className="mx-auto max-w-xl space-y-4 px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold text-foreground">Nothing to drill here</h1>
        <p className="text-muted-foreground">
          {data.subsets.length === 0
            ? `There are no algorithm sets for ${puzzle.name} yet.`
            : "This set has no cases with approved algorithms yet."}
        </p>
        {data.subsets.length === 0 && (
          <Link href="/learn" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Browse tutorials
          </Link>
        )}
        <div className="flex flex-wrap justify-center gap-2">
          {data.subsets.map((s) => (
            <Link
              href={`/learn/${puzzleId}/drill?set=${encodeURIComponent(s.slug)}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
              key={s.slug}
            >
              {s.name}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  const stats = new Map(data.stats.map((s) => [s.algorithmId, s]));
  const scopeInfo =
    scope === null ? null : { scope, learned: learnedHere.length, total: data.cases.length };
  // Weakest first once there is history to rank by; random until then.
  const order: DrillOrder =
    param(sp.order) === "random" ? "random" : param(sp.order) === "weakest" || stats.size > 0 ? "weakest" : "random";
  // Picked on the server so the first render is identical on both sides.
  const first = nextCase(cases, stats, order, null) ?? cases[0];

  return (
    <>
      <h1 className="sr-only">Drill Lab — {puzzle.name}</h1>
      <DrillLab
        // A new set is a new drill: remount rather than carry state across.
        key={`${activeSet}:${cases.map((c) => c.id).join(",")}`}
        puzzle={puzzleId}
        subsets={data.subsets}
        activeSet={activeSet}
        cases={cases}
        scopeInfo={scopeInfo}
        initialStats={data.stats}
        initialCaseId={first.id}
        initialAuf={randomAuf()}
        initialOrder={order}
        isAuthed={user !== null}
      />
    </>
  );
}
