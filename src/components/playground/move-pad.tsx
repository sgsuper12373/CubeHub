"use client";

import { Button } from "@/components/ui/button";
import type { PlaygroundPuzzle } from "@/lib/playground/puzzles";

const FACES = ["R", "L", "U", "D", "F", "B"];
const ROTATIONS = ["x", "y", "z"];

/**
 * On-screen moves, for phones: there is no keyboard, and swiping a small 3D
 * cube is fiddly. Each family gets its clockwise and prime turn side by side.
 * A 2x2 has no slices, so M is 3x3 only.
 */
export function MovePad({
  puzzle,
  onMove,
}: {
  puzzle: PlaygroundPuzzle;
  onMove: (move: string) => void;
}) {
  const families = [...FACES, ...(puzzle === "333" ? ["M"] : []), ...ROTATIONS];

  return (
    <div className="grid w-full max-w-md grid-cols-4 gap-1.5 sm:grid-cols-5" aria-label="Move pad">
      {families.map((family) => (
        <div key={family} className="flex gap-1">
          {[family, `${family}'`].map((move) => (
            <Button
              key={move}
              type="button"
              variant={ROTATIONS.includes(family) ? "ghost" : "outline"}
              size="sm"
              className="h-10 flex-1 px-0 font-mono text-sm"
              onClick={() => onMove(move)}
              aria-label={`Turn ${move}`}
            >
              {move}
            </Button>
          ))}
        </div>
      ))}
    </div>
  );
}
