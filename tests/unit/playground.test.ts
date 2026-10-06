import { describe, it, expect } from "vitest";
import { Alg } from "cubing/alg";
import { cube2x2x2, cube3x3x3 } from "cubing/puzzles";

import {
  initialPlaygroundState,
  isRotation,
  moveCount,
  playgroundReducer,
  type PlaygroundAction,
  type PlaygroundState,
} from "@/lib/playground/history";
import { KEYMAP, keymapRows, moveForKey } from "@/lib/playground/keymap";
import { isPlaygroundPuzzle } from "@/lib/playground/puzzles";
import { isSolvedWith, isValidMoveWith } from "@/lib/playground/solved";

function run(actions: PlaygroundAction[], state = initialPlaygroundState("333")): PlaygroundState {
  return actions.reduce(playgroundReducer, state);
}

describe("playground history", () => {
  it("records moves, and undo/redo walk back and forth", () => {
    const s = run([{ type: "move", move: "R" }, { type: "move", move: "U" }, { type: "undo" }]);
    expect(s.moves).toEqual(["R"]);
    expect(s.redo).toEqual(["U"]);
    expect(run([{ type: "redo" }], s).moves).toEqual(["R", "U"]);
  });

  it("a new move after undo drops the redo stack", () => {
    const s = run([{ type: "move", move: "R" }, { type: "undo" }, { type: "move", move: "F" }]);
    expect(s.moves).toEqual(["F"]);
    expect(s.redo).toEqual([]);
  });

  it("undo and redo on empty stacks change nothing", () => {
    const s = initialPlaygroundState("333");
    expect(playgroundReducer(s, { type: "undo" })).toBe(s);
    expect(playgroundReducer(s, { type: "redo" })).toBe(s);
  });

  it("bumps revision only when the cube must be redrawn, not on an append", () => {
    const start = initialPlaygroundState("333");
    expect(run([{ type: "move", move: "R" }], start).revision).toBe(start.revision);
    const undone = run([{ type: "move", move: "R" }, { type: "undo" }], start);
    expect(undone.revision).toBe(start.revision + 1);
    expect(run([{ type: "redo" }], undone).revision).toBe(undone.revision);
    expect(run([{ type: "scramble", scramble: "R U" }], start).revision).toBe(start.revision + 1);
    expect(run([{ type: "reset" }], start).revision).toBe(start.revision + 1);
  });

  it("a scramble starts a fresh attempt; reset clears the scramble too", () => {
    const s = run([{ type: "move", move: "R" }, { type: "scramble", scramble: "F2 U" }]);
    expect(s).toMatchObject({ scramble: "F2 U", moves: [], redo: [] });
    expect(run([{ type: "reset" }], s)).toMatchObject({ scramble: "", moves: [] });
  });

  it("switching puzzle starts over, but still forces a redraw", () => {
    const s = run([{ type: "move", move: "R" }, { type: "puzzle", puzzle: "222" }]);
    expect(s).toMatchObject({ puzzle: "222", moves: [], scramble: "" });
    expect(s.revision).toBeGreaterThan(0);
  });

  it("counts turns but not whole-cube rotations", () => {
    expect(["x", "y'", "z2", "Rv", "Uv'"].every(isRotation)).toBe(true);
    expect(["R", "M'", "r", "2R", "U2"].some(isRotation)).toBe(false);
    expect(moveCount(["R", "y", "U", "x'", "M"])).toBe(3);
  });
});

describe("playground key map", () => {
  it("maps csTimer's core keys", () => {
    expect(moveForKey("KeyI", "333")).toBe("R");
    expect(moveForKey("KeyK", "333")).toBe("R'");
    expect(moveForKey("KeyJ", "333")).toBe("U");
    expect(moveForKey("KeyF", "333")).toBe("U'");
    expect(moveForKey("Semicolon", "333")).toBe("y");
  });

  it("never binds Space, which belongs to the timer everywhere else", () => {
    expect(KEYMAP.Space).toBeUndefined();
    expect(moveForKey("Space", "333")).toBeNull();
  });

  it("drops slice and wide keys on a 2x2", () => {
    expect(moveForKey("Digit5", "333")).toBe("M");
    expect(moveForKey("Digit5", "222")).toBeNull();
    expect(moveForKey("KeyU", "222")).toBeNull();
    expect(moveForKey("KeyI", "222")).toBe("R");
  });

  it("every mapped move is legal on the puzzle it is offered for", async () => {
    for (const [id, puzzle] of [["333", cube3x3x3], ["222", cube2x2x2]] as const) {
      const kpuzzle = await puzzle.kpuzzle();
      for (const { move } of keymapRows(id)) {
        expect(isValidMoveWith(kpuzzle, move), `${move} on ${id}`).toBe(true);
      }
    }
  });
});

describe("playground solved check", () => {
  it("solving a scramble with its inverse reads as solved", async () => {
    const kpuzzle = await cube3x3x3.kpuzzle();
    const scramble = "R U R' F2 D L' B2 U2";
    const inverse = new Alg(scramble).invert().toString().split(" ");
    expect(isSolvedWith(kpuzzle, scramble, [])).toBe(false);
    expect(isSolvedWith(kpuzzle, scramble, inverse.slice(0, -1))).toBe(false);
    expect(isSolvedWith(kpuzzle, scramble, inverse)).toBe(true);
  });

  it("ignores how the cube is held", async () => {
    const k3 = await cube3x3x3.kpuzzle();
    expect(isSolvedWith(k3, "", ["y", "x'"])).toBe(true);
    expect(isSolvedWith(k3, "", ["M", "M'"])).toBe(true);
    const k2 = await cube2x2x2.kpuzzle();
    // On a 2x2, R L' is a whole-cube rotation.
    expect(isSolvedWith(k2, "", ["R", "L'"])).toBe(true);
    expect(isSolvedWith(k2, "", ["R"])).toBe(false);
  });

  it("rejects moves the puzzle does not have", async () => {
    const k2 = await cube2x2x2.kpuzzle();
    expect(isValidMoveWith(k2, "M")).toBe(false);
    expect(isValidMoveWith(k2, "2R")).toBe(false);
    expect(isValidMoveWith(await cube3x3x3.kpuzzle(), "2R")).toBe(true);
  });
});

describe("playground puzzle param", () => {
  it("accepts only the puzzles the playground supports", () => {
    expect(isPlaygroundPuzzle("333")).toBe(true);
    expect(isPlaygroundPuzzle("222")).toBe(true);
    expect(isPlaygroundPuzzle("444")).toBe(false);
    expect(isPlaygroundPuzzle(["333"])).toBe(false);
    expect(isPlaygroundPuzzle(undefined)).toBe(false);
  });
});
