"use client";

import { useEffect, useRef, useState } from "react";
import type { PuzzleID, TwistyPlayer } from "cubing/twisty";
import { Eye, Play, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CubeLoader } from "@/components/ui/cube-loader";
import { loadTwisty } from "@/lib/cubing/runtime";
import { drillPlayerConfig, physicalSetup, type Auf } from "@/lib/drill/case-state";
import { cn } from "@/lib/utils";

function puzzleId(puzzle: string): PuzzleID {
  return puzzle === "222" ? "2x2x2" : "3x3x3";
}

/**
 * Shows a drill case. The state is derived from the algorithm itself (see
 * lib/drill/case-state.ts): the player gets the real algorithm anchored at the
 * end, so it opens on the case and "Watch" plays the actual solution.
 */
export function DrillCaseView({
  moves,
  auf,
  puzzle,
  visualization,
  hidden,
  showSetup,
  size = 240,
}: {
  moves: string;
  auf: Auf;
  puzzle: string;
  visualization: "2D" | "3D";
  /** Recognition mode, before the reveal tap. */
  hidden: boolean;
  showSetup: boolean;
  size?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<TwistyPlayer | null>(null);
  // Which configuration has a mounted player; anything else is still loading.
  const configKey = `${puzzle}|${visualization}|${size}|${auf}|${moves}`;
  const [readyKey, setReadyKey] = useState<string | null>(null);
  const ready = readyKey === configKey;
  const [setup, setSetup] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { TwistyPlayer } = await loadTwisty();
      if (cancelled || !containerRef.current) return;

      playerRef.current?.remove();
      const player = new TwistyPlayer({
        puzzle: puzzleId(puzzle),
        ...drillPlayerConfig(moves, auf),
        visualization,
        background: "none",
        controlPanel: "none",
        hintFacelets: "none",
        tempoScale: 1.5,
      });
      player.style.width = `${size}px`;
      player.style.height = `${size}px`;
      containerRef.current.appendChild(player);
      playerRef.current = player;
      setReadyKey(configKey);
    })().catch((err: unknown) => console.error("drill case view failed to load", err));

    return () => {
      cancelled = true;
      playerRef.current?.remove();
      playerRef.current = null;
    };
  }, [moves, auf, puzzle, visualization, size, configKey]);

  useEffect(() => {
    if (!showSetup) return;
    let cancelled = false;
    physicalSetup(moves, auf)
      .then((s) => !cancelled && setSetup(s))
      .catch(() => !cancelled && setSetup(null));
    return () => {
      cancelled = true;
    };
  }, [moves, auf, showSetup]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative grid place-items-center" style={{ width: size, height: size }}>
        {!ready && <CubeLoader size={40} label="Loading cube" className="absolute" />}
        <div ref={containerRef} className="grid place-items-center" />
        {hidden && (
          <div
            className="absolute inset-0 grid place-items-center rounded-2xl border border-border bg-card"
            data-testid="drill-case-hidden"
          >
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Eye className="size-4" /> Tap to reveal
            </span>
          </div>
        )}
      </div>

      {!hidden && (
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => {
              playerRef.current?.jumpToStart();
              playerRef.current?.play();
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Play className="size-3" /> Watch
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => {
              playerRef.current?.pause();
              playerRef.current?.jumpToStart();
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <RotateCcw className="size-3" /> Case
          </Button>
        </div>
      )}

      {showSetup && !hidden && (
        <p className={cn("max-w-xs text-center font-mono text-xs text-muted-foreground", !setup && "opacity-0")}>
          Setup (yellow top, green front): <span className="text-foreground">{setup ?? "…"}</span>
        </p>
      )}
    </div>
  );
}
