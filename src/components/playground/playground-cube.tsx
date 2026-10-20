"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { TwistyPlayer } from "cubing/twisty";

import { Button } from "@/components/ui/button";
import { CubeLoader } from "@/components/ui/cube-loader";
import { loadTwisty } from "@/lib/cubing/runtime";
import type { DragOffCube } from "@/lib/playground/prefs";
import { twistyPuzzleId, type PlaygroundPuzzle } from "@/lib/playground/puzzles";
import {
  canSwipe,
  DEFAULT_ORBIT,
  lockedSwipe,
  pickSticker,
  rotationForDrag,
  swipeMove,
  type OrbitCamera,
  type StickerHit,
} from "@/lib/playground/swipe";

type AddMove = TwistyPlayer["experimentalModel"]["experimentalAddMove"];

/** Cube size per puzzle, for swipe-to-turn. Puzzles not listed keep cubing's own input. */
const SWIPE_SIZES: Partial<Record<PlaygroundPuzzle, number>> = { "333": 3, "222": 2 };

/** One pointer's swipe in progress. `hit` is null for a drag that started off the cube. */
interface Gesture {
  pointerId: number;
  startX: number;
  startY: number;
  hit: StickerHit | null;
  done: boolean;
}

/**
 * The live cube. It renders whatever `scramble` + `moves` describe; it never
 * owns state. The screen's reducer does (lib/playground/history.ts).
 *
 * Clicks on the 3D cube are cubing's own "move press" input, which appends to
 * the player's alg by calling `experimentalModel.experimentalAddMove`. That
 * call is intercepted and routed to `onMove` instead, so a click goes through
 * exactly the same path as a key press: validated, recorded, then drawn. The
 * original method is kept for drawing.
 *
 * Move press only works on cubing's PG3D renderer (its default 3x3 renderer
 * skips it), hence `visualization: "PG3D"`.
 *
 * With `swipe` on (3D 3x3 and 2x2), move press is switched off and a pointer
 * layer takes over instead: a press on a sticker becomes a swipe that turns
 * that sticker's row or column (lib/playground/swipe.ts), emitted through the
 * same `onMove`. Its listeners sit on the container in the capture phase, so a
 * press on the cube never reaches cubing's canvas; a press off the cube is
 * left alone and cubing orbits the camera as before, unless `dragOffCube` is
 * "rotate", in which case it becomes an x/y/z turn.
 *
 * `replayToken` changing (to anything but 0) plays the whole attempt from the
 * start state: the practice-mode replay.
 */
export function PlaygroundCube({
  puzzle,
  visualization,
  scramble,
  moves,
  revision,
  tempoScale,
  hintStickers,
  replayToken,
  swipe,
  dragOffCube,
  showSwipeHint,
  onDismissSwipeHint,
  onMove,
}: {
  puzzle: PlaygroundPuzzle;
  visualization: "3D" | "2D";
  scramble: string;
  moves: readonly string[];
  revision: number;
  tempoScale: number;
  hintStickers: boolean;
  replayToken: number;
  swipe: boolean;
  dragOffCube: DragOffCube;
  /** Show the one-time "swipe a row" hint (touch screens only). */
  showSwipeHint: boolean;
  onDismissSwipeHint: () => void;
  onMove: (move: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<TwistyPlayer | null>(null);
  const addMoveRef = useRef<AddMove | null>(null);
  const onMoveRef = useRef(onMove);
  // What the player currently shows, so the next render knows whether it can
  // animate one appended move or has to redraw.
  const shownRef = useRef<{ revision: number; length: number } | null>(null);
  // Latest props for the mount effect, which must not re-run on every move.
  const latestRef = useRef({ scramble, moves, revision, tempoScale, hintStickers });
  const configKey = `${puzzle}|${visualization}`;
  const [readyKey, setReadyKey] = useState<string | null>(null);
  const swipeSize = SWIPE_SIZES[puzzle];
  const swipeOn = swipe && visualization === "3D" && swipeSize !== undefined;
  // What the gesture layer reads on pointerdown, which must decide synchronously.
  const swipeRef = useRef({ on: swipeOn, size: swipeSize ?? 3, dragOffCube });
  const orbitRef = useRef<OrbitCamera>(DEFAULT_ORBIT);
  const onSwipeRef = useRef(onDismissSwipeHint);
  const touch = useSyncExternalStore(subscribeCoarsePointer, isCoarsePointer, () => false);

  useEffect(() => {
    onMoveRef.current = onMove;
    onSwipeRef.current = onDismissSwipeHint;
    latestRef.current = { scramble, moves, revision, tempoScale, hintStickers };
    swipeRef.current = { on: swipeOn, size: swipeSize ?? 3, dragOffCube };
  });

  useEffect(() => {
    let cancelled = false;
    let stopOrbit: (() => void) | null = null;

    (async () => {
      const { TwistyPlayer } = await loadTwisty();
      if (cancelled || !containerRef.current) return;

      playerRef.current?.remove();
      const { scramble, moves, revision, tempoScale, hintStickers } = latestRef.current;
      const player = new TwistyPlayer({
        puzzle: twistyPuzzleId(puzzle),
        experimentalSetupAlg: scramble,
        alg: moves.join(" "),
        visualization: visualization === "3D" ? "PG3D" : "2D",
        background: "none",
        controlPanel: "none",
        hintFacelets: hintStickers ? "floating" : "none",
        experimentalDragInput: "auto",
        experimentalMovePressInput: swipeRef.current.on ? "none" : "basic",
        tempoScale,
      });
      player.timestamp = "end";
      player.style.width = "100%";
      player.style.height = "100%";

      const model = player.experimentalModel;
      addMoveRef.current = model.experimentalAddMove.bind(model);
      model.experimentalAddMove = (move) => onMoveRef.current(move.toString());

      // The camera, for hit-testing swipes. cubing has no sync getter for it.
      orbitRef.current = DEFAULT_ORBIT;
      const orbit = model.twistySceneModel.orbitCoordinates;
      const onOrbit = (c: OrbitCamera) => (orbitRef.current = c);
      orbit.addFreshListener(onOrbit);
      stopOrbit = () => orbit.removeFreshListener(onOrbit);

      containerRef.current.appendChild(player);
      playerRef.current = player;
      shownRef.current = { revision, length: moves.length };
      setReadyKey(configKey);
    })().catch((err: unknown) => console.error("playground cube failed to load", err));

    return () => {
      cancelled = true;
      stopOrbit?.();
      playerRef.current?.remove();
      playerRef.current = null;
      addMoveRef.current = null;
      shownRef.current = null;
    };
  }, [puzzle, visualization, configKey]);

  // Bring the player up to date with the move list.
  useEffect(() => {
    const player = playerRef.current;
    const addMove = addMoveRef.current;
    const shown = shownRef.current;
    if (!player || !addMove || !shown || readyKey !== configKey) return;
    if (shown.revision === revision && shown.length === moves.length) return;

    if (shown.revision === revision && moves.length > shown.length) {
      // Moves appended (one turn, or a whole alg from the alg box): animate
      // them in order. No cancellation, so `R R'` stays two moves in the
      // player just as it does in the history.
      for (const move of moves.slice(shown.length)) addMove(move, { cancel: false });
    } else {
      player.experimentalSetupAlg = scramble;
      player.alg = moves.join(" ");
      player.timestamp = "end";
    }
    shownRef.current = { revision, length: moves.length };
  }, [scramble, moves, revision, readyKey, configKey]);

  // View settings apply to the live player; no need to rebuild it.
  useEffect(() => {
    const player = playerRef.current;
    if (!player || readyKey !== configKey) return;
    player.tempoScale = tempoScale;
    player.hintFacelets = hintStickers ? "floating" : "none";
    // Swipe replaces click-to-turn; both on would turn twice.
    player.experimentalMovePressInput = swipeOn ? "none" : "basic";
  }, [tempoScale, hintStickers, swipeOn, readyKey, configKey]);

  // The swipe gesture layer.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let gesture: Gesture | null = null;

    function onDown(e: PointerEvent) {
      const { on, size, dragOffCube } = swipeRef.current;
      if (!on || gesture || !e.isPrimary || e.button !== 0 || !el) return;
      const rect = el.getBoundingClientRect();
      const viewport = { width: rect.width, height: rect.height };
      const picked = pickSticker(orbitRef.current, viewport, e.clientX - rect.left, e.clientY - rect.top, size);
      // A face seen too edge-on to tell rows from columns counts as off the
      // cube, so the drag turns the view to somewhere it can be read.
      const hit = picked && canSwipe(picked, size, orbitRef.current, viewport) ? picked : null;
      // Off the cube: cubing's own drag orbits the camera.
      if (!hit && dragOffCube === "orbit") return;
      e.stopPropagation();
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      gesture = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, hit, done: false };
    }

    function onMoveEvent(e: PointerEvent) {
      if (!gesture || e.pointerId !== gesture.pointerId || !el) return;
      e.stopPropagation();
      if (gesture.done) return;
      const locked = lockedSwipe(e.clientX - gesture.startX, e.clientY - gesture.startY);
      if (!locked) return;
      // One turn per swipe: the direction is locked at the threshold.
      gesture.done = true;
      const rect = el.getBoundingClientRect();
      const { size } = swipeRef.current;
      const move = gesture.hit
        ? swipeMove(gesture.hit, size, locked.dx, locked.dy, orbitRef.current, {
            width: rect.width,
            height: rect.height,
          })
        : rotationForDrag(locked.dx, locked.dy, orbitRef.current);
      if (!move) return;
      onMoveRef.current(move);
      onSwipeRef.current();
    }

    function onEnd(e: PointerEvent) {
      if (!gesture || e.pointerId !== gesture.pointerId) return;
      e.stopPropagation();
      if (el?.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      gesture = null;
    }

    const opts = { capture: true };
    el.addEventListener("pointerdown", onDown, opts);
    el.addEventListener("pointermove", onMoveEvent, opts);
    el.addEventListener("pointerup", onEnd, opts);
    el.addEventListener("pointercancel", onEnd, opts);
    return () => {
      el.removeEventListener("pointerdown", onDown, opts);
      el.removeEventListener("pointermove", onMoveEvent, opts);
      el.removeEventListener("pointerup", onEnd, opts);
      el.removeEventListener("pointercancel", onEnd, opts);
    };
  }, []);

  useEffect(() => {
    const player = playerRef.current;
    if (!replayToken || !player || readyKey !== configKey) return;
    player.timestamp = "start";
    player.play();
  }, [replayToken, readyKey, configKey]);

  return (
    <div className="relative aspect-square w-full max-w-[min(28rem,70vh)]" data-testid="playground-cube">
      {readyKey !== configKey && (
        <div className="absolute inset-0 grid place-items-center">
          <CubeLoader size={48} label="Loading cube" />
        </div>
      )}
      <div ref={containerRef} className="size-full touch-none" />
      {swipeOn && showSwipeHint && touch && readyKey === configKey && (
        <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center px-2">
          <div
            role="note"
            className="pointer-events-auto flex items-center gap-2 rounded-lg border border-border bg-card/95 px-3 py-2 text-xs text-muted-foreground shadow-sm"
          >
            <span>Swipe a row to turn it. Drag outside the cube to rotate.</span>
            <Button type="button" variant="ghost" size="xs" onClick={onDismissSwipeHint}>
              Got it
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

const COARSE_POINTER = "(pointer: coarse)";

function subscribeCoarsePointer(listener: () => void): () => void {
  const query = window.matchMedia(COARSE_POINTER);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

function isCoarsePointer(): boolean {
  return window.matchMedia(COARSE_POINTER).matches;
}
