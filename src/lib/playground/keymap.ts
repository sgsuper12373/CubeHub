import type { PlaygroundPuzzle } from "./puzzles";

/**
 * Keyboard → move. A binding maps a key chord to a move: `"KeyR"` → `R`,
 * `"Shift+KeyR"` → `R'`. The default is notation keys (the key is the move's
 * letter, Shift makes it prime), which is what a beginner expects; anyone who
 * wants csTimer's layout, or their own, rebinds keys in the key list.
 *
 * Chords use `KeyboardEvent.code` (the physical key), not `key`, so bindings
 * stay put on AZERTY or Dvorak, and with Caps Lock on.
 */
export type KeyBindings = Readonly<Record<string, string>>;

export interface KeyPress {
  code: string;
  shiftKey?: boolean;
}

const FACE_FAMILIES = ["R", "L", "U", "D", "F", "B"];
const SLICE_FAMILIES = ["M", "E", "S"];
const WIDE_FAMILIES = ["r", "l", "u", "d", "f", "b"];
const ROTATION_FAMILIES = ["x", "y", "z"];

/** Every move a key can be bound to, in the order the key list shows them. */
export const BINDABLE_MOVES: readonly string[] = [
  ...FACE_FAMILIES,
  ...SLICE_FAMILIES,
  ...WIDE_FAMILIES,
  ...ROTATION_FAMILIES,
].flatMap((f) => [f, `${f}'`, `${f}2`]);

const BINDABLE = new Set(BINDABLE_MOVES);

/** Notation keys: the clockwise move per key. Shift makes it prime. */
const NOTATION_KEYS: Readonly<Record<string, string>> = {
  KeyR: "R",
  KeyL: "L",
  KeyU: "U",
  KeyD: "D",
  KeyF: "F",
  KeyB: "B",
  KeyM: "M",
  KeyE: "E",
  KeyS: "S",
  KeyX: "x",
  KeyY: "y",
  KeyZ: "z",
};

export const DEFAULT_BINDINGS: KeyBindings = Object.fromEntries(
  Object.entries(NOTATION_KEYS).flatMap(([code, move]) => [
    [code, move],
    [`Shift+${code}`, `${move}'`],
  ]),
);

/**
 * Keys that can never be bound: Space is the timer's key everywhere else,
 * Escape and Tab belong to the browser and dialogs, and modifiers alone are
 * not keys. `?` (Shift+Slash) opens the key list.
 */
const RESERVED_CODES = new Set([
  "Space",
  "Escape",
  "Tab",
  "Enter",
  "Backspace",
  "ShiftLeft",
  "ShiftRight",
  "ControlLeft",
  "ControlRight",
  "AltLeft",
  "AltRight",
  "MetaLeft",
  "MetaRight",
  "CapsLock",
  "ContextMenu",
]);

const CHORD = /^(Shift\+)?(Key[A-Z]|Digit\d|Numpad\w+|Semicolon|Quote|Comma|Period|Slash|Backslash|BracketLeft|BracketRight|Minus|Equal|Backquote|Arrow(Up|Down|Left|Right))$/;

export function chordOf(press: KeyPress): string {
  return press.shiftKey ? `Shift+${press.code}` : press.code;
}

/** Why a key can't be bound, or null if it can. */
export function chordProblem(press: KeyPress): string | null {
  if (RESERVED_CODES.has(press.code)) return `${keyName(press.code)} is reserved.`;
  if (press.shiftKey && press.code === "Slash") return "? opens the key list.";
  if (!CHORD.test(chordOf(press))) return "That key can't be used.";
  return null;
}

/**
 * A 2x2 has no slices or wide turns (cubing's 2x2x2 rejects them), so those
 * bindings do nothing there rather than throwing.
 */
const ON_2X2 = /^[RLUDFBxyz]('|2)?$/;

export function movesFor(puzzle: PlaygroundPuzzle): string[] {
  return puzzle === "222" ? BINDABLE_MOVES.filter((m) => ON_2X2.test(m)) : [...BINDABLE_MOVES];
}

export function moveForKey(
  press: KeyPress,
  puzzle: PlaygroundPuzzle,
  bindings: KeyBindings = DEFAULT_BINDINGS,
): string | null {
  const move = bindings[chordOf(press)];
  if (!move) return null;
  if (puzzle === "222" && !ON_2X2.test(move)) return null;
  return move;
}

/** The presses that give `move`; a double with no key of its own is its single turn twice. */
export function keysForMove(
  move: string,
  puzzle: PlaygroundPuzzle,
  bindings: KeyBindings = DEFAULT_BINDINGS,
): KeyPress[] | null {
  const find = (m: string) => {
    const chord = Object.keys(bindings).find((c) => moveForKey(parseChord(c), puzzle, bindings) === m);
    return chord ? parseChord(chord) : null;
  };
  const direct = find(move);
  if (direct) return [direct];
  if (move.endsWith("2")) {
    const single = find(move.slice(0, -1));
    if (single) return [single, single];
  }
  return null;
}

function parseChord(chord: string): KeyPress {
  return chord.startsWith("Shift+") ? { code: chord.slice(6), shiftKey: true } : { code: chord };
}

/** One row per move the puzzle has, with every chord bound to it (maybe none). */
export function keymapRows(puzzle: PlaygroundPuzzle, bindings: KeyBindings = DEFAULT_BINDINGS) {
  const byMove = new Map<string, string[]>(movesFor(puzzle).map((m) => [m, []]));
  for (const [chord, move] of Object.entries(bindings)) byMove.get(move)?.push(chord);
  return [...byMove].map(([move, keys]) => ({ move, keys }));
}

/** Bind `chord` to `move`. A chord does one thing, so it leaves any move it had. */
export function bindKey(bindings: KeyBindings, chord: string, move: string): KeyBindings {
  return { ...bindings, [chord]: move };
}

export function unbindKey(bindings: KeyBindings, chord: string): KeyBindings {
  const next = { ...bindings };
  delete next[chord];
  return next;
}

export function sameBindings(a: KeyBindings, b: KeyBindings): boolean {
  const ka = Object.keys(a);
  return ka.length === Object.keys(b).length && ka.every((k) => a[k] === b[k]);
}

/** Keep only valid chord → move pairs from stored data. */
export function sanitizeBindings(raw: unknown): KeyBindings | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const out: Record<string, string> = {};
  for (const [chord, move] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof move === "string" && BINDABLE.has(move) && !chordProblem(parseChord(chord))) out[chord] = move;
  }
  return out;
}

const PUNCTUATION: Readonly<Record<string, string>> = {
  Semicolon: ";",
  Quote: "'",
  Comma: ",",
  Period: ".",
  Slash: "/",
  Backslash: "\\",
  BracketLeft: "[",
  BracketRight: "]",
  Minus: "-",
  Equal: "=",
  Backquote: "`",
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
};

function keyName(code: string): string {
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Numpad")) return `Num ${code.slice(6)}`;
  return PUNCTUATION[code] ?? code;
}

/** `Shift+KeyR` → `⇧R`, for key chips. */
export function chordLabel(chord: string): string {
  const { code, shiftKey } = parseChord(chord);
  return (shiftKey ? "⇧" : "") + keyName(code);
}
