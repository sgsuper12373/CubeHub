"use client";

import { Trash2 } from "lucide-react";

import type { Penalty } from "@/lib/timer/types";
import { cn } from "@/lib/utils";

/**
 * Post-solve actions for the solve that just finished. Rendered only in the
 * `stopped` phase, as a sibling of the touch stage (never inside it — taps
 * here must not reach the timer surface).
 *
 * Mobile: fixed in the thumb zone just above the bottom nav (h-16), three
 * equal oversized targets (min-h-14 ≈ 56 px) for a phone lying flat on the
 * desk. Desktop: a static row under the stage.
 *
 * +2 and DNF toggle; each handler blurs the button so a following Space
 * press talks to the timer, not to the focused button.
 */
export function PenaltyBar({
  penalty,
  onPlus2,
  onDnf,
  onDelete,
}: {
  penalty: Penalty;
  onPlus2: () => void;
  onDnf: () => void;
  onDelete: () => void;
}) {
  const base =
    "min-h-14 flex-1 basis-0 rounded-xl border text-lg font-semibold transition-colors select-none " +
    "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-16 z-30 flex justify-center gap-2 px-4 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]",
        "md:static md:z-auto md:mx-auto md:w-full md:max-w-md md:pb-8",
      )}
    >
      <button
        type="button"
        aria-pressed={penalty === "plus2"}
        className={cn(
          base,
          penalty === "plus2"
            ? "border-timer-hold/50 bg-timer-hold/15 text-timer-hold"
            : "border-border bg-card text-foreground hover:bg-muted",
        )}
        onClick={(e) => {
          e.currentTarget.blur();
          onPlus2();
        }}
      >
        +2
      </button>
      <button
        type="button"
        aria-pressed={penalty === "dnf"}
        className={cn(
          base,
          penalty === "dnf"
            ? "border-timer-hold/50 bg-timer-hold/15 text-timer-hold"
            : "border-border bg-card text-foreground hover:bg-muted",
        )}
        onClick={(e) => {
          e.currentTarget.blur();
          onDnf();
        }}
      >
        DNF
      </button>
      <button
        type="button"
        aria-label="Delete solve"
        className={cn(
          base,
          "flex items-center justify-center gap-2 border-border bg-card text-destructive hover:bg-destructive/10",
        )}
        onClick={(e) => {
          e.currentTarget.blur();
          onDelete();
        }}
      >
        <Trash2 className="size-5" />
        <span className="hidden sm:inline">Delete</span>
      </button>
    </div>
  );
}
