"use client";

import { useMemo, useState } from "react";
import { AlgorithmCase } from "@/lib/learn/dal";
import { AlgorithmCard } from "@/components/learn/algorithm-card";
import { Search, CheckCircle, Circle, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

type FilterStatus = "all" | "unlearned" | "learned";

export function AlgorithmCaseList({
  cases,
  puzzle = "333",
}: {
  cases: AlgorithmCase[];
  puzzle?: string;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("all");

  const filteredCases = useMemo(() => {
    let result = cases;

    if (filter === "learned") {
      result = result.filter((c) => c.learned);
    } else if (filter === "unlearned") {
      result = result.filter((c) => !c.learned);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.case_number.toString().includes(q) ||
          (c.description && c.description.toLowerCase().includes(q)) ||
          c.algorithms.some((a) => a.moves.toLowerCase().includes(q)),
      );
    }

    return result;
  }, [cases, filter, search]);

  const learnedCount = cases.filter((c) => c.learned).length;
  const unlearnedCount = cases.length - learnedCount;

  return (
    <div className="space-y-6">
      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-muted/20 border border-white/5 p-2 rounded-2xl">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-background/50 p-1 rounded-xl border border-white/5">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              filter === "all"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            All ({cases.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("unlearned")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              filter === "unlearned"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Circle className="h-3.5 w-3.5" />
            To Learn ({unlearnedCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("learned")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              filter === "learned"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <CheckCircle className="h-3.5 w-3.5 text-green-400" />
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
            className="w-full h-9 pl-9 pr-3 rounded-xl bg-background/50 border border-white/5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
      </div>

      {/* Grid of cases */}
      {filteredCases.length > 0 ? (
        <div className="flex flex-wrap justify-center gap-4">
          {filteredCases.map((algCase) => (
            <div
              key={algCase.id}
              className="w-full sm:w-[calc(50%-1rem)] xl:w-[400px]"
            >
              <AlgorithmCard algCase={algCase} puzzle={puzzle} />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl text-muted-foreground">
          <p className="text-sm">No algorithm cases match the filter criteria.</p>
        </div>
      )}
    </div>
  );
}
