"use client";

import {
  Check,
  Copy,
  Keyboard,
  Link2,
  PartyPopper,
  Redo2,
  RotateCcw,
  Shuffle,
  Timer,
  Undo2,
} from "lucide-react";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { Alg } from "cubing/alg";
import type { KPuzzle } from "cubing/kpuzzle";

import { AlgPanel } from "@/components/playground/alg-panel";
import { KeysOverlay } from "@/components/playground/keys-overlay";
import { MovePad } from "@/components/playground/move-pad";
import { PlaygroundCube } from "@/components/playground/playground-cube";
import { PracticeTimer } from "@/components/playground/practice-timer";
import { Button } from "@/components/ui/button";
import { loadAlg } from "@/lib/cubing/runtime";
import { caseSetupFor, parseAlgWith, simplifyWith } from "@/lib/playground/alg-input";
import {
  initialPlaygroundState,
  moveCount,
  playgroundReducer,
  type PlaygroundAction,
} from "@/lib/playground/history";
import { DEFAULT_BINDINGS, moveForKey, sameBindings, type KeyBindings } from "@/lib/playground/keymap";
import { armPractice, currentPractice, IDLE, practiceAfterTurn, type PracticePhase } from "@/lib/playground/practice";
import { ANIMATION_SPEEDS, updatePrefs, usePlaygroundPrefs } from "@/lib/playground/prefs";
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

/** What a link asked the playground to start from (raw strings; parsed here). */
export interface PlaygroundLink {
  caseAlg?: string;
  setup?: string;
  moves?: string;
}

/** What a link turns into: the cube to start from, or why its alg was dropped. */
function linkAction(
  l: PlaygroundLink,
  model: KPuzzle,
  AlgClass: typeof Alg,
): { action?: PlaygroundAction; error?: string } {
  if (l.caseAlg) {
    const parsed = parseAlgWith(AlgClass, model, l.caseAlg);
    if (!parsed.ok) return { error: parsed.error };
    return { action: { type: "case", setup: caseSetupFor(AlgClass, parsed.moves), caseMoves: parsed.moves } };
  }
  const setup = l.setup ? parseAlgWith(AlgClass, model, l.setup) : null;
  const extra = l.moves ? parseAlgWith(AlgClass, model, l.moves) : null;
  const setupMoves = setup?.ok ? setup.moves : [];
  const playMoves = extra?.ok ? extra.moves : [];
  if (!setupMoves.length && !playMoves.length) return {};
  return { action: { type: "load", setup: setupMoves.join(" "), moves: playMoves } };
}

/** Pause between setting up a case and playing its alg, so the case is seen first. */
const SHOW_ME_DELAY_MS = 500;

/**
 * The virtual puzzle sandbox. No solve is saved: no store, no Supabase. Only
 * the settings (key layout, speed…) are kept in localStorage. It deliberately
 * shares nothing with the timer's stores, so nothing done here can ever reach
 * a real session (see docs/architecture.md).
 */
export function PlaygroundScreen({
  initialPuzzle,
  link = {},
}: {
  initialPuzzle: PlaygroundPuzzle;
  link?: PlaygroundLink;
}) {
  const [state, dispatch] = useReducer(playgroundReducer, initialPuzzle, initialPlaygroundState);
  const { puzzle, scramble, setupKind, caseMoves, moves, redo, revision } = state;
  const prefs = usePlaygroundPrefs();
  const [visualization, setVisualization] = useState<"3D" | "2D">("3D");
  const [generating, setGenerating] = useState(false);
  const [loaded, setLoaded] = useState<{ puzzle: PlaygroundPuzzle; model: KPuzzle; Alg: typeof Alg } | null>(null);
  const [copied, setCopied] = useState<"moves" | "link" | null>(null);
  const [algText, setAlgText] = useState(link.caseAlg ?? "");
  const [algError, setAlgError] = useState<string | null>(null);
  const [keysOpen, setKeysOpen] = useState(false);
  const [practiceOn, setPracticeOn] = useState(false);
  const [practiceState, setPractice] = useState<PracticePhase>(IDLE);
  const [replayToken, setReplayToken] = useState(0);
  const puzzleRef = useRef(puzzle);
  const linkRef = useRef<PlaygroundLink | null>(link);
  const showMeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    puzzleRef.current = puzzle;
    let cancelled = false;
    Promise.all([loadKPuzzle(puzzle), loadAlg()])
      .then(([model, { Alg }]) => {
        if (cancelled) return;
        setLoaded({ puzzle, model, Alg });
        // A link applies once, to the puzzle it opened with.
        const pending = linkRef.current;
        linkRef.current = null;
        const result = pending ? linkAction(pending, model, Alg) : null;
        if (result?.action) dispatch(result.action);
        if (result?.error) setAlgError(result.error);
      })
      .catch((err: unknown) => console.error("playground: puzzle model failed to load", err));
    return () => {
      cancelled = true;
    };
  }, [puzzle]);

  useEffect(() => () => clearTimeout(showMeTimer.current ?? undefined), []);

  const ready = loaded?.puzzle === puzzle ? loaded : null;
  const model = ready?.model ?? null;
  const practice = currentPractice(practiceState, scramble);

  const solvedWith = useCallback(
    (moveList: readonly string[]) =>
      model ? isSolvedWith(model, scramble, moveList) : !scramble && moveList.length === 0,
    [model, scramble],
  );

  /** Every single turn, from keys, the pad or a click on the cube. */
  const onMove = useCallback(
    (move: string) => {
      // Until the model loads, only the key map and the pad can produce moves,
      // and both only produce legal ones for the current puzzle.
      if (model && !isValidMoveWith(model, move)) return;
      const t = performance.now();
      if (practice.kind !== "idle") {
        const after = [...moves, move];
        setPractice(practiceAfterTurn(practice, move, t, after, solvedWith(after)));
      }
      dispatch({ type: "move", move, t });
    },
    [model, moves, practice, solvedWith],
  );

  const onScramble = useCallback(async () => {
    const forPuzzle = puzzleRef.current;
    setGenerating(true);
    try {
      const alg = await generateScramble(forPuzzle);
      if (puzzleRef.current !== forPuzzle) return;
      dispatch({ type: "scramble", scramble: alg });
      setPractice(practiceOn ? armPractice(alg, prefs.inspection, performance.now()) : IDLE);
    } catch (err) {
      console.error("playground: scramble failed", err);
    } finally {
      setGenerating(false);
    }
  }, [practiceOn, prefs.inspection]);

  function togglePractice() {
    const on = !practiceOn;
    setPracticeOn(on);
    // Turning it on with a fresh scramble on the cube times that scramble.
    if (on && setupKind === "scramble" && moves.length === 0) {
      setPractice(armPractice(scramble, prefs.inspection, performance.now()));
    } else {
      setPractice(IDLE);
    }
  }

  /** Parse the alg box, or show why not. */
  function parsedAlg(): string[] | null {
    if (!ready) return null;
    const parsed = parseAlgWith(ready.Alg, ready.model, algText);
    if (!parsed.ok) {
      setAlgError(parsed.error);
      return null;
    }
    setAlgError(null);
    return parsed.moves;
  }

  function setUpCase(): string[] | null {
    const parsed = parsedAlg();
    if (!parsed || !ready) return null;
    clearTimeout(showMeTimer.current ?? undefined);
    setPractice(IDLE);
    dispatch({ type: "case", setup: caseSetupFor(ready.Alg, parsed), caseMoves: parsed });
    return parsed;
  }

  function showMe() {
    const parsed = setUpCase();
    if (!parsed) return;
    // Let the cube redraw on the case first, so the alg then animates on it.
    showMeTimer.current = setTimeout(() => dispatch({ type: "moves", moves: parsed }), SHOW_ME_DELAY_MS);
  }

  function applyAlg() {
    const parsed = parsedAlg();
    if (!parsed) return;
    setPractice(IDLE);
    dispatch({ type: "moves", moves: parsed });
  }

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
          dispatch({ type: "redo", t: performance.now() });
        }
        return;
      }
      if (e.key === "?") {
        e.preventDefault();
        setKeysOpen(true);
        return;
      }
      // Holding a key should not spin a face round and round.
      if (e.altKey || e.repeat) return;
      const move = moveForKey(e, puzzleRef.current, prefs.keyBindings);
      if (!move) return;
      e.preventDefault();
      onMove(move);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onMove, prefs.keyBindings]);

  const onBindingsChange = useCallback((keyBindings: KeyBindings) => updatePrefs({ keyBindings }), []);
  const swipeHintDismissed = prefs.swipeHintDismissed;
  const dismissSwipeHint = useCallback(() => {
    if (!swipeHintDismissed) updatePrefs({ swipeHintDismissed: true });
  }, [swipeHintDismissed]);
  const swipeOn = prefs.swipeToTurn && visualization === "3D";
  const closeKeys = useCallback(() => setKeysOpen(false), []);

  const solved = solvedWith(moves);
  const justSolved = Boolean(scramble) && moves.length > 0 && solved;
  const count = moveCount(moves);
  const history = moves.join(" ");
  const simplified = ready && moves.length > 1 ? simplifyWith(ready.Alg, moves) : "";
  const algCount = moveCount(caseMoves);

  function flashCopied(what: "moves" | "link") {
    setCopied(what);
    setTimeout(() => setCopied(null), 1500);
  }

  async function copyText(text: string, what: "moves" | "link") {
    try {
      await navigator.clipboard.writeText(text);
      flashCopied(what);
    } catch {
      // Clipboard can be refused (insecure origin, permissions); nothing to do.
    }
  }

  function shareUrl(): string {
    const params = new URLSearchParams({ puzzle });
    if (setupKind === "case") params.set("case", caseMoves.join(" "));
    else if (scramble) params.set("setup", scramble);
    if (moves.length) params.set("moves", history);
    return `${window.location.origin}/playground?${params}`;
  }

  const startLabel =
    setupKind === "case" ? "Case setup" : setupKind === "link" ? "Start position" : "Scramble";

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 md:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Playground</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A virtual cube to turn, scramble, solve and try algorithms on. Solves here are never saved.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Segmented
            label="Puzzle"
            value={puzzle}
            options={PLAYGROUND_PUZZLES.map((p) => ({ value: p.id, label: p.label }))}
            onChange={(p) => {
              setPractice(IDLE);
              dispatch({ type: "puzzle", puzzle: p });
            }}
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
        <section className="flex min-w-0 flex-col items-center gap-4">
          <div className="flex min-h-8 items-center" aria-live="polite">
            {justSolved ? (
              <p className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                <PartyPopper className="size-4" /> Solved in {count} {count === 1 ? "move" : "moves"}
                {setupKind === "case" && algCount > 0 && (
                  <span className="font-normal text-primary/80">(the alg is {algCount})</span>
                )}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground tabular-nums">
                {statusLabel(setupKind, solved)} · {count} {count === 1 ? "move" : "moves"}
              </p>
            )}
          </div>

          <PracticeTimer phase={practice} onReplay={() => setReplayToken((n) => n + 1)} />

          <PlaygroundCube
            puzzle={puzzle}
            visualization={visualization}
            scramble={scramble}
            moves={moves}
            revision={revision}
            tempoScale={prefs.animationSpeed}
            hintStickers={prefs.hintStickers}
            replayToken={replayToken}
            swipe={prefs.swipeToTurn}
            dragOffCube={prefs.dragOffCube}
            showSwipeHint={!swipeHintDismissed}
            onDismissSwipeHint={dismissSwipeHint}
            onMove={onMove}
          />

          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button type="button" onClick={onScramble} disabled={generating}>
              <Shuffle /> {generating ? "Scrambling…" : "Scramble"}
            </Button>
            <Button
              type="button"
              variant={practiceOn ? "secondary" : "outline"}
              onClick={togglePractice}
              aria-pressed={practiceOn}
              title="Time your solves: the clock starts on your first turn after a scramble"
            >
              <Timer /> Practice
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
              onClick={() => dispatch({ type: "redo", t: performance.now() })}
              disabled={redo.length === 0}
              aria-label="Redo"
            >
              <Redo2 /> <span className="hidden sm:inline">Redo</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setPractice(IDLE);
                dispatch({ type: "reset" });
              }}
              disabled={!scramble && moves.length === 0}
            >
              <RotateCcw /> Reset
            </Button>
          </div>

          <MovePad puzzle={puzzle} onMove={onMove} />
        </section>

        <aside className="flex min-w-0 flex-col gap-4">
          <Panel title="Try an algorithm">
            <AlgPanel
              value={algText}
              onChange={(v) => {
                setAlgText(v);
                setAlgError(null);
              }}
              error={algError}
              disabled={!ready}
              onSetupCase={setUpCase}
              onShowMe={showMe}
              onApply={applyAlg}
            />
          </Panel>

          <Panel title={startLabel}>
            <p
              className="font-mono text-sm break-words"
              aria-label={setupKind === "scramble" ? `Scramble: ${scramble}` : undefined}
            >
              {scramble || <span className="text-muted-foreground">None yet. Press Scramble.</span>}
            </p>
          </Panel>

          <Panel
            title="Your moves"
            action={
              <div className="flex gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => copyText(shareUrl(), "link")}
                  disabled={!scramble && moves.length === 0}
                  aria-label="Copy link to this cube"
                  title="Copy a link to this cube"
                >
                  {copied === "link" ? <Check /> : <Link2 />}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => copyText(history, "moves")}
                  disabled={moves.length === 0}
                  aria-label="Copy moves"
                  title="Copy moves"
                >
                  {copied === "moves" ? <Check /> : <Copy />}
                </Button>
              </div>
            }
          >
            <p className="max-h-40 overflow-y-auto font-mono text-sm break-words" data-testid="playground-history">
              {history || <span className="text-muted-foreground">Turn the cube to start.</span>}
            </p>
            {simplified && simplified !== history && (
              <p className="text-xs text-muted-foreground">
                Simplified: <span className="font-mono">{simplified}</span>
              </p>
            )}
          </Panel>

          <Panel title="Controls" className="hidden md:flex">
            <p className="text-xs text-muted-foreground">
              {sameBindings(prefs.keyBindings, DEFAULT_BINDINGS)
                ? "Press R to turn R. Hold Shift for R'."
                : "Using your custom keys."}{" "}
              {swipeOn
                ? prefs.dragOffCube === "rotate"
                  ? "Swipe a row to turn it; drag off the cube to rotate it."
                  : "Swipe a row to turn it; drag off the cube to look around."
                : "Drag to look around; click a face to turn it."}
            </p>
            <Button type="button" variant="outline" size="sm" onClick={() => setKeysOpen(true)}>
              <Keyboard /> Keys &amp; custom mapping{" "}
              <kbd className="font-mono text-[0.7rem] text-muted-foreground">?</kbd>
            </Button>
          </Panel>

          <Panel title="Settings">
            <label className="flex items-center justify-between gap-3 text-sm">
              Turn speed
              <input
                type="range"
                min={0}
                max={ANIMATION_SPEEDS.length - 1}
                step={1}
                value={Math.max(0, ANIMATION_SPEEDS.indexOf(prefs.animationSpeed as (typeof ANIMATION_SPEEDS)[number]))}
                onChange={(e) => updatePrefs({ animationSpeed: ANIMATION_SPEEDS[Number(e.target.value)] })}
                className="w-28 accent-primary"
              />
            </label>
            <Toggle
              label="Show hidden faces"
              checked={prefs.hintStickers}
              onChange={(hintStickers) => updatePrefs({ hintStickers })}
            />
            <Toggle
              label="15s inspection in practice"
              checked={prefs.inspection}
              onChange={(inspection) => updatePrefs({ inspection })}
            />
            <Toggle
              label="Swipe to turn"
              checked={prefs.swipeToTurn}
              onChange={(swipeToTurn) => updatePrefs({ swipeToTurn })}
            />
            {prefs.swipeToTurn && (
              <Toggle
                label="Drag off the cube rotates it"
                checked={prefs.dragOffCube === "rotate"}
                onChange={(rotate) => updatePrefs({ dragOffCube: rotate ? "rotate" : "orbit" })}
              />
            )}
          </Panel>
        </aside>
      </div>

      <KeysOverlay
        open={keysOpen}
        onClose={closeKeys}
        puzzle={puzzle}
        bindings={prefs.keyBindings}
        onChange={onBindingsChange}
      />
    </div>
  );
}

function statusLabel(kind: string, solved: boolean): string {
  if (kind === "scramble") return "Scrambled";
  if (kind === "case") return "Case set up: solve it";
  if (kind === "link") return "Shared cube";
  return solved ? "Solved" : "Free play";
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

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      {label}
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-primary"
      />
    </label>
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
