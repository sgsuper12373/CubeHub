"use client";

import { Pencil, Plus, RotateCcw, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  bindKey,
  chordLabel,
  chordOf,
  chordProblem,
  DEFAULT_BINDINGS,
  keymapRows,
  sameBindings,
  unbindKey,
  type KeyBindings,
} from "@/lib/playground/keymap";
import type { PlaygroundPuzzle } from "@/lib/playground/puzzles";
import { cn } from "@/lib/utils";
import { useOverlayLock } from "@/stores/overlay-store";

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["Ctrl", "Z"], label: "Undo" },
  { keys: ["Ctrl", "Y"], label: "Redo" },
  { keys: ["?"], label: "Show this list" },
];

const MODIFIER_CODES = new Set(["ShiftLeft", "ShiftRight", "ControlLeft", "ControlRight", "AltLeft", "AltRight", "MetaLeft", "MetaRight"]);

/**
 * The key list, and where keys are rebound. Same hand-rolled modal shape as
 * the timer's <ShortcutsOverlay/>; the overlay lock pauses the playground's
 * key handler while it is open, so pressing a key here to bind it turns
 * nothing on the cube.
 *
 * Binding: "+" on a move, then press a key (Shift is allowed). A key does one
 * move, so binding it moves it off whatever it did before, and the note says
 * so.
 */
export function KeysOverlay({
  open,
  onClose,
  puzzle,
  bindings,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  puzzle: PlaygroundPuzzle;
  bindings: KeyBindings;
  onChange: (bindings: KeyBindings) => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [editing, setEditing] = useState(false);
  const [listening, setListening] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  useOverlayLock(open);

  const close = useCallback(() => {
    setEditing(false);
    setListening(null);
    setNote(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (listening) {
        // Wait for the real key when only a modifier is down.
        if (MODIFIER_CODES.has(e.code)) return;
        e.preventDefault();
        e.stopPropagation();
        if (e.code === "Escape") {
          setListening(null);
          return;
        }
        if (e.ctrlKey || e.metaKey || e.altKey) {
          setNote("Ctrl, Alt and ⌘ combinations can't be used.");
          return;
        }
        const press = { code: e.code, shiftKey: e.shiftKey };
        const problem = chordProblem(press);
        if (problem) {
          setNote(problem);
          return;
        }
        const chord = chordOf(press);
        const before = bindings[chord];
        onChange(bindKey(bindings, chord, listening));
        setNote(before && before !== listening ? `${chordLabel(chord)} did ${before}; it now does ${listening}.` : null);
        setListening(null);
        return;
      }
      if (e.key === "Escape" || e.key === "?") {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, listening, bindings, onChange, close]);

  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const isDefault = sameBindings(bindings, DEFAULT_BINDINGS);
  const rows = keymapRows(puzzle, bindings).filter((r) => editing || r.keys.length > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm animate-in fade-in"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="playground-keys-title"
        className={cn(
          "flex max-h-[90vh] w-full flex-col rounded-2xl border border-border bg-card shadow-xl animate-in fade-in zoom-in-95 duration-200",
          editing ? "max-w-3xl" : "max-w-xl",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 p-5 pb-3">
          <div>
            <h2 id="playground-keys-title" className="text-base font-semibold">
              {editing ? "Edit keys" : "Keyboard controls"}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {editing
                ? "Press + on a move, then the key (Shift allowed). × removes a key. Saved on this device."
                : isDefault
                  ? "Press a move's letter to turn it. Hold Shift for the prime (anticlockwise) turn."
                  : "Your custom keys."}
            </p>
          </div>
          <Button ref={closeRef} variant="ghost" size="icon-xs" aria-label="Close key list" onClick={close}>
            <X />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5">
          {note && (
            <p role="status" className="mb-3 rounded-md bg-muted px-2.5 py-1.5 text-xs text-foreground">
              {note}
            </p>
          )}
          {rows.length === 0 && (
            <p className="py-4 text-sm text-muted-foreground">No keys are bound. Edit keys to add some.</p>
          )}
          {/* Moves come family by family (R R' R2), so three columns make a row per family. */}
          <dl className={cn("grid gap-x-6 gap-y-1.5 font-mono text-xs", editing ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
            {rows.map(({ move, keys }) => (
              <div key={move} className="flex min-h-7 items-center justify-between gap-2">
                <dt>{move}</dt>
                <dd className="flex flex-wrap justify-end gap-1">
                  {keys.map((chord) => (
                    <Kbd key={chord}>
                      {chordLabel(chord)}
                      {editing && (
                        <button
                          type="button"
                          className="ml-1 text-muted-foreground hover:text-destructive"
                          aria-label={`Remove ${chordLabel(chord)} from ${move}`}
                          onClick={() => {
                            onChange(unbindKey(bindings, chord));
                            setNote(null);
                          }}
                        >
                          ×
                        </button>
                      )}
                    </Kbd>
                  ))}
                  {editing && (
                    <Button
                      type="button"
                      size="xs"
                      variant={listening === move ? "default" : "outline"}
                      aria-label={`Add a key for ${move}`}
                      onClick={() => {
                        setListening(listening === move ? null : move);
                        setNote(null);
                      }}
                      className={cn(listening === move && "animate-pulse")}
                    >
                      {listening === move ? "Press a key…" : <Plus />}
                    </Button>
                  )}
                </dd>
              </div>
            ))}
          </dl>

          {!editing && (
            <dl className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
              {SHORTCUTS.map((s) => (
                <div key={s.label} className="flex items-baseline gap-3">
                  <dt className="flex shrink-0 gap-1">
                    {s.keys.map((k) => (
                      <Kbd key={k}>{k}</Kbd>
                    ))}
                  </dt>
                  <dd className="text-xs text-muted-foreground">{s.label}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border p-4">
          {!isDefault && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                onChange(DEFAULT_BINDINGS);
                setNote("Keys reset to the defaults.");
              }}
            >
              <RotateCcw /> Reset to default
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant={editing ? "default" : "outline"}
            onClick={() => {
              setEditing(!editing);
              setListening(null);
              setNote(null);
            }}
          >
            {editing ? "Done" : (
              <>
                <Pencil /> Edit keys
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.7rem] font-medium text-foreground">
      {children}
    </kbd>
  );
}
