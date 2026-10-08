"use client";

import { useEffect, useRef, useState } from "react";
import type { TwistyPlayer } from "cubing/twisty";

import { CubeLoader } from "@/components/ui/cube-loader";
import { loadTwisty } from "@/lib/cubing/runtime";
import { twistyPuzzleId, type PlaygroundPuzzle } from "@/lib/playground/puzzles";

type AddMove = TwistyPlayer["experimentalModel"]["experimentalAddMove"];

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

  useEffect(() => {
    onMoveRef.current = onMove;
    latestRef.current = { scramble, moves, revision, tempoScale, hintStickers };
  });

  useEffect(() => {
    let cancelled = false;

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
        experimentalMovePressInput: "basic",
        tempoScale,
      });
      player.timestamp = "end";
      player.style.width = "100%";
      player.style.height = "100%";

      const model = player.experimentalModel;
      addMoveRef.current = model.experimentalAddMove.bind(model);
      model.experimentalAddMove = (move) => onMoveRef.current(move.toString());

      containerRef.current.appendChild(player);
      playerRef.current = player;
      shownRef.current = { revision, length: moves.length };
      setReadyKey(configKey);
    })().catch((err: unknown) => console.error("playground cube failed to load", err));

    return () => {
      cancelled = true;
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
  }, [tempoScale, hintStickers, readyKey, configKey]);

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
    </div>
  );
}
