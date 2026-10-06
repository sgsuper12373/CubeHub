"use client";

import { Check, Copy, Keyboard, PartyPopper, Redo2, RotateCcw, Shuffle, Undo2 } from "lucide-react";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { KPuzzle } from "cubing/kpuzzle";

import { MovePad } from "@/components/playground/move-pad";
import { PlaygroundCube } from "@/components/playground/playground-cube";
import { Button } from "@/components/ui/button";
import { initialPlaygroundState, moveCount, playgroundReducer } from "@/lib/playground/history";
import { keymapRows, moveForKey } from "@/lib/playground/keymap";
import { PLAYGROUND_PUZZLES, type PlaygroundPuzzle } from "@/lib/playground/puzzles";
import { isSolvedWith, isValidMoveWith, loadKPuzzle } from "@/lib/playground/solved";
import { generateScramble } from "@/lib/timer/scrambler";
import { cn } from "@/lib/utils";
import { isOverlayOpen } from "@/stores/overlay-store";

/** Input types where keys are not text entry. */
const NON_TEXT_INPUTS: ReadonlySet<string> = new Set(["checkbox", "radio", "button", "range"]);

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLInputElement) return !NON_TEXT_INPUTS.has(target.type);
  return target.isContentEditable || target.tagName === "TEXTAREA" || target.tagName === "SELECT";
}

/**
 * The virtual puzzle sandbox. Nothing here is saved: no store, no Supabase, no
 * localStorage. It deliberately shares nothing with the timer's stores, so
 * nothing done here can ever reach a real session (see docs/architecture.md).
 */
export function PlaygroundScreen({ initialPuzzle }: { initialPuzzle: PlaygroundPuzzle }) {
  const [state, dispatch] = useReducer(playgroundReducer, initialPuzzle, initialPlaygroundState);
  const { puzzle, scramble, moves, redo, revision } = state;
  const [visualization, setVisualization] = useState<"3D" | "2D">("3D");
  const [generating, setGenerating] = useState(false);
  const [kpuzzle, setKpuzzle] = useState<{ puzzle: PlaygroundPuzzle; model: KPuzzle } | null>(null);
  const [copied, setCopied] = useState(false);
  const puzzleRef = useRef(puzzle);

  useEffect(() => {
    puzzleRef.current = puzzle;
    let cancelled = false;
    loadKPuzzle(puzzle)
      .then((model) => !cancelled && setKpuzzle({ puzzle, model }))
      .catch((err: unknown) => console.error("playground: puzzle model failed to load", err));
    return () => {
      cancelled = true;
    };
  }, [puzzle]);

  const model = kpuzzle?.puzzle === puzzle ? kpuzzle.model : null;

  const onMove = useCallback(
    (move: string) => {
      // Until the model loads, only the key map and the pad can produce moves,
      // and both only produce legal ones for the current puzzle.
      if (model && !isValidMoveWith(model, move)) return;
      dispatch({ type: "move", move });
    },
    [model],
  );

  const onScramble = useCallback(async () => {
    const forPuzzle = puzzleRef.current;
    setGenerating(true);
    try {
      const alg = await generateScramble(forPuzzle);
      if (puzzleRef.current === forPuzzle) dispatch({ type: "scramble", scramble: alg });
    } catch (err) {
      console.error("playground: scramble failed", err);
    } finally {
      setGenerating(false);
    }
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isOverlayOpen() || isEditableTarget(e.target)) return;
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        if (key === "z" && !e.shiftKey) {
          e.preventDefault();
          dispatch({ type: "undo" });
        } else if ((key === "z" && e.shiftKey) || key === "y") {
          e.preventDefault();
          dispatch({ type: "redo" });
        }
        return;
      }
      // Holding a key should not spin a face round and round.
      if (e.altKey || e.repeat) return;
      const move = moveForKey(e.code, puzzleRef.current);
      if (!move) return;
      e.preventDefault();
      onMove(move);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onMove]);

  const solved = model ? isSolvedWith(model, scramble, moves) : !scramble && moves.length === 0;
  const justSolved = Boolean(scramble) && moves.length > 0 && solved;
  const count = moveCount(moves);
  const history = moves.join(" ");

  async function copyHistory() {
    try {
      await navigator.clipboard.writeText(history);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be refused (insecure origin, permissions); nothing to do.
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 md:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Playground</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A virtual cube to turn, scramble and solve. Nothing here is saved.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Segmented
            label="Puzzle"
            value={puzzle}
            options={PLAYGROUND_PUZZLES.map((p) => ({ value: p.id, label: p.label }))}
            onChange={(p) => dispatch({ type: "puzzle", puzzle: p })}
          />
          <Segmented
            label="View"
            value={visualization}
            options={[
              { value: "3D", label: "3D" },
              { value: "2D", label: "2D" },
            ]}
            onChange={setVisualization}
          />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <section className="flex flex-col items-center gap-4">
          <div className="flex min-h-8 items-center" aria-live="polite">
            {justSolved ? (
              <p className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                <PartyPopper className="size-4" /> Solved in {count} {count === 1 ? "move" : "moves"}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground tabular-nums">
                {scramble ? "Scrambled" : solved ? "Solved" : "Free play"} · {count}{" "}
                {count === 1 ? "move" : "moves"}
              </p>
            )}
          </div>

          <PlaygroundCube
            puzzle={puzzle}
            visualization={visualization}
            scramble={scramble}
            moves={moves}
            revision={revision}
            onMove={onMove}
          />

          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button type="button" onClick={onScramble} disabled={generating}>
              <Shuffle /> {generating ? "Scrambling…" : "Scramble"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => dispatch({ type: "undo" })}
              disabled={moves.length === 0}
              aria-label="Undo"
            >
              <Undo2 /> <span className="hidden sm:inline">Undo</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => dispatch({ type: "redo" })}
              disabled={redo.length === 0}
              aria-label="Redo"
            >
              <Redo2 /> <span className="hidden sm:inline">Redo</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => dispatch({ type: "reset" })}
              disabled={!scramble && moves.length === 0}
            >
              <RotateCcw /> Reset
            </Button>
          </div>

          <MovePad puzzle={puzzle} onMove={onMove} />
        </section>

        <aside className="flex flex-col gap-4">
          <Panel title="Scramble">
            <p className="font-mono text-sm break-words" aria-label={scramble ? `Scramble: ${scramble}` : undefined}>
              {scramble || <span className="text-muted-foreground">None yet. Press Scramble.</span>}
            </p>
          </Panel>

          <Panel
            title="Your moves"
            action={
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={copyHistory}
                disabled={moves.length === 0}
                aria-label="Copy moves"
              >
                {copied ? <Check /> : <Copy />}
              </Button>
            }
          >
            <p className="max-h-40 overflow-y-auto font-mono text-sm break-words" data-testid="playground-history">
              {history || <span className="text-muted-foreground">Turn the cube to start.</span>}
            </p>
          </Panel>

          <Panel title="Controls" className="hidden md:flex">
            <p className="text-xs text-muted-foreground">
              Drag to look around. Click a face to turn it (right-click turns it the other way).
              <span className="mt-1 flex items-center gap-1">
                <Keyboard className="size-3.5" /> Ctrl+Z undo, Ctrl+Y redo.
              </span>
            </p>
            <KeyTable puzzle={puzzle} />
          </Panel>
        </aside>
      </div>
    </div>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-lg border border-border p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md px-2.5 py-1 text-sm font-medium transition-colors",
            o.value === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Panel({
  title,
  action,
  className,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("flex flex-col gap-2 rounded-xl border border-border bg-card p-4", className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function KeyTable({ puzzle }: { puzzle: PlaygroundPuzzle }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs">
      {keymapRows(puzzle).map(({ move, keys }) => (
        <div key={move} className="flex justify-between gap-2">
          <dt>{move}</dt>
          <dd className="text-muted-foreground">{keys.join(" / ")}</dd>
        </div>
      ))}
    </dl>
  );
}
