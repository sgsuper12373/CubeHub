import type { PlaygroundPuzzle } from "./puzzles";

/**
 * Keyboard → move, following csTimer's virtual-cube layout, which is what
 * cubers who practise on a virtual cube already have in their fingers.
 *
 * Keyed by `KeyboardEvent.code` (the physical key), not `key`: the layout is
 * about finger position, so it should stay put on AZERTY or Dvorak, and with
 * Caps Lock on.
 *
 * The pairs mirror each other across the keyboard: the right hand turns R
 * (I/K) the way it would on a real cube, the left hand turns L (D/E), and the
 * index fingers do U (J/F).
 */
export const KEYMAP: Readonly<Record<string, string>> = {
  KeyI: "R",
  KeyK: "R'",
  KeyD: "L",
  KeyE: "L'",
  KeyJ: "U",
  KeyF: "U'",
  KeyS: "D",
  KeyL: "D'",
  KeyH: "F",
  KeyG: "F'",
  KeyW: "B",
  KeyO: "B'",
  KeyU: "r",
  KeyM: "r'",
  KeyV: "l",
  KeyR: "l'",
  Digit5: "M",
  Digit6: "M",
  KeyX: "M'",
  Period: "M'",
  KeyT: "x",
  KeyY: "x",
  KeyB: "x'",
  KeyN: "x'",
  Semicolon: "y",
  KeyA: "y'",
  KeyP: "z",
  KeyQ: "z'",
};

/**
 * A 2x2 has no slices, so wide turns and M are not moves on it (cubing's
 * 2x2x2 rejects them). Those keys do nothing there rather than throwing.
 */
const FACE_OR_ROTATION = /^[RLUDFBxyz]'?$/;

export function moveForKey(code: string, puzzle: PlaygroundPuzzle): string | null {
  const move = KEYMAP[code];
  if (!move) return null;
  if (puzzle === "222" && !FACE_OR_ROTATION.test(move)) return null;
  return move;
}

/** What the help card lists: one row per move, with every key that does it. */
export function keymapRows(puzzle: PlaygroundPuzzle): { move: string; keys: string[] }[] {
  const byMove = new Map<string, string[]>();
  for (const code of Object.keys(KEYMAP)) {
    const move = moveForKey(code, puzzle);
    if (!move) continue;
    byMove.set(move, [...(byMove.get(move) ?? []), keyLabel(code)]);
  }
  return [...byMove].map(([move, keys]) => ({ move, keys }));
}

function keyLabel(code: string): string {
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code === "Semicolon") return ";";
  if (code === "Period") return ".";
  return code;
}
