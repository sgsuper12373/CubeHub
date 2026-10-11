"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { checkCustomScramble, MAX_SCRAMBLE_LENGTH } from "@/lib/timer/custom-scramble";
import { eventLabel } from "@/lib/timer/events";
import type { TimerPuzzle } from "@/lib/timer/types";
import { useOverlayLock } from "@/stores/overlay-store";

/**
 * Paste your own scramble, e.g. to race a friend on the same one. Same
 * hand-rolled modal shape as <ShortcutsOverlay/>; mounted only while open, so
 * the overlay lock (which keeps Space away from the timer) spans its lifetime.
 */
export function CustomScrambleDialog({
  puzzle,
  onUse,
  onClose,
}: {
  puzzle: TimerPuzzle;
  onUse: (scramble: string) => void;
  onClose: () => void;
}) {
  useOverlayLock(true);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async () => {
    setChecking(true);
    const result = await checkCustomScramble(text);
    setChecking(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onUse(result.scramble);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-scramble-title"
        className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="custom-scramble-title" className="text-base font-semibold">
            Enter a {eventLabel(puzzle)} scramble
          </h2>
          <Button variant="ghost" size="icon-xs" aria-label="Close" onClick={onClose}>
            <X />
          </Button>
        </div>

        <label htmlFor="custom-scramble" className="sr-only">
          Scramble
        </label>
        <textarea
          id="custom-scramble"
          ref={inputRef}
          rows={4}
          maxLength={MAX_SCRAMBLE_LENGTH + 100}
          spellCheck={false}
          autoCapitalize="none"
          autoComplete="off"
          value={text}
          aria-invalid={error !== null}
          aria-describedby="custom-scramble-help"
          placeholder="R U R' U' F2 …"
          onChange={(e) => {
            setText(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            // Enter uses it; Shift+Enter keeps a line break (Megaminx).
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          className="mt-4 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50 aria-invalid:border-destructive"
        />
        <p
          id="custom-scramble-help"
          className={error ? "mt-1.5 text-xs text-destructive" : "mt-1.5 text-xs text-muted-foreground"}
        >
          {error ?? "Saved with your solve as a custom scramble. The next one is random again."}
        </p>

        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={checking || !text.trim()}>
            Use scramble
          </Button>
        </div>
      </form>
    </div>
  );
}
