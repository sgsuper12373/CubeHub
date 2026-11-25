import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isBldEvent, timerEvent } from "@/lib/timer/events";
import { MISSTOP_LIMIT_MS } from "@/lib/timer/misfire";
import { memoField } from "@/lib/timer/memo-column";
import { DEFAULT_TIMER_SETTINGS } from "@/lib/timer/types";
import { STOP_DEBOUNCE_MS, useTimerStore } from "@/stores/timer-store";

function reset(puzzle: "333" | "333bf", memoSplit: boolean, inspection: "off" | "15s" = "15s") {
  useTimerStore.setState({
    phase: "idle",
    puzzle,
    settings: { ...DEFAULT_TIMER_SETTINGS, inspectionMode: inspection, memoSplit },
    holdStartedAt: null,
    inspectionStartedAt: null,
    solveStartedAt: null,
    stoppedAt: null,
    finalElapsedMs: null,
    memoEndedAt: null,
    finalMemoMs: null,
    inspectionPenalty: "none",
  });
}

/** Hold, wait past the hold time, release: the solve starts at `at`. */
function start(at: number) {
  const s = useTimerStore.getState();
  s.press(at - 400);
  s.ready();
  useTimerStore.getState().release(at);
}

describe("3x3 BLD", () => {
  it("is an event with 3x3 scrambles and a BLD flag", () => {
    expect(isBldEvent("333bf")).toBe(true);
    expect(isBldEvent("333")).toBe(false);
    expect(timerEvent("333bf")).toMatchObject({ label: "3x3 BLD", cubingEvent: "333bf", twisty: "3x3x3" });
    expect(MISSTOP_LIMIT_MS["333bf"]).toBe(8000);
  });

  it("has no inspection, even with WCA inspection on", () => {
    reset("333bf", false, "15s");
    useTimerStore.getState().press(1000);
    expect(useTimerStore.getState().phase).toBe("holding");
    reset("333", false, "15s");
    useTimerStore.getState().press(1000);
    expect(useTimerStore.getState().phase).toBe("inspecting");
  });

  it("with the memo split, the first stop ends memo and the second ends the solve", () => {
    reset("333bf", true);
    start(10_000);
    expect(useTimerStore.getState().phase).toBe("running");
    useTimerStore.getState().stop(33_410);
    expect(useTimerStore.getState()).toMatchObject({ phase: "running", memoEndedAt: 33_410 });
    useTimerStore.getState().stop(74_530);
    expect(useTimerStore.getState()).toMatchObject({ phase: "stopped", finalElapsedMs: 64_530, finalMemoMs: 23_410, memoEndedAt: null });
  });

  it("ignores a bounce right after the split", () => {
    reset("333bf", true);
    start(0);
    useTimerStore.getState().stop(20_000);
    useTimerStore.getState().stop(20_000 + STOP_DEBOUNCE_MS - 1);
    expect(useTimerStore.getState().phase).toBe("running");
  });

  it("without the split, one stop ends the solve and there's no memo", () => {
    reset("333bf", false);
    start(0);
    useTimerStore.getState().stop(50_000);
    expect(useTimerStore.getState()).toMatchObject({ phase: "stopped", finalElapsedMs: 50_000, finalMemoMs: null });
  });

  it("other events never split", () => {
    reset("333", true, "off");
    start(0);
    useTimerStore.getState().stop(12_000);
    expect(useTimerStore.getState()).toMatchObject({ phase: "stopped", finalMemoMs: null });
  });

  it("Esc mid-solve forgets the split", () => {
    reset("333bf", true);
    start(0);
    useTimerStore.getState().stop(10_000);
    useTimerStore.getState().cancel();
    expect(useTimerStore.getState().memoEndedAt).toBeNull();
  });

  it("writes memo_ms only when the column exists and the solve has a memo", () => {
    expect(memoField(23_410, true)).toEqual({ memo_ms: 23_410 });
    expect(memoField(23_410, false)).toEqual({});
    expect(memoField(undefined, true)).toEqual({});
  });
});

describe("the memo column probe", () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.doUnmock("@/lib/supabase/client"));

  async function probeWith(error: unknown) {
    const limit = vi.fn().mockResolvedValue({ data: [], error });
    vi.doMock("@/lib/supabase/client", () => ({ createClient: () => ({ from: () => ({ select: () => ({ limit }) }) }) }));
    const mod = await import("@/lib/timer/memo-column");
    const first = await mod.hasMemoColumn();
    await mod.hasMemoColumn();
    return { first, calls: limit.mock.calls.length };
  }

  it("is true once the column exists, asked once per page view", async () => {
    expect(await probeWith(null)).toEqual({ first: true, calls: 1 });
  });

  it("is false before the migration", async () => {
    expect((await probeWith({ code: "42703", message: "column solves.memo_ms does not exist" })).first).toBe(false);
  });
});
