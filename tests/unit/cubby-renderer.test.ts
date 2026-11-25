import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_INPUTS, isValidInput, TRIGGERS, type CubbyEvent } from "@/lib/companion/renderer";
import { SvgCubbyMachine } from "@/lib/companion/svg-machine";
import { EXPRESSIONS, INITIAL_STATE, poseOf, reduce, TRIGGER_MS, type SvgState } from "@/lib/companion/svg-state";

function withInputs(inputs: Partial<SvgState["inputs"]>, oneShot: SvgState["oneShot"] = null): SvgState {
  return { inputs: { ...DEFAULT_INPUTS, ...inputs }, oneShot };
}

describe("isValidInput", () => {
  it("accepts the spec's values and rejects the rest", () => {
    expect(isValidInput("mood", "happy")).toBe(true);
    expect(isValidInput("mood", "angry")).toBe(false);
    expect(isValidInput("isTalking", true)).toBe(true);
    expect(isValidInput("isTalking", "yes")).toBe(false);
    expect(isValidInput("pointAt", null)).toBe(true);
    expect(isValidInput("pointAt", "left")).toBe(true);
    expect(isValidInput("pointAt", "behind")).toBe(false);
    expect(isValidInput("bldPhase", "memo")).toBe(true);
    expect(isValidInput("theme", "")).toBe(false);
    expect(isValidInput("volume", 3)).toBe(false);
  });
});

describe("reduce", () => {
  it("sets valid inputs and ignores invalid ones", () => {
    const s = reduce(INITIAL_STATE, { type: "setInput", name: "mood", value: "sleepy" });
    expect(s.inputs.mood).toBe("sleepy");
    expect(reduce(s, { type: "setInput", name: "mood", value: "furious" })).toBe(s);
  });

  it("returns the same state when nothing changes", () => {
    expect(reduce(INITIAL_STATE, { type: "setInput", name: "mood", value: "idle" })).toBe(INITIAL_STATE);
  });

  it("a one-shot ends only by its own id", () => {
    const a = reduce(INITIAL_STATE, { type: "fire", trigger: "wave", id: 1 });
    const b = reduce(a, { type: "fire", trigger: "celebrate", id: 2 });
    expect(reduce(b, { type: "end", id: 1 })).toBe(b);
    expect(reduce(b, { type: "end", id: 2 }).oneShot).toBeNull();
  });
});

describe("poseOf", () => {
  it("idle breathes with the mood's face", () => {
    expect(poseOf(INITIAL_STATE)).toMatchObject({ expression: "idle", arms: "rest", body: "breathe", blindfold: false });
    expect(poseOf(withInputs({ mood: "sleepy" })).expression).toBe("sleepy");
  });

  it("talking flaps the mouth and pointing raises an arm towards the target", () => {
    expect(poseOf(withInputs({ isTalking: true })).expression).toBe("talking");
    expect(poseOf(withInputs({ pointAt: "left" }))).toMatchObject({ arms: "point", look: "left" });
  });

  it("thinking looks up, focused", () => {
    expect(poseOf(withInputs({ isThinking: true }))).toMatchObject({ expression: "focused", look: "up" });
  });

  it("BLD memo holds the cube and scans; execution is blindfolded", () => {
    expect(poseOf(withInputs({ bldPhase: "memo" }))).toMatchObject({ holdingCube: true, memo: true, blindfold: false });
    expect(poseOf(withInputs({ bldPhase: "execute" }))).toMatchObject({ holdingCube: true, blindfold: true });
  });

  it("one-shots win while they play", () => {
    expect(poseOf(withInputs({}, { trigger: "celebrate", id: 1 }))).toMatchObject({ expression: "grin", arms: "up", body: "spin" });
    expect(poseOf(withInputs({}, { trigger: "wince", id: 1 }))).toMatchObject({ expression: "concerned", body: "flinch" });
    expect(poseOf(withInputs({}, { trigger: "thumbsUp", id: 1 })).arms).toBe("thumbsUp");
    expect(poseOf(withInputs({ bldPhase: "finish" }, { trigger: "shrug", id: 1 }))).toMatchObject({ arms: "shrug", holdingCube: false });
    expect(poseOf(withInputs({ bldPhase: "execute" }, { trigger: "celebrate", id: 1 })).blindfold).toBe(false);
  });

  it("only draws expressions the art has", () => {
    const states: SvgState[] = [INITIAL_STATE, withInputs({ isTalking: true }), withInputs({ isThinking: true })];
    for (const t of TRIGGERS) states.push(withInputs({}, { trigger: t, id: 1 }));
    for (const s of states) expect(EXPRESSIONS).toContain(poseOf(s).expression);
  });
});

describe("SvgCubbyMachine", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("plays a trigger and falls back to idle, with start and end events", () => {
    const m = new SvgCubbyMachine();
    const events: CubbyEvent[] = [];
    m.onEvent((e) => events.push(e));
    m.fire("wave");
    expect(m.getSnapshot().oneShot?.trigger).toBe("wave");
    vi.advanceTimersByTime(TRIGGER_MS.wave);
    expect(m.getSnapshot().oneShot).toBeNull();
    expect(events).toEqual([
      { type: "triggerStart", trigger: "wave" },
      { type: "triggerEnd", trigger: "wave" },
    ]);
  });

  it("a new trigger ends the playing one first", () => {
    const m = new SvgCubbyMachine();
    const events: CubbyEvent[] = [];
    m.onEvent((e) => events.push(e));
    m.fire("wave");
    m.fire("celebrate");
    expect(events.map((e) => `${e.type}:${e.trigger}`)).toEqual(["triggerStart:wave", "triggerEnd:wave", "triggerStart:celebrate"]);
    vi.advanceTimersByTime(TRIGGER_MS.celebrate);
    expect(m.getSnapshot().oneShot).toBeNull();
  });

  it("notifies subscribers on change only", () => {
    const m = new SvgCubbyMachine();
    const listener = vi.fn();
    m.subscribe(listener);
    m.setInput("mood", "happy");
    m.setInput("mood", "happy");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("destroy stops the one-shot and event listeners, and is safe to repeat", () => {
    const m = new SvgCubbyMachine();
    const onEvent = vi.fn();
    m.onEvent(onEvent);
    m.fire("celebrate");
    onEvent.mockClear();
    m.destroy();
    m.destroy();
    expect(m.getSnapshot().oneShot).toBeNull();
    vi.advanceTimersByTime(5000);
    m.fire("wave");
    expect(onEvent).not.toHaveBeenCalled();
  });

  it("still works after destroy (StrictMode runs cleanups early)", () => {
    const m = new SvgCubbyMachine();
    m.destroy();
    m.setInput("mood", "happy");
    expect(m.getSnapshot().inputs.mood).toBe("happy");
  });
});
