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
 *
 * Phones get a compact pad (PhonePad) so it fits on one screen with the cube.
 * From md it is a grid under the cube; at lg a single column beside it.
 */
export function MovePad({
  puzzle,
  onMove,
  disabled = false,
}: {
  puzzle: PlaygroundPuzzle;
  onMove: (move: string) => void;
  disabled?: boolean;
}) {
  const [more, setMore] = useState(false);
  const extras = puzzle === "333" ? EXTRA_333 : [];

  return (
    <>
      <PhonePad puzzle={puzzle} onMove={onMove} disabled={disabled} />
      <div className="flex w-full max-w-lg flex-col items-center gap-2 max-md:hidden lg:max-w-none">
        <div className="grid w-full grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-1" aria-label="Move pad">
          {[...FACES, ...(more ? extras : []), ...ROTATIONS].map((family) => (
            <MoveFamily
              key={family}
              family={family}
              subtle={ROTATIONS.includes(family)}
              disabled={disabled}
              onMove={onMove}
            />
          ))}
      </div>
      {extras.length > 0 && (
        <Button type="button" variant="ghost" size="xs" onClick={() => setMore((m) => !m)} aria-expanded={more}>
          {more ? "Fewer moves" : "More moves (M E S, wide)"}
          <ChevronDown className={cn("transition-transform", more && "rotate-180")} />
        </Button>
      )}
      </div>
    </>
  );
}

type PhoneGroup = "faces" | "slices" | "rotations";

const PHONE_GROUPS: { id: PhoneGroup; label: string; families: string[] }[] = [
  { id: "faces", label: "Faces", families: FACES },
  { id: "slices", label: "Slices & wide", families: EXTRA_333 },
  { id: "rotations", label: "Rotations", families: ROTATIONS },
];

/**
 * The phone pad: one group at a time, a column per face (or slice, or axis)
 * with its clockwise, prime and double turn stacked, so 18 buttons take three
 * short rows instead of a screen.
 */
function PhonePad({
  puzzle,
  onMove,
  disabled,
}: {
  puzzle: PlaygroundPuzzle;
  onMove: (move: string) => void;
  disabled: boolean;
}) {
  const [group, setGroup] = useState<PhoneGroup>("faces");
  const groups = PHONE_GROUPS.filter((g) => g.id !== "slices" || puzzle === "333");
  // A 2x2 has no slices; fall back to faces if that tab was open on a 3x3.
  const current = groups.find((g) => g.id === group) ?? groups[0];

  return (
    <div className="flex w-full flex-col gap-1.5 md:hidden">
      <div role="tablist" aria-label="Move groups" className="flex gap-1">
        {groups.map((g) => (
          <button
            key={g.id}
            type="button"
            role="tab"
            aria-selected={g.id === current.id}
            onClick={() => setGroup(g.id)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              g.id === current.id ? "bg-muted text-foreground" : "text-muted-foreground",
            )}
          >
            {g.label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        aria-label="Move pad"
        className="grid grid-flow-col grid-rows-3 gap-1"
        style={{ gridTemplateColumns: `repeat(${current.families.length}, minmax(0, 1fr))` }}
      >
        {current.families.flatMap((family) =>
          [family, `${family}'`, `${family}2`].map((move) => (
            <Button
              key={move}
              type="button"
              variant="outline"
              size="sm"
              className="h-10 px-0 font-mono text-sm"
              disabled={disabled}
              onClick={() => onMove(move)}
              aria-label={`Turn ${move}`}
            >
              {move}
            </Button>
          )),
        )}
      </div>
    </div>
  );
}

function MoveFamily({
  family,
  subtle,
  disabled,
  onMove,
}: {
  family: string;
  subtle: boolean;
  disabled: boolean;
  onMove: (move: string) => void;
}) {
  return (
    <div className="flex gap-1">
      {[family, `${family}'`, `${family}2`].map((move) => (
        <Button
          key={move}
          type="button"
          variant={subtle ? "ghost" : "outline"}
          size="sm"
          className="h-10 flex-1 px-0 font-mono text-sm lg:h-8"
          disabled={disabled}
          onClick={() => onMove(move)}
          aria-label={`Turn ${move}`}
        >
          {move}
        </Button>
      ))}
    </div>
  );
}
