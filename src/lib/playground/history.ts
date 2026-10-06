import type { PlaygroundPuzzle } from "./puzzles";

/**
 * Playground state. The move list here is the source of truth; the
 * <twisty-player> is only ever told what to show (see playground-cube.tsx).
 *
 * `revision` changes whenever the cube has to be redrawn from scratch rather
 * than animated forward one move: undo, reset, a new scramble, a puzzle
 * switch. A plain move or a redo only appends, so the player can animate it.
 */
export interface PlaygroundState {
  puzzle: PlaygroundPuzzle;
  /** Empty until the user scrambles; the cube then starts from this state. */
  scramble: string;
  moves: string[];
  /** Undone moves, most recent last, so redo pops from the end. */
  redo: string[];
  revision: number;
}

export type PlaygroundAction =
  | { type: "move"; move: string }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "reset" }
  | { type: "scramble"; scramble: string }
  | { type: "puzzle"; puzzle: PlaygroundPuzzle };

export function initialPlaygroundState(puzzle: PlaygroundPuzzle): PlaygroundState {
  return { puzzle, scramble: "", moves: [], redo: [], revision: 0 };
}

export function playgroundReducer(state: PlaygroundState, action: PlaygroundAction): PlaygroundState {
  switch (action.type) {
    case "move":
      // A new move forks history, as in any editor.
      return { ...state, moves: [...state.moves, action.move], redo: [] };
    case "undo": {
      if (state.moves.length === 0) return state;
      const last = state.moves[state.moves.length - 1];
      return {
        ...state,
        moves: state.moves.slice(0, -1),
        redo: [...state.redo, last],
        revision: state.revision + 1,
      };
    }
    case "redo": {
      if (state.redo.length === 0) return state;
      const next = state.redo[state.redo.length - 1];
      return { ...state, moves: [...state.moves, next], redo: state.redo.slice(0, -1) };
    }
    case "reset":
      return { ...state, scramble: "", moves: [], redo: [], revision: state.revision + 1 };
    case "scramble":
      return { ...state, scramble: action.scramble, moves: [], redo: [], revision: state.revision + 1 };
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
