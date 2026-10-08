import type { PlaygroundPuzzle } from "./puzzles";

/**
 * Playground state. The move list here is the source of truth; the
 * <twisty-player> is only ever told what to show (see playground-cube.tsx).
 *
 * `revision` changes whenever the cube has to be redrawn from scratch rather
 * than animated forward: undo, reset, a new scramble or case, a puzzle switch.
 * Moves and redos only append, so the player can animate them.
 */
export interface PlaygroundState {
  puzzle: PlaygroundPuzzle;
  /** Where the cube starts: empty (solved), a scramble, a case or a shared link. */
  scramble: string;
  setupKind: SetupKind;
  /** For a case: the alg it was set up from, to compare the user's solution against. */
  caseMoves: string[];
  moves: string[];
  /**
   * When each move in `moves` was made (performance.now()), for practice-mode
   * replay. Same length as `moves`; null for moves that weren't timed.
   */
  times: (number | null)[];
  /** Undone moves, most recent last, so redo pops from the end. */
  redo: string[];
  revision: number;
}

export type SetupKind = "none" | "scramble" | "case" | "link";

export type PlaygroundAction =
  | { type: "move"; move: string; t?: number }
  | { type: "moves"; moves: string[] }
  | { type: "undo" }
  | { type: "redo"; t?: number }
  | { type: "reset" }
  | { type: "scramble"; scramble: string }
  | { type: "case"; setup: string; caseMoves: string[] }
  | { type: "load"; setup: string; moves: string[] }
  | { type: "puzzle"; puzzle: PlaygroundPuzzle };

export function initialPlaygroundState(puzzle: PlaygroundPuzzle): PlaygroundState {
  return { puzzle, scramble: "", setupKind: "none", caseMoves: [], moves: [], times: [], redo: [], revision: 0 };
}

/** A fresh attempt from a new starting state: no moves, and a redraw. */
function restart(state: PlaygroundState, patch: Partial<PlaygroundState>): PlaygroundState {
  return { ...state, caseMoves: [], moves: [], times: [], redo: [], revision: state.revision + 1, ...patch };
}

export function playgroundReducer(state: PlaygroundState, action: PlaygroundAction): PlaygroundState {
  switch (action.type) {
    case "move":
      // A new move forks history, as in any editor.
      return {
        ...state,
        moves: [...state.moves, action.move],
        times: [...state.times, action.t ?? null],
        redo: [],
      };
    case "moves":
      if (action.moves.length === 0) return state;
      return {
        ...state,
        moves: [...state.moves, ...action.moves],
        times: [...state.times, ...action.moves.map(() => null)],
        redo: [],
      };
    case "undo": {
      if (state.moves.length === 0) return state;
      const last = state.moves[state.moves.length - 1];
      return {
        ...state,
        moves: state.moves.slice(0, -1),
        times: state.times.slice(0, -1),
        redo: [...state.redo, last],
        revision: state.revision + 1,
      };
    }
    case "redo": {
      if (state.redo.length === 0) return state;
      const next = state.redo[state.redo.length - 1];
      return {
        ...state,
        moves: [...state.moves, next],
        times: [...state.times, action.t ?? null],
        redo: state.redo.slice(0, -1),
      };
    }
    case "reset":
      return restart(state, { scramble: "", setupKind: "none" });
    case "scramble":
      return restart(state, { scramble: action.scramble, setupKind: "scramble" });
    case "case":
      return restart(state, { scramble: action.setup, setupKind: "case", caseMoves: action.caseMoves });
    case "load":
      return restart(state, {
        scramble: action.setup,
        setupKind: action.setup ? "link" : "none",
        moves: action.moves,
        times: action.moves.map(() => null),
      });
    case "puzzle":
      if (action.puzzle === state.puzzle) return state;
      return { ...initialPlaygroundState(action.puzzle), revision: state.revision + 1 };
  }
}

/**
 * Whole-cube rotations (x, y, z, and cubing's `Rv`-style) change the view, not
 * the puzzle, so they are not counted. This is the usual "moves" a cuber means
 * (outer-block turn metric, slices counted as one).
 */
export function isRotation(move: string): boolean {
  return /^([xyz]|[RLUDFB]v)('|2'?)?$/.test(move);
}

export function moveCount(moves: readonly string[]): number {
  return moves.filter((m) => !isRotation(m)).length;
}
