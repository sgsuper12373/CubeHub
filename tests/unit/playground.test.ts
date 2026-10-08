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
import { caseSetupFor, parseAlgWith, simplifyWith } from "@/lib/playground/alg-input";
import {
  bindKey,
  chordLabel,
  chordProblem,
  DEFAULT_BINDINGS,
  keymapRows,
  keysForMove,
  moveForKey,
  movesFor,
  sameBindings,
  sanitizeBindings,
  unbindKey,
} from "@/lib/playground/keymap";
import { armPractice, currentPractice, IDLE, INSPECTION_MS, practiceAfterTurn } from "@/lib/playground/practice";
import { DEFAULT_PREFS, sanitizePrefs } from "@/lib/playground/prefs";
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

  it("a case keeps its alg; load starts from a shared setup and moves", () => {
    const c = run([{ type: "move", move: "R" }, { type: "case", setup: "z2 U", caseMoves: ["U'"] }]);
    expect(c).toMatchObject({ scramble: "z2 U", setupKind: "case", caseMoves: ["U'"], moves: [] });
    const l = run([{ type: "load", setup: "F", moves: ["R", "U"] }]);
    expect(l).toMatchObject({ scramble: "F", setupKind: "link", moves: ["R", "U"], times: [null, null] });
  });

  it("several moves append at once and keep times in step with moves", () => {
    const s = run([
      { type: "move", move: "R", t: 5 },
      { type: "moves", moves: ["U", "F"] },
      { type: "undo" },
    ]);
    expect(s.moves).toEqual(["R", "U"]);
    expect(s.times).toEqual([5, null]);
    expect(s.revision).toBe(1);
  });

  it("counts turns but not whole-cube rotations", () => {
    expect(["x", "y'", "z2", "Rv", "Uv'"].every(isRotation)).toBe(true);
    expect(["R", "M'", "r", "2R", "U2"].some(isRotation)).toBe(false);
    expect(moveCount(["R", "y", "U", "x'", "M"])).toBe(3);
  });
});

describe("playground key map", () => {
  const key = (code: string, shiftKey = false) => ({ code, shiftKey });

  it("defaults to notation keys: the key is the move, Shift makes it prime", () => {
    expect(moveForKey(key("KeyR"), "333")).toBe("R");
    expect(moveForKey(key("KeyR", true), "333")).toBe("R'");
    expect(moveForKey(key("KeyU", true), "333")).toBe("U'");
    expect(moveForKey(key("KeyM"), "333")).toBe("M");
    expect(moveForKey(key("KeyY"), "333")).toBe("y");
    expect(moveForKey(key("KeyI"), "333")).toBeNull();
  });

  it("a custom binding replaces what the key did before", () => {
    let b = bindKey(DEFAULT_BINDINGS, "KeyI", "R");
    b = bindKey(b, "KeyR", "l'");
    expect(moveForKey(key("KeyI"), "333", b)).toBe("R");
    expect(moveForKey(key("KeyR"), "333", b)).toBe("l'");
    expect(keymapRows("333", b).find((r) => r.move === "R")?.keys).toEqual(["KeyI"]);
    b = unbindKey(b, "KeyI");
    expect(moveForKey(key("KeyI"), "333", b)).toBeNull();
    expect(sameBindings(DEFAULT_BINDINGS, { ...DEFAULT_BINDINGS })).toBe(true);
    expect(sameBindings(DEFAULT_BINDINGS, b)).toBe(false);
  });

  it("never lets Space, Escape, ? or bare modifiers be bound", () => {
    expect(chordProblem(key("Space"))).not.toBeNull();
    expect(chordProblem(key("Escape"))).not.toBeNull();
    expect(chordProblem(key("Slash", true))).not.toBeNull();
    expect(chordProblem(key("ShiftLeft"))).not.toBeNull();
    expect(chordProblem(key("Semicolon"))).toBeNull();
    expect(chordProblem(key("Digit5", true))).toBeNull();
    expect(moveForKey(key("Space"), "333")).toBeNull();
  });

  it("drops slice and wide bindings on a 2x2", () => {
    const b = bindKey(DEFAULT_BINDINGS, "KeyU", "r");
    expect(moveForKey(key("KeyU"), "333", b)).toBe("r");
    expect(moveForKey(key("KeyU"), "222", b)).toBeNull();
    expect(moveForKey(key("KeyM"), "222")).toBeNull();
    expect(moveForKey(key("KeyR"), "222")).toBe("R");
    expect(movesFor("222")).not.toContain("M");
    expect(movesFor("333")).toContain("u2");
  });

  it("keysForMove finds the press for a move, twice for an unbound double", () => {
    expect(keysForMove("R'", "333")).toEqual([{ code: "KeyR", shiftKey: true }]);
    expect(keysForMove("U2", "333")).toEqual([{ code: "KeyU" }, { code: "KeyU" }]);
    expect(keysForMove("U2", "333", bindKey(DEFAULT_BINDINGS, "Digit2", "U2"))).toEqual([{ code: "Digit2" }]);
    expect(keysForMove("M", "222")).toBeNull();
  });

  it("stored bindings keep only valid chord → move pairs", () => {
    expect(sanitizeBindings({ KeyI: "R", Space: "U", KeyJ: "Q", "Shift+Digit1": "x2" })).toEqual({
      KeyI: "R",
      "Shift+Digit1": "x2",
    });
    expect(sanitizeBindings("nope")).toBeNull();
    expect(chordLabel("Shift+KeyR")).toBe("⇧R");
  });

  it("every bindable move is legal on the puzzle it is offered for", async () => {
    for (const [id, puzzle] of [["333", cube3x3x3], ["222", cube2x2x2]] as const) {
      const kpuzzle = await puzzle.kpuzzle();
      for (const move of movesFor(id)) {
        expect(isValidMoveWith(kpuzzle, move), `${move} on ${id}`).toBe(true);
      }
    }
  });
});

describe("playground alg input", () => {
  const TPERM = "R U R' U' R' F R2 U' R' U' R U R' F'";

  it("parses an alg into moves, unrolling commutators and repeats", async () => {
    const k3 = await cube3x3x3.kpuzzle();
    expect(parseAlgWith(Alg, k3, "[R, U] (R U)2")).toEqual({
      ok: true,
      moves: ["R", "U", "R'", "U'", "R", "U", "R", "U"],
    });
  });

  it("rejects garbage, empty input, illegal moves and huge expansions", async () => {
    const k3 = await cube3x3x3.kpuzzle();
    const k2 = await cube2x2x2.kpuzzle();
    expect(parseAlgWith(Alg, k3, "R U %").ok).toBe(false);
    expect(parseAlgWith(Alg, k3, "   ").ok).toBe(false);
    expect(parseAlgWith(Alg, k2, "R M").ok).toBe(false);
    expect(parseAlgWith(Alg, k3, "(R U)1000000").ok).toBe(false);
  });

  it("a case set up from an alg is solved by that alg", async () => {
    const k3 = await cube3x3x3.kpuzzle();
    const parsed = parseAlgWith(Alg, k3, TPERM);
    if (!parsed.ok) throw new Error(parsed.error);
    const setup = caseSetupFor(Alg, parsed.moves);
    expect(setup.startsWith("z2 ")).toBe(true);
    expect(isSolvedWith(k3, setup, [])).toBe(false);
    expect(isSolvedWith(k3, setup, parsed.moves)).toBe(true);
  });

  it("simplifies a move history for display", () => {
    expect(simplifyWith(Alg, ["R", "R", "U", "U'", "F"])).toBe("R2 F");
    expect(simplifyWith(Alg, [])).toBe("");
  });
});

describe("playground practice", () => {
  const SCRAMBLE = "R U";

  it("rotations during inspection don't start the clock; the first turn does", () => {
    let p = armPractice(SCRAMBLE, true, 1000);
    expect(p.kind).toBe("inspecting");
    p = practiceAfterTurn(p, "y", 2000, ["y"], false);
    expect(p.kind).toBe("inspecting");
    p = practiceAfterTurn(p, "U'", 3000, ["y", "U'"], false);
    expect(p).toMatchObject({ kind: "running", start: 3000 });
    p = practiceAfterTurn(p, "R'", 5000, ["y", "U'", "R'"], true);
    expect(p).toMatchObject({ kind: "done", result: { ms: 2000, moves: 2, tps: 1 } });
  });

  it("past 15s of inspection the clock counts from the 15s mark", () => {
    const p = practiceAfterTurn(armPractice(SCRAMBLE, true, 0), "R", 20_000, ["R"], false);
    expect(p).toMatchObject({ kind: "running", start: INSPECTION_MS });
  });

  it("without inspection it waits for the first turn", () => {
    const p = armPractice(SCRAMBLE, false, 0);
    expect(p.kind).toBe("ready");
    expect(practiceAfterTurn(p, "R", 50, ["R"], false)).toMatchObject({ kind: "running", start: 50 });
  });

  it("a new scramble makes the old phase stale", () => {
    const p = armPractice(SCRAMBLE, false, 0);
    expect(currentPractice(p, SCRAMBLE)).toBe(p);
    expect(currentPractice(p, "F2")).toEqual(IDLE);
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

describe("playground prefs", () => {
  it("keeps valid fields and falls back for the rest", () => {
    expect(sanitizePrefs(null)).toEqual(DEFAULT_PREFS);
    expect(sanitizePrefs({ keyBindings: { KeyI: "R" }, animationSpeed: 8, hintStickers: true, inspection: false })).toEqual({
      keyBindings: { KeyI: "R" },
      animationSpeed: 8,
      hintStickers: true,
      inspection: false,
    });
    expect(sanitizePrefs({ keyBindings: "x", animationSpeed: 4, hintStickers: "yes" })).toEqual(DEFAULT_PREFS);
  });
});
