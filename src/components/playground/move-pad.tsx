"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { PlaygroundPuzzle } from "@/lib/playground/puzzles";
import { cn } from "@/lib/utils";

const FACES = ["R", "L", "U", "D", "F", "B"];
const ROTATIONS = ["x", "y", "z"];
/** 3x3 only, and less used, so they sit behind "More moves". */
const EXTRA_333 = ["M", "E", "S", "r", "l", "u"];

/**
 * On-screen moves, for phones: there is no keyboard, and swiping a small 3D
 * cube is fiddly. Each family gets its clockwise, prime and double turn side
 * by side. A 2x2 has no slices or wide turns, so it never shows "More moves".
 */
export function MovePad({
  puzzle,
  onMove,
}: {
  puzzle: PlaygroundPuzzle;
  onMove: (move: string) => void;
}) {
  const [more, setMore] = useState(false);
  const extras = puzzle === "333" ? EXTRA_333 : [];

  return (
    <div className="flex w-full max-w-lg flex-col items-center gap-2">
      <div className="grid w-full grid-cols-2 gap-1.5 sm:grid-cols-3" aria-label="Move pad">
        {[...FACES, ...(more ? extras : []), ...ROTATIONS].map((family) => (
          <MoveFamily key={family} family={family} subtle={ROTATIONS.includes(family)} onMove={onMove} />
        ))}
      </div>
      {extras.length > 0 && (
        <Button type="button" variant="ghost" size="xs" onClick={() => setMore((m) => !m)} aria-expanded={more}>
          {more ? "Fewer moves" : "More moves (M E S, wide)"}
          <ChevronDown className={cn("transition-transform", more && "rotate-180")} />
        </Button>
      )}
    </div>
  );
}

function MoveFamily({ family, subtle, onMove }: { family: string; subtle: boolean; onMove: (move: string) => void }) {
  return (
    <div className="flex gap-1">
      {[family, `${family}'`, `${family}2`].map((move) => (
        <Button
          key={move}
          type="button"
          variant={subtle ? "ghost" : "outline"}
          size="sm"
          className="h-10 flex-1 px-0 font-mono text-sm"
          onClick={() => onMove(move)}
          aria-label={`Turn ${move}`}
        >
          {move}
        </Button>
      ))}
    </div>
  );
}
