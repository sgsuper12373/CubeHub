"use client";

import { SolveRow } from "@/components/stats/solve-row";
import type { Penalty, Solve } from "@/lib/timer/types";

/**
 * Scrollable list of solves for the active session. Newest first.
 */
export function SolveList({
  solves,
  onPenalty,
  onDelete,
}: {
  solves: Solve[];
  onPenalty: (id: string, p: Penalty) => void;
  onDelete: (id: string) => void;
}) {
  if (solves.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">No solves yet</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto divide-y divide-border/50">
      {solves.map((s, i) => (
        <SolveRow
          key={s.id}
          solve={s}
          index={solves.length - i}
          onPenalty={onPenalty}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
