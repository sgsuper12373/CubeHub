"use client";

import { Check, Pencil, Plus, RotateCcw } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { Session, TimerPuzzle } from "@/lib/timer/types";
import { cn } from "@/lib/utils";

const PUZZLES: { value: TimerPuzzle; label: string }[] = [
  { value: "333", label: "3×3" },
  { value: "222", label: "2×2" },
];

/**
 * Puzzle + session controls. Inputs and the <select> are covered by the
 * touch stage's editable-target guard, so typing a session name never arms
 * the timer.
 */
export function SessionSwitcher({
  sessions,
  activeId,
  puzzle,
  onSelect,
  onCreate,
  onRename,
  onReset,
  onPuzzleChange,
}: {
  sessions: Session[];
  activeId: string | null;
  puzzle: TimerPuzzle;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onReset: () => void;
  onPuzzleChange: (p: TimerPuzzle) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const active = sessions.find((s) => s.id === activeId);

  const commitRename = () => {
    if (draft !== null && activeId && draft.trim()) onRename(activeId, draft);
    setDraft(null);
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 px-4">
      <div
        role="group"
        aria-label="Puzzle"
        className="flex rounded-lg border border-border p-0.5"
      >
        {PUZZLES.map(({ value, label }) => (
          <Button
            key={value}
            variant="ghost"
            size="xs"
            aria-pressed={puzzle === value}
            className={cn(
              puzzle === value && "bg-muted text-timer-ready",
            )}
            onClick={() => onPuzzleChange(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      {draft === null ? (
        <select
          aria-label="Session"
          className="h-7 max-w-40 rounded-lg border border-border bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          value={activeId ?? ""}
          onChange={(e) => onSelect(e.target.value)}
        >
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      ) : (
        <input
          autoFocus
          aria-label="Session name"
          className="h-7 w-40 rounded-lg border border-border bg-background px-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          value={draft}
          maxLength={60}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") setDraft(null);
          }}
        />
      )}

      {draft === null ? (
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Rename session"
          disabled={!active}
          onClick={() => setDraft(active?.name ?? "")}
        >
          <Pencil />
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Save session name"
          onClick={commitRename}
        >
          <Check />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label="New session"
        onClick={() => onCreate(`Session ${sessions.length + 1}`)}
      >
        <Plus />
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label="Reset session"
        disabled={!active}
        onClick={onReset}
      >
        <RotateCcw />
      </Button>
    </div>
  );
}
