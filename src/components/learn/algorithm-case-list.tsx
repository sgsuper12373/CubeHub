"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlgorithmCase } from "@/lib/learn/dal";
import { AlgorithmCard } from "@/components/learn/algorithm-card";
import { CasePanel } from "@/components/learn/case-panel";
import { Search, CheckCircle, Circle, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { caseCategories } from "@/lib/learn/case-category";
import {
  filterFromParams,
  filterQuery,
  filterToParams,
  matchesCaseFilter,
  type CaseFilter,
  type CaseStatus,
} from "@/lib/learn/case-filter";
import { casePath, parseCaseNumber } from "@/lib/learn/case-route";

const FILTER_KEYS = ["status", "group", "q"];

export function AlgorithmCaseList({
  cases,
  puzzle = "333",
  series,
  seriesName,
}: {
  cases: AlgorithmCase[];
  puzzle?: string;
  series: string;
  seriesName: string;
}) {
  const searchParams = useSearchParams();
  // The filters start from the URL, so coming back from a filtered case page
  // (or reloading) keeps them; they're written back to it as they change.
  const [initial] = useState(() => filterFromParams(searchParams));
  const [search, setSearch] = useState(initial.search);
  const [filter, setFilter] = useState<CaseStatus>(initial.status);
  const [category, setCategory] = useState<string | null>(initial.category);

  const categories = useMemo(() => caseCategories(cases), [cases]);
  // Ignore a selected category this set doesn't have (e.g. after navigation).
  const activeCategory = categories.some((c) => c.name === category) ? category : null;

  const caseFilter = useMemo<CaseFilter>(
    () => ({ status: filter, category: activeCategory, search }),
    [filter, activeCategory, search],
  );

  const filteredCases = useMemo(
    () => cases.filter((c) => matchesCaseFilter(c, caseFilter)),
    [cases, caseFilter],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    for (const key of FILTER_KEYS) params.delete(key);
    for (const [key, value] of filterToParams(caseFilter)) params.set(key, value);
    const next = params.toString() ? `?${params}` : window.location.pathname;
    if (next !== (window.location.search || window.location.pathname)) {
      window.history.replaceState(null, "", next);
    }
  }, [caseFilter]);

  // ?case=N opens that case in the side panel. Opening it adds a history entry,
  // so Back closes it; moving between cases inside the panel replaces it.
  const openNumber = parseCaseNumber(searchParams.get("case") ?? "");
  const openCase = cases.find((c) => c.case_number === openNumber) ?? null;
  const pushedRef = useRef(false);

  const showCase = (caseNumber: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set("case", String(caseNumber));
    if (openCase) {
      window.history.replaceState(null, "", `?${params}`);
    } else {
      window.history.pushState(null, "", `?${params}`);
      pushedRef.current = true;
    }
  };

  const closeCase = () => {
    if (pushedRef.current) {
      pushedRef.current = false;
      window.history.back();
      return;
    }
    const params = new URLSearchParams(window.location.search);
    params.delete("case");
    window.history.replaceState(null, "", params.toString() ? `?${params}` : window.location.pathname);
  };
  const query = filterQuery(caseFilter);

  const learnedCount = cases.filter((c) => c.learned).length;
  const unlearnedCount = cases.length - learnedCount;

  return (
    <div className="space-y-6">
      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-muted/20 border border-border p-2 rounded-2xl">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-background/50 p-1 rounded-xl border border-border">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap px-2 py-1.5 rounded-lg text-xs font-medium transition-colors sm:flex-none sm:px-3",
              filter === "all"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Layers className="hidden min-[400px]:block h-3.5 w-3.5" />
            All ({cases.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("unlearned")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap px-2 py-1.5 rounded-lg text-xs font-medium transition-colors sm:flex-none sm:px-3",
              filter === "unlearned"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Circle className="hidden min-[400px]:block h-3.5 w-3.5" />
            To Learn ({unlearnedCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("learned")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap px-2 py-1.5 rounded-lg text-xs font-medium transition-colors sm:flex-none sm:px-3",
              filter === "learned"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <CheckCircle className="hidden min-[400px]:block h-3.5 w-3.5 text-success" />
            Learned ({learnedCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search cases or moves..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-xl bg-background/50 border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
      </div>

      {/* Category filter: only for sets whose descriptions carry a category */}
      {categories.length > 0 && (
        <div
          role="group"
          aria-label="Filter by category"
          className="hide-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
        >
          <CategoryChip
            label="All categories"
            active={activeCategory === null}
            onClick={() => setCategory(null)}
          />
          {categories.map((c) => (
            <CategoryChip
              key={c.name}
              label={c.name}
              count={c.count}
              active={activeCategory === c.name}
              onClick={() => setCategory(activeCategory === c.name ? null : c.name)}
            />
          ))}
        </div>
      )}

      {/* Grid of cases */}
      {filteredCases.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredCases.map((algCase) => (
            <AlgorithmCard
              key={algCase.id}
              algCase={algCase}
              puzzle={puzzle}
              href={casePath(puzzle, series, algCase.case_number) + query}
              onOpen={() => showCase(algCase.case_number)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl text-muted-foreground">
          <p className="text-sm">No algorithm cases match the filter criteria.</p>
        </div>
      )}

      <CasePanel
        algCase={openCase}
        cases={cases}
        filter={caseFilter}
        puzzle={puzzle}
        series={series}
        seriesName={seriesName}
        onSelect={showCase}
        onClose={closeCase}
      />
    </div>
  );
}

function CategoryChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        active
          ? "border-primary/40 bg-primary/15 text-foreground"
          : "border-border bg-background/50 text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
      {count !== undefined && (
        <span className={cn("tabular-nums", active ? "text-primary" : "text-muted-foreground/70")}>
          {count}
        </span>
      )}
    </button>
  );
}
