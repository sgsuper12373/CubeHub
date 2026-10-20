"use client";

import {
  Check,
  Copy,
  Keyboard,
  Link2,
  PartyPopper,
  Redo2,
  RotateCcw,
  Settings2,
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

/** Controls where Enter already does something: pressing them. */
function isPressableTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest("button, a, summary, [role=button], [role=tab], [role=radio]") !== null;
}

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
  const { puzzle, scramble, setupKind, caseMoves, moves, redo, revision, revealing } = state;
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
  /** Which scramble move is being turned on while `revealing`. */
  const [revealStep, setRevealStep] = useState(-1);
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
      // The scramble is still going on; the reducer would drop the turn too.
      if (revealing) return;
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
    [model, moves, practice, solvedWith, revealing],
  );

  const onScramble = useCallback(async () => {
    const forPuzzle = puzzleRef.current;
    setGenerating(true);
    try {
      const alg = await generateScramble(forPuzzle);
      if (puzzleRef.current !== forPuzzle) return;
      const animate = prefs.animateScramble && !matchMedia("(prefers-reduced-motion: reduce)").matches;
      setRevealStep(-1);
      dispatch({ type: "scramble", scramble: alg, animate });
      // An animated scramble arms practice when it has finished (onRevealed),
      // so inspection doesn't tick away while it plays.
      setPractice(practiceOn && !animate ? armPractice(alg, prefs.inspection, performance.now()) : IDLE);
    } catch (err) {
      console.error("playground: scramble failed", err);
    } finally {
      setGenerating(false);
    }
  }, [practiceOn, prefs.inspection, prefs.animateScramble]);

  const onRevealed = useCallback(() => {
    dispatch({ type: "revealed" });
    setRevealStep(-1);
    if (practiceOn && scramble) setPractice(armPractice(scramble, prefs.inspection, performance.now()));
  }, [practiceOn, scramble, prefs.inspection]);

  function togglePractice() {
    const on = !practiceOn;
    setPracticeOn(on);
    // Turning it on with a fresh scramble on the cube times that scramble.
    if (on && !revealing && setupKind === "scramble" && moves.length === 0) {
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
      // Enter scrambles. It can't be bound to a move, so it never clashes.
      if (e.key === "Enter" && !e.altKey && !e.shiftKey) {
        if (e.repeat || isPressableTarget(e.target)) return;
        e.preventDefault();
        if (!generating && !revealing) void onScramble();
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
  }, [onMove, onScramble, generating, revealing, prefs.keyBindings]);

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
    // md and up: exactly one screen under the navbar (h-14), one grid, nothing
    // scrolls but the move list. Phones: header, cube, buttons and pad fill the
    // screen above the bottom nav; the panels follow below it.
    <div
      className={cn(
        "flex w-full flex-1 flex-col gap-4 px-4 pb-6",
        "md:grid md:h-[calc(100dvh-3.5rem)] md:gap-x-4 md:gap-y-3 md:overflow-hidden md:pb-4",
        // Tablet: cube on top taking what's left, then the pad, then the panels.
        "md:grid-rows-[auto_minmax(16rem,1fr)_auto_auto]",
        // Desktop: pad | cube | notation, one row under the header.
        "lg:grid-cols-[minmax(11rem,13rem)_minmax(0,1fr)_minmax(17rem,20rem)] lg:grid-rows-[auto_minmax(0,1fr)] lg:px-6",
      )}
    >
      {/* Phones only: one screen high. md and up it dissolves into the grid. */}
      <div className="flex h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] min-h-[32rem] flex-col gap-2 pb-3 md:contents">
        <header className="flex flex-wrap items-center gap-x-2 gap-y-2 sm:gap-x-3 pt-3 md:col-span-full md:pt-4">
          <div className="flex min-w-0 items-baseline gap-3">
            <h1 className="text-lg font-semibold tracking-tight md:text-xl">Playground</h1>
            <p className="hidden text-xs text-muted-foreground xl:block">Solves here are never saved.</p>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Segmented
              label="Puzzle"
              value={puzzle}
              options={PLAYGROUND_PUZZLES.map((p) => ({ value: p.id, label: p.label }))}
              onChange={(p) => {
                setPractice(IDLE);
                setRevealStep(-1);
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
          <div className="ml-auto flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="hidden md:inline-flex"
              onClick={() => setKeysOpen(true)}
              aria-label="Keys and custom mapping"
              title="Keys & custom mapping (?)"
            >
              <Keyboard />
            </Button>
            <SettingsPopover prefs={prefs} swipeOn={swipeOn} onOpenKeys={() => setKeysOpen(true)} />
          </div>
        </header>

        <section className="flex min-h-0 min-w-0 flex-1 flex-col items-center gap-2 md:gap-3 lg:col-start-2 lg:row-start-2">
          <div className="flex min-h-7 items-center" aria-live="polite">
            {justSolved ? (
              <p className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                <PartyPopper className="size-4" /> Solved in {count} {count === 1 ? "move" : "moves"}
                {setupKind === "case" && algCount > 0 && (
                  <span className="font-normal text-primary/80">(the alg is {algCount})</span>
                )}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground tabular-nums">
                {revealing
                  ? "Scrambling…"
                  : `${statusLabel(setupKind, solved)}, ${count} ${count === 1 ? "move" : "moves"}`}
              </p>
            )}
          </div>

          <PracticeTimer phase={practice} onReplay={() => setReplayToken((n) => n + 1)} />

          {/* The cube is the biggest square this box allows (container query units). */}
          <div className="grid min-h-0 w-full flex-1 place-items-center [container-type:size]">
            <PlaygroundCube
              puzzle={puzzle}
              visualization={visualization}
              scramble={scramble}
              moves={moves}
              revision={revision}
              tempoScale={prefs.animationSpeed}
              hintStickers={prefs.hintStickers}
              replayToken={replayToken}
              revealing={revealing}
              swipe={prefs.swipeToTurn}
              dragOffCube={prefs.dragOffCube}
              showSwipeHint={!swipeHintDismissed}
              onDismissSwipeHint={dismissSwipeHint}
              onMove={onMove}
              onRevealStep={setRevealStep}
              onRevealed={onRevealed}
              className="w-[min(100cqw,100cqh)]"
            />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
            <Button type="button" onClick={onScramble} disabled={generating || revealing} title="Scramble (Enter)">
              <Shuffle /> {generating || revealing ? "Scrambling…" : "Scramble"}
            </Button>
            <Button
              type="button"
              variant={practiceOn ? "secondary" : "outline"}
              onClick={togglePractice}
              aria-pressed={practiceOn}
              title="Time your solves: the clock starts on your first turn after a scramble"
              aria-label="Practice"
            >
              <Timer /> <span className="max-[379px]:hidden">Practice</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => dispatch({ type: "undo" })}
              disabled={moves.length === 0 || revealing}
              aria-label="Undo"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 /> <span className="hidden sm:inline">Undo</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => dispatch({ type: "redo", t: performance.now() })}
              disabled={redo.length === 0 || revealing}
              aria-label="Redo"
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo2 /> <span className="hidden sm:inline">Redo</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setPractice(IDLE);
                setRevealStep(-1);
                dispatch({ type: "reset" });
              }}
              disabled={!scramble && moves.length === 0}
              aria-label="Reset"
              title="Reset to solved"
            >
              <RotateCcw /> <span className="hidden sm:inline">Reset</span>
            </Button>
          </div>
        </section>

        <div className="flex min-h-0 justify-center lg:col-start-1 lg:row-start-2 lg:overflow-y-auto">
          <MovePad puzzle={puzzle} onMove={onMove} disabled={revealing} />
        </div>
      </div>

      <aside className="grid min-h-0 min-w-0 gap-4 md:grid-cols-2 lg:col-start-3 lg:row-start-2 lg:grid-cols-1 lg:grid-rows-[minmax(0,1fr)_auto]">
        <Panel className="min-h-0 md:max-lg:order-2">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-sm font-medium">{startLabel}</h2>
            <ScrambleTape
              scramble={scramble}
              step={revealing ? revealStep : null}
              label={setupKind === "scramble" ? `Scramble: ${scramble}` : undefined}
            />
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-1.5 border-t border-border pt-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">Your moves</h2>
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
            </div>
            <p
              className="max-h-40 min-h-10 overflow-y-auto font-mono text-sm break-words md:max-h-24 lg:max-h-none lg:flex-1"
              data-testid="playground-history"
            >
              {history || <span className="text-muted-foreground">Turn the cube to start.</span>}
            </p>
            {simplified && simplified !== history && (
              <p className="text-xs text-muted-foreground">
                Simplified: <span className="font-mono">{simplified}</span>
              </p>
            )}
          </div>
        </Panel>

        <Panel className="md:max-lg:order-1">
          <h2 className="text-sm font-medium">Try an algorithm</h2>
          <AlgPanel
            value={algText}
            onChange={(v) => {
              setAlgText(v);
              setAlgError(null);
            }}
            error={algError}
            disabled={!ready || revealing}
            onSetupCase={setUpCase}
            onShowMe={showMe}
            onApply={applyAlg}
          />
        </Panel>
      </aside>

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

/**
 * The start position as a row of moves. While a scramble is being turned on,
 * the move on the cube right now is lit and the ones still to come are faint,
 * so the cube and the notation can be read together.
 */
function ScrambleTape({ scramble, step, label }: { scramble: string; step: number | null; label?: string }) {
  if (!scramble) {
    return <p className="font-mono text-sm text-muted-foreground">None yet. Press Scramble.</p>;
  }
  const tokens = scramble.split(/\s+/).filter(Boolean);
  return (
    <p className="-mx-1 font-mono text-sm leading-7 break-words" aria-label={label}>
      {tokens.map((move, i) => (
        <span
          // Moves repeat, so position is the identity.
          key={i}
          className={cn(
            "inline-block rounded px-1",
            step !== null && i === step && "bg-primary text-primary-foreground",
            step !== null && i > step && "text-muted-foreground/45",
          )}
        >
          {move}
        </span>
      ))}
    </p>
  );
}

/** Speed, view and input settings. Kept off the page so the cube gets the room. */
function SettingsPopover({
  prefs,
  swipeOn,
  onOpenKeys,
}: {
  prefs: ReturnType<typeof usePlaygroundPrefs>;
  swipeOn: boolean;
  onOpenKeys: () => void;
}) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Settings" title="Settings">
            <Settings2 />
          </Button>
        }
      />
      <PopoverContent align="end" className="w-80 gap-3 p-4">
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
          label="Animate scrambles"
          checked={prefs.animateScramble}
          onChange={(animateScramble) => updatePrefs({ animateScramble })}
        />
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
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          <p className="text-xs text-muted-foreground">
            {sameBindings(prefs.keyBindings, DEFAULT_BINDINGS)
              ? "Press R to turn R. Hold Shift for R'."
              : "Using your custom keys."}{" "}
            {swipeOn
              ? prefs.dragOffCube === "rotate"
                ? "Swipe a row to turn it; drag off the cube to rotate it."
                : "Swipe a row to turn it; drag off the cube to look around."
              : "Drag to look around; click a face to turn it."}{" "}
            Enter scrambles. Solves here are never saved.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={onOpenKeys}>
            <Keyboard /> Keys &amp; custom mapping{" "}
            <kbd className="font-mono text-[0.7rem] text-muted-foreground">?</kbd>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
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
            "rounded-md px-2 py-1 text-sm font-medium transition-colors sm:px-2.5",
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

function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <section className={cn("flex flex-col gap-3 rounded-xl border border-border bg-card p-4", className)}>
      {children}
    </section>
  );
}
