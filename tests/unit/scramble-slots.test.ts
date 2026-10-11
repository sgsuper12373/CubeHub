import { Alg } from "cubing/alg";
import { beforeEach, describe, expect, it } from "vitest";

import { checkScrambleWith } from "@/lib/timer/custom-scramble";
import { useTimerStore } from "@/stores/timer-store";

const store = () => useTimerStore.getState();

/** Idle on scramble A, with B prefetched. */
function setUp() {
  useTimerStore.setState({
    phase: "idle",
    scramble: { alg: "A", next: "B", generating: false, custom: false, prev: null },
  });
}

describe("scramble slots", () => {
  beforeEach(setUp);

  it("skip remembers the skipped scramble as previous", () => {
    store().skipScramble();
    expect(store().scramble).toMatchObject({ alg: "B", next: null, prev: { alg: "A", custom: false } });
  });

  it("previous brings it back and keeps the unused random one for later", () => {
    store().skipScramble();
    store().previousScramble();
    expect(store().scramble).toMatchObject({ alg: "A", next: "B", prev: null });
  });

  it("previous after a solve repeats the scramble just solved", () => {
    useTimerStore.setState({ phase: "stopped", stoppedAt: 0 });
    store().previousScramble();
    expect(store().phase).toBe("idle");
    expect(store().scramble.alg).toBe("A");
  });

  it("does nothing with no previous, or mid-solve", () => {
    store().previousScramble();
    expect(store().scramble.alg).toBe("A");
    store().skipScramble();
    useTimerStore.setState({ phase: "running" });
    store().previousScramble();
    expect(store().scramble.alg).toBe("B");
  });

  it("a custom scramble is marked, and the random one waits in next", () => {
    store().setCustomScramble("R U R'");
    expect(store().scramble).toMatchObject({
      alg: "R U R'",
      custom: true,
      next: "A",
      prev: { alg: "A", custom: false },
    });
    // Moving on goes back to random scrambles.
    useTimerStore.setState({ phase: "stopped", stoppedAt: 0 });
    store().advanceScramble();
    expect(store().scramble).toMatchObject({ alg: "A", custom: false, prev: { alg: "R U R'", custom: true } });
  });

  it("previous restores a custom scramble as custom", () => {
    store().setCustomScramble("F2");
    store().skipScramble();
    store().previousScramble();
    expect(store().scramble).toMatchObject({ alg: "F2", custom: true });
  });

  it("switching puzzle clears every slot", () => {
    store().skipScramble();
    store().setPuzzle("222");
    expect(store().scramble).toMatchObject({ alg: null, next: null, prev: null, custom: false });
  });
});

describe("checkScrambleWith", () => {
  it("tidies spacing and typographic quotes", () => {
    expect(checkScrambleWith(Alg, "  R  U’   R′\tU2 ")).toEqual({ ok: true, scramble: "R U' R' U2" });
  });

  it("keeps Megaminx line breaks and accepts its notation", () => {
    expect(checkScrambleWith(Alg, "R++ D-- U\n\nR-- D++ U'")).toEqual({ ok: true, scramble: "R++ D-- U\nR-- D++ U'" });
  });

  it("accepts wide moves and Pyraminx tips", () => {
    expect(checkScrambleWith(Alg, "Rw2 Fw' u l' b").ok).toBe(true);
  });

  it("rejects empty, junk and very long input", () => {
    expect(checkScrambleWith(Alg, "   ").ok).toBe(false);
    expect(checkScrambleWith(Alg, "hello world!").ok).toBe(false);
    expect(checkScrambleWith(Alg, "R ".repeat(300)).ok).toBe(false);
  });
});
