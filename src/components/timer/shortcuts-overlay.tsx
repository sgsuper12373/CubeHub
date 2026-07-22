"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { useOverlayLock } from "@/stores/overlay-store";

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["Space"], label: "Hold, then release to start · press to stop" },
  { keys: ["Any key"], label: "Panic stop while running" },
  { keys: ["Esc"], label: "Cancel the current attempt" },
  { keys: ["D"], label: "Delete the last solve" },
  { keys: ["1"], label: "Toggle +2 on the last solve" },
  { keys: ["2"], label: "Toggle DNF on the last solve" },
  { keys: ["?"], label: "Show this list" },
];

/**
 * The keyboard reference. Follows the hand-rolled modal shape used by
 * <SolveDetailModal/> rather than introducing a dialog primitive — the repo
 * has none, and one consistent pattern beats a new dependency.
 *
 * While this is open the caller disables <TouchStage/>, so Space cannot both
 * re-activate the focused close button and start a solve.
 */
export function ShortcutsOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useOverlayLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-xl animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="shortcuts-title" className="text-base font-semibold">
            Keyboard shortcuts
          </h2>
          <Button
            ref={closeRef}
            variant="ghost"
            size="icon-xs"
            aria-label="Close shortcuts"
            onClick={onClose}
          >
            <X />
          </Button>
        </div>

        <dl className="mt-4 flex flex-col gap-2.5">
          {SHORTCUTS.map((s) => (
            <div key={s.keys.join()} className="flex items-baseline gap-3">
              <dt className="flex shrink-0 gap-1">
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.7rem] font-medium text-foreground"
                  >
                    {k}
                  </kbd>
                ))}
              </dt>
              <dd className="text-xs text-muted-foreground">{s.label}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-4 text-[0.7rem] text-muted-foreground">
          Shortcuts other than Space work between solves only.
        </p>
      </div>
    </div>
  );
}
