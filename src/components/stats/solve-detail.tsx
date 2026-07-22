"use client";

import { useState } from "react";

function formatRelative(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}
import { Check, Copy, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScramblePreview } from "@/components/timer/scramble-preview";
import { formatMs } from "@/lib/timer/format";
import type { Penalty, Solve, TimerPuzzle } from "@/lib/timer/types";
import { cn } from "@/lib/utils";
import { useOverlayLock } from "@/stores/overlay-store";

export function SolveDetailModal({
  solve,
  puzzle,
  onClose,
  onPenalty,
  onDelete,
  onNotes,
}: {
  solve: Solve;
  puzzle: TimerPuzzle;
  onClose: () => void;
  onPenalty: (p: Penalty) => void;
  onDelete: () => void;
  onNotes: (notes: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [notes, setLocalNotes] = useState(solve.notes ?? "");
  // Only mounted while open, so the lock spans exactly the modal's lifetime.
  useOverlayLock(true);

  const handleCopy = () => {
    void navigator.clipboard.writeText(solve.scramble);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNotesBlur = () => {
    if (notes !== (solve.notes ?? "")) onNotes(notes);
  };

  const isDnf = solve.penalty === "dnf";
  const displayTime = formatMs(solve.effectiveTimeMs ?? solve.timeMs, 3);
  const date = new Date(solve.createdAt);

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-in fade-in"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-xl border border-border bg-card shadow-lg animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Solve Details
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          {/* Header: Time + Date */}
          <div className="text-center">
            <div className={cn(
              "text-5xl font-bold tracking-tighter font-mono",
              isDnf ? "text-destructive" : solve.penalty === "plus2" ? "text-destructive/80" : "text-foreground"
            )}>
              {isDnf ? "DNF" : displayTime}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatRelative(date)} · {date.toLocaleTimeString()}
            </p>
          </div>

          {/* Penalties */}
          <div className="flex justify-center gap-2">
            <PenaltyButton
              active={solve.penalty === "none"}
              label="OK"
              onClick={() => onPenalty("none")}
            />
            <PenaltyButton
              active={solve.penalty === "plus2"}
              label="+2"
              onClick={() => onPenalty("plus2")}
            />
            <PenaltyButton
              active={solve.penalty === "dnf"}
              label="DNF"
              onClick={() => onPenalty("dnf")}
            />
          </div>

          {/* Scramble */}
          <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Scramble
              </span>
              <button
                onClick={handleCopy}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
                title="Copy scramble"
                aria-label={copied ? "Scramble copied" : "Copy scramble"}
              >
                {copied ? (
                  <Check className="size-3.5 text-timer-ready" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </button>
            </div>
            <p className="font-mono text-sm leading-relaxed text-foreground">
              {solve.scramble}
            </p>
          </div>
          
          <div className="flex justify-center">
             <ScramblePreview alg={solve.scramble} puzzle={puzzle} />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setLocalNotes(e.target.value)}
              onBlur={handleNotesBlur}
              placeholder="Analysis, mistakes, insights..."
              className="w-full rounded-md border border-border bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary min-h-[80px] resize-y"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end pt-2 border-t border-border/50">
            <Button
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                onDelete();
                onClose();
              }}
            >
              <Trash2 className="mr-2 size-4" />
              Delete Solve
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

function PenaltyButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-md px-4 py-1.5 text-sm font-semibold transition-colors border",
        active
          ? "bg-primary text-primary-foreground border-transparent shadow-sm"
          : "bg-background text-muted-foreground border-border hover:bg-muted"
      )}
    >
      {label}
    </button>
  );
}
