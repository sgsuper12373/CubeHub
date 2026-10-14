"use client";

import { SolveRow } from "@/components/stats/solve-row";
import type { Penalty, Solve } from "@/lib/timer/types";
import { useSessionStore } from "@/stores/session-store";

/**
 * Scrollable list of solves for the active session. Newest first.
 */
export function SolveList({
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
  // Until the session has loaded, an empty list means "not yet", not "none".
  const hydrated = useSessionStore((s) => s.hydrated);
  if (!hydrated) {
    return (
      <div className="flex flex-col gap-2 px-3 py-2" aria-busy="true" aria-label="Loading solves">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className="h-4 w-full animate-pulse rounded bg-muted" />
        ))}
      </div>
    );
  }

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
          onNotes={onNotes}
        />
      ))}
    </div>
  );
}
