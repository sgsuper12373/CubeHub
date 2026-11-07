"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { SetRanking } from "@/components/drill/drill-report";
import { Button } from "@/components/ui/button";
import type { DrillCase } from "@/lib/drill/dal";
import type { StatsByAlgorithm } from "@/lib/drill/types";
import { cn } from "@/lib/utils";

/**
 * The cases pane: every case in the set, weakest first, and the custom-set
 * picker. The header stays put; the list scrolls inside the pane.
 * (Placeholder around SetRanking until the sortable table replaces it.)
 */
export function CaseTable({
  puzzle,
  cases,
  stats,
  now,
  className,
}: {
  puzzle: string;
  cases: readonly DrillCase[];
  stats: StatsByAlgorithm;
  /** Passed in so rendering stays pure; refreshed by DrillLab on each case. */
  now: number;
  className?: string;
}) {
  const router = useRouter();
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  return (
    <section
      className={cn("flex min-h-0 flex-col rounded-lg border border-border bg-card", className)}
      aria-label="Cases in this set"
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Cases, weakest first</h2>
        {selecting ? (
          <div className="flex gap-1.5">
            <Button size="xs" variant="ghost" onClick={() => setSelecting(false)}>
              Cancel
            </Button>
            <Button
              size="xs"
              disabled={selected.size === 0}
              onClick={() => router.push(`/learn/${puzzle}/drill?cases=${[...selected].join(",")}`)}
            >
              Drill {selected.size} selected
            </Button>
          </div>
        ) : (
          <Button size="xs" variant="outline" onClick={() => setSelecting(true)}>
            Custom set
          </Button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">
        <SetRanking
          cases={cases}
          stats={stats}
          now={now}
          selecting={selecting}
          selected={selected}
          onToggle={(id) =>
            setSelected((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            })
          }
        />
      </div>
    </section>
  );
}
