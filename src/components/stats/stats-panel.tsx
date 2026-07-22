"use client";

import { BarChart3, X } from "lucide-react";
import { useState } from "react";

import { SessionTrend } from "@/components/stats/session-trend";
import { SolveList } from "@/components/stats/solve-list";
import { StatTiles } from "@/components/stats/stat-tiles";
import { Button } from "@/components/ui/button";
import { bestSingle, sessionMean, wcaAverage } from "@/lib/timer/stats";
import type { Penalty, Solve } from "@/lib/timer/types";
import { cn } from "@/lib/utils";

/**
 * Mobile stats drawer: a floating button that opens a slide-up sheet over the
 * timer, so a small phone keeps maximum timer space.
 *
 * Mobile only. At md+ the same three views (tiles, trend, solve list) are
 * independent panels in the rearrangeable grid — see `layout-shell.tsx` — so
 * rendering a rail here as well would duplicate them.
 */
export function StatsPanel({
  solves,
  onPenalty,
  onDelete,
  onNotes,
}: {
  solves: Solve[];
  onPenalty: (id: string, p: Penalty) => void;
  onDelete: (id: string) => void;
  onNotes: (id: string, notes: string) => void;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const best = bestSingle(solves);
  const ao5 = wcaAverage(solves, 5);
  const ao12 = wcaAverage(solves, 12);
  const ao50 = wcaAverage(solves, 50);
  const ao100 = wcaAverage(solves, 100);
  const mean = sessionMean(solves);

  const content = (
    <>
      <StatTiles
        best={best}
        ao5={ao5}
        ao12={ao12}
        ao50={ao50}
        ao100={ao100}
        mean={mean}
        count={solves.length}
      />
      <SessionTrend solves={solves} />
      <SolveList
        solves={solves} 
        onPenalty={onPenalty} 
        onDelete={onDelete} 
        onNotes={onNotes} 
      />
    </>
  );

  return (
    <>
      {/* ── Mobile: toggle button ── */}
      <Button
        variant="outline"
        size="icon"
        className={cn(
          "fixed right-4 bottom-20 z-40 rounded-full shadow-lg md:hidden",
          "bg-card/80 backdrop-blur-sm",
          drawerOpen && "hidden",
        )}
        aria-label="Show stats"
        onClick={() => setDrawerOpen(true)}
      >
        <BarChart3 className="size-5" />
        {solves.length > 0 && (
          <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-primary text-[0.6rem] font-bold text-primary-foreground">
            {solves.length > 99 ? "99+" : solves.length}
          </span>
        )}
      </Button>

      {/* ── Mobile: slide-up drawer ── */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          {/* Drawer */}
          <div
            className={cn(
              "fixed inset-x-0 bottom-0 z-50 flex max-h-[75vh] flex-col rounded-t-2xl border-t border-border bg-background pb-16 md:hidden",
              "animate-in slide-in-from-bottom duration-200",
            )}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
              <h2 className="text-sm font-semibold text-foreground">
                Session Stats
              </h2>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Close stats"
                onClick={() => setDrawerOpen(false)}
              >
                <X />
              </Button>
            </div>
            <div className="flex flex-1 flex-col gap-3 overflow-hidden py-3">
              {content}
            </div>
          </div>
        </>
      )}

    </>
  );
}
