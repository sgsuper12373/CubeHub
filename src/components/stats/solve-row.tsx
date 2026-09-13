"use client";

import { Trash2 } from "lucide-react";
import { useRef, useState } from "react";

import { formatResult } from "@/lib/timer/format";
import type { Penalty, Solve } from "@/lib/timer/types";
import { cn } from "@/lib/utils";
import { SolveDetailModal } from "@/components/stats/solve-detail";

/**
 * A single solve in the list. Desktop: hover reveals actions. Mobile:
 * swipe-to-reveal via touch translate. All hit areas ≥ 44 px.
 */
export function SolveRow({
  solve,
  index,
  onPenalty,
  onDelete,
  onNotes,
}: {
  solve: Solve;
  index: number;
  onPenalty: (id: string, p: Penalty) => void;
  onDelete: (id: string) => void;
  onNotes: (id: string, notes: string) => void;
}) {
  const [swiped, setSwiped] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const startXRef = useRef(0);
  const rowRef = useRef<HTMLDivElement>(null);

  const togglePenalty = (p: Exclude<Penalty, "none">) => {
    onPenalty(solve.id, solve.penalty === p ? "none" : p);
  };

  return (
    <div className="relative overflow-hidden">
      {/* Actions revealed on swipe (mobile only) */}
      <div
        className={cn(
          "absolute inset-y-0 right-0 flex items-stretch md:hidden",
          !swiped && "pointer-events-none",
        )}
      >
        <button
          type="button"
          className="flex w-14 items-center justify-center bg-amber-600/80 text-xs font-bold text-white"
          onClick={(e) => {
            e.stopPropagation();
            togglePenalty("plus2");
            setSwiped(false);
          }}
        >
          +2
        </button>
        <button
          type="button"
          className="flex w-14 items-center justify-center bg-orange-600/80 text-xs font-bold text-white"
          onClick={(e) => {
            e.stopPropagation();
            togglePenalty("dnf");
            setSwiped(false);
          }}
        >
          DNF
        </button>
        <button
          type="button"
          className="flex w-14 items-center justify-center bg-destructive/80 text-white"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(solve.id);
          }}
          aria-label="Delete solve"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      {/* Main row — slides left on swipe on mobile */}
      <div
        ref={rowRef}
        className={cn(
          "relative flex min-h-11 items-center gap-3 px-3 py-1.5 transition-all duration-200 group cursor-pointer",
          "bg-background md:bg-transparent hover:bg-muted/50",
          swiped ? "-translate-x-[10.5rem]" : "translate-x-0",
        )}
        onClick={() => setDetailOpen(true)}
        onTouchStart={(e) => {
          startXRef.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          const dx = startXRef.current - e.changedTouches[0].clientX;
          if (dx > 60) setSwiped(true);
          else if (dx < -30) setSwiped(false);
        }}
      >
        {/* Index */}
        <span className="w-7 shrink-0 text-right font-mono text-xs text-muted-foreground tabular-nums">
          {index}.
        </span>

        {/* Time */}
        <span
          className={cn(
            "flex-1 font-mono text-sm font-medium tabular-nums",
            solve.penalty === "dnf"
              ? "text-destructive"
              : solve.penalty === "plus2"
                ? "text-amber-400"
                : "text-foreground",
          )}
        >
          {formatResult(solve.timeMs, solve.penalty)}
        </span>

        {/* Desktop hover actions */}
        <div className="hidden items-center gap-1 md:flex shrink-0 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-150">
          <button
            type="button"
            className={cn(
              "rounded px-1.5 py-0.5 text-xs font-semibold transition-colors",
              solve.penalty === "plus2"
                ? "bg-amber-600/20 text-amber-400 hover:bg-amber-600/30"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
            onClick={(e) => {
              e.stopPropagation();
              togglePenalty("plus2");
            }}
          >
            +2
          </button>
          <button
            type="button"
            className={cn(
              "rounded px-1.5 py-0.5 text-xs font-semibold transition-colors",
              solve.penalty === "dnf"
                ? "bg-destructive/20 text-destructive hover:bg-destructive/30"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
            onClick={(e) => {
              e.stopPropagation();
              togglePenalty("dnf");
            }}
          >
            DNF
          </button>
          <button
            type="button"
            aria-label="Delete"
            className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(solve.id);
            }}
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
      {detailOpen && (
        <SolveDetailModal
          solve={solve}
          puzzle={solve.puzzle}
          onClose={() => setDetailOpen(false)}
          onPenalty={(p) => onPenalty(solve.id, p)}
          onDelete={() => onDelete(solve.id)}
          onNotes={(notes) => onNotes(solve.id, notes)}
        />
      )}
    </div>
  );
}
