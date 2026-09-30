"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Search } from "lucide-react";
import { LearnSeries } from "@/lib/learn/dal";
import { SeriesCard } from "@/components/learn/series-card";
import { StaggeredGrid } from "@/components/learn/staggered-grid";

const TABS = ["All", "Algorithms", "Tutorials", "Methods"] as const;
type TabType = (typeof TABS)[number];

interface PuzzleSeriesListProps {
  puzzleId: string;
  series: LearnSeries[];
}

export function PuzzleSeriesList({ puzzleId, series }: PuzzleSeriesListProps) {
  const [activeTab, setActiveTab] = useState<TabType>("All");
  const [search, setSearch] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const filteredSeries = useMemo(() => {
    let result = series;

    if (activeTab === "Algorithms") {
      result = result.filter((s) => s.type === "algorithms");
    } else if (activeTab === "Tutorials") {
      result = result.filter(
        (s) => s.type === "tutorial" && !s.name.toLowerCase().includes("method"),
      );
    } else if (activeTab === "Methods") {
      result = result.filter(
        (s) => s.type === "tutorial" && s.name.toLowerCase().includes("method"),
      );
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.slug.toLowerCase().includes(q),
      );
    }

    return result;
  }, [series, activeTab, search]);

  return (
    <div className="space-y-8 mt-8">
      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 z-20 relative">
        {/* Segmented Control */}
        <div className="flex items-center p-1.5 rounded-2xl bg-foreground/[0.03] border border-border shadow-inner backdrop-blur-md self-stretch md:self-auto overflow-x-auto w-full md:w-auto hide-scrollbar">
          {TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`relative px-5 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap outline-none ${
                  isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeSeriesTab"
                    className="absolute inset-0 rounded-xl bg-primary/20 border border-primary/30 shadow-[0_0_20px_color-mix(in_oklch,var(--primary)_15%,transparent)]"
                    transition={{ type: "spring", stiffness: 300, damping: 24 }}
                  />
                )}
                <span className="relative z-10">{tab}</span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div
            className={`relative flex items-center transition-all duration-300 ease-out flex-1 md:flex-none ${
              isSearchFocused ? "md:w-80" : "md:w-64"
            }`}
          >
            <Search
              className={`absolute left-3 w-4 h-4 transition-colors ${
                isSearchFocused ? "text-primary" : "text-muted-foreground"
              }`}
            />
            <input
              type="text"
              placeholder="Search tutorials or algorithms..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-muted/30 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all shadow-inner"
            />
          </div>
        </div>
      </div>

      {/* Series Cards Grid */}
      {filteredSeries.length > 0 ? (
        <StaggeredGrid>
          {filteredSeries.map((s) => (
            <SeriesCard key={s.id} series={s} puzzleId={puzzleId} />
          ))}
        </StaggeredGrid>
      ) : (
        <div className="text-center py-20 border border-border rounded-3xl bg-foreground/[0.02] backdrop-blur-md">
          <p className="text-base text-muted-foreground">
            No tutorials or algorithms found matching your filter.
          </p>
        </div>
      )}
    </div>
  );
}
