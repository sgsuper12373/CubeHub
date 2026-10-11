"use client";

import { Check, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { TimerModes } from "@/components/timer/timer-modes";
import { isTimerEvent, TIMER_EVENTS } from "@/lib/timer/events";
import type { Session, TimerPuzzle } from "@/lib/timer/types";

const SELECT_CLASS =
  "h-7 rounded-lg border border-border bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

/**
 * Event + session controls. Inputs and the <select> are covered by the
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
  onDelete,
  onPuzzleChange,
  isAuthed,
}: {
  sessions: Session[];
  activeId: string | null;
  puzzle: TimerPuzzle;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onReset: () => void;
  onDelete: (id: string) => void;
  onPuzzleChange: (p: TimerPuzzle) => void;
  isAuthed: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const active = sessions.find((s) => s.id === activeId);

  const commitRename = () => {
    if (draft !== null && activeId && draft.trim()) onRename(activeId, draft);
    setDraft(null);
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 px-4">
      <select
        aria-label="Event"
        className={`${SELECT_CLASS} font-medium`}
        value={puzzle}
        onChange={(e) => {
          if (isTimerEvent(e.target.value)) onPuzzleChange(e.target.value);
        }}
      >
        {TIMER_EVENTS.map((ev) => (
          <option key={ev.id} value={ev.id}>
            {ev.label}
          </option>
        ))}
      </select>

      <TimerModes isAuthed={isAuthed} />

      {draft === null ? (
        <select
          aria-label="Session"
          className={`${SELECT_CLASS} max-w-40`}
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
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label="Delete session"
        disabled={!active || sessions.length <= 1}
        onClick={() => { if (activeId) onDelete(activeId); }}
      >
        <Trash2 />
      </Button>
    </div>
  );
}
