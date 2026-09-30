"use client";

import { useEffect, useRef, useState } from "react";
import type { PuzzleID } from "cubing/twisty";
import { Play, Pause, RotateCcw, FastForward, FlipHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadTwisty } from "@/lib/cubing/runtime";
import { cn } from "@/lib/utils";

function mapPuzzleId(puzzle: string): PuzzleID {
  switch (puzzle) {
    case "333":
      return "3x3x3";
    case "222":
      return "2x2x2";
    case "444":
      return "4x4x4";
    default:
      return "3x3x3";
  }
}

export function mirrorAlg(alg: string): string {
  const map: Record<string, string> = {
    R: "L'", "R'": "L", R2: "L2", "R2'": "L2",
    L: "R'", "L'": "R", L2: "R2", "L2'": "R2",
    U: "U'", "U'": "U", U2: "U2", "U2'": "U2",
    D: "D'", "D'": "D", D2: "D2", "D2'": "D2",
    F: "F'", "F'": "F", F2: "F2", "F2'": "F2",
    B: "B'", "B'": "B", B2: "B2", "B2'": "B2",
    r: "l'", "r'": "l", r2: "l2",
    l: "r'", "l'": "r", l2: "r2",
    f: "f'", "f'": "f", f2: "f2",
    b: "b'", "b'": "b", b2: "b2",
    u: "u'", "u'": "u", u2: "u2",
    d: "d'", "d'": "d", d2: "d2",
    x: "x", "x'": "x'", x2: "x2",
    y: "y'", "y'": "y", y2: "y2",
    z: "z'", "z'": "z", z2: "z2",
    M: "M", "M'": "M'", M2: "M2",
    S: "S'", "S'": "S", S2: "S2",
    E: "E'", "E'": "E", E2: "E2",
  };
  return alg
    .trim()
    .split(/\s+/)
    .map((m) => map[m] || m)
    .join(" ");
}

interface AlgPlayerInnerProps {
  moves: string;
  setupMoves?: string | null;
  puzzle?: string;
  size?: number;
}

export function AlgPlayerInner({
  moves,
  setupMoves,
  puzzle = "333",
  size = 200,
}: AlgPlayerInnerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = useRef<any>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  const [isMirrored, setIsMirrored] = useState(false);

  const activeMoves = isMirrored ? mirrorAlg(moves) : moves;
  const activeSetup = setupMoves
    ? isMirrored
      ? mirrorAlg(setupMoves)
      : setupMoves
    : "";

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { TwistyPlayer } = await loadTwisty();
      if (cancelled || !containerRef.current) return;

      if (playerRef.current) {
        playerRef.current.remove();
        playerRef.current = null;
      }

      const player = new TwistyPlayer({
        puzzle: mapPuzzleId(puzzle),
        alg: activeMoves,
        experimentalSetupAlg: activeSetup || undefined,
        experimentalSetupAnchor: "start",
        visualization: "3D",
        background: "none",
        controlPanel: "none",
        hintFacelets: "none",
        tempoScale: speed,
      });

      player.style.width = `${size}px`;
      player.style.height = `${size}px`;

      containerRef.current.appendChild(player);
      playerRef.current = player;
      setIsPlaying(false);
    })();

    return () => {
      cancelled = true;
      if (playerRef.current) {
        playerRef.current.remove();
        playerRef.current = null;
      }
    };
  }, [activeMoves, activeSetup, puzzle, size, speed]);

  // Update tempo whenever speed changes
  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.tempoScale = speed;
    }
  }, [speed]);

  const handlePlayToggle = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pause();
      setIsPlaying(false);
    } else {
      playerRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleReset = () => {
    if (!playerRef.current) return;
    playerRef.current.pause();
    playerRef.current.jumpToStart();
    setIsPlaying(false);
  };

  const cycleSpeed = () => {
    const nextSpeed = speed === 0.5 ? 1 : speed === 1 ? 2 : 0.5;
    setSpeed(nextSpeed);
  };

  const toggleMirror = () => {
    setIsMirrored((prev) => !prev);
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 p-3 bg-muted/20 border border-border rounded-2xl">
      {/* 3D Twisty Container */}
      <div
        ref={containerRef}
        className="flex items-center justify-center relative cursor-grab active:cursor-grabbing"
      />

      {/* Active Alg Display when mirrored */}
      {isMirrored && (
        <div className="text-[11px] font-mono text-primary/80 bg-primary/10 px-2 py-0.5 rounded">
          Mirrored: {activeMoves}
        </div>
      )}

      {/* Interactive Control Bar */}
      <div className="flex items-center gap-1.5 bg-background/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-border shadow-sm">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-foreground/80 hover:text-foreground"
          onClick={handleReset}
          title="Reset to start"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="default"
          size="icon"
          className="h-8 w-8 font-semibold shadow-sm"
          onClick={handlePlayToggle}
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs font-mono font-medium text-foreground/80 hover:text-foreground"
          onClick={cycleSpeed}
          title="Speed"
        >
          <FastForward className="h-3.5 w-3.5 mr-1" />
          {speed}x
        </Button>

        <Button
          type="button"
          variant={isMirrored ? "secondary" : "ghost"}
          size="sm"
          className={cn(
            "h-8 px-2 text-xs font-medium",
            isMirrored && "bg-primary/20 text-primary hover:bg-primary/30",
          )}
          onClick={toggleMirror}
          title="Mirror algorithm"
        >
          <FlipHorizontal className="h-3.5 w-3.5 mr-1" />
          Mirror
        </Button>
      </div>
    </div>
  );
}
