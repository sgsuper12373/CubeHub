import { act, render, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BldStage, FINISH_CHEER_MS, FINISH_STAGE_MS, MEMO_POSE_MS, useBldStage } from "@/components/cubby/bld-stage";
import { getCubbyRenderer } from "@/components/cubby/renderer-instance";
import { CUBBY_CONTENT } from "@/content/cubby";
import { emitCompanion } from "@/lib/companion/bus";
import { parseRecord } from "@/lib/companion/record";
import { DEFAULT_SETTINGS } from "@/lib/companion/settings";
import type { SvgCubbyMachine } from "@/lib/companion/svg-machine";
import { DEFAULT_TIMER_SETTINGS } from "@/lib/timer/types";
import { setCompanionPersister, useCompanionStore } from "@/stores/companion-store";
import { useTimerStore } from "@/stores/timer-store";

const machine = () => getCubbyRenderer() as unknown as SvgCubbyMachine;

beforeEach(() => {
  vi.useFakeTimers();
  sessionStorage.clear();
  setCompanionPersister(() => {});
  useCompanionStore.setState({ hydrated: true, record: parseRecord(null), page: "timer", content: CUBBY_CONTENT.timer!, bubble: null, tour: null, bldPhase: "off" });
  useTimerStore.setState({ phase: "running", inspectionStartedAt: null, settings: { ...DEFAULT_TIMER_SETTINGS, memoSplit: false } });
  getCubbyRenderer().destroy();
  getCubbyRenderer().setInput("bldPhase", "off");
});
afterEach(() => {
  vi.useRealTimers();
  getCubbyRenderer().destroy();
});

describe("Cubby's blindfold solve", () => {
  it("plays mid-solve: memo, then the blindfold after a short memo pose without the split", () => {
    renderHook(() => useBldStage());
    act(() => emitCompanion("bld:phase", { phase: "memo" }));
    expect(useCompanionStore.getState().bldPhase).toBe("memo");
    expect(machine().getSnapshot().inputs.bldPhase).toBe("memo");
    act(() => vi.advanceTimersByTime(MEMO_POSE_MS));
    expect(machine().getSnapshot().inputs.bldPhase).toBe("execute");
  });

  it("with the split, the blindfold waits for the key press", () => {
    useTimerStore.setState({ settings: { ...DEFAULT_TIMER_SETTINGS, memoSplit: true } });
    renderHook(() => useBldStage());
    act(() => emitCompanion("bld:phase", { phase: "memo" }));
    act(() => vi.advanceTimersByTime(MEMO_POSE_MS * 4));
    expect(machine().getSnapshot().inputs.bldPhase).toBe("memo");
    act(() => emitCompanion("bld:phase", { phase: "execute" }));
    expect(machine().getSnapshot().inputs.bldPhase).toBe("execute");
  });

  it("finishes with a cheer, then leaves the stage", () => {
    renderHook(() => useBldStage());
    act(() => emitCompanion("bld:phase", { phase: "finish" }));
    act(() => vi.advanceTimersByTime(FINISH_CHEER_MS));
    expect(machine().getSnapshot().oneShot?.trigger).toBe("celebrate");
    act(() => vi.advanceTimersByTime(FINISH_STAGE_MS));
    expect(useCompanionStore.getState().bldPhase).toBe("off");
  });

  it("a DNF gets a shrug and one kind line instead", () => {
    useTimerStore.setState({ phase: "stopped" });
    renderHook(() => useBldStage());
    act(() => emitCompanion("bld:phase", { phase: "finish" }));
    act(() => emitCompanion("penalty", { penalty: "dnf" }));
    expect(machine().getSnapshot().oneShot?.trigger).toBe("shrug");
    expect(useCompanionStore.getState().bubble?.text).toMatch(/Next one\./);
    act(() => vi.advanceTimersByTime(FINISH_CHEER_MS));
    expect(machine().getSnapshot().oneShot?.trigger).not.toBe("celebrate");
  });

  it("stays off with the BLD animation switched off, or with Cubby off", () => {
    renderHook(() => useBldStage());
    useCompanionStore.setState({ record: { settings: { ...DEFAULT_SETTINGS, bldAnimation: false }, tours: {} } });
    act(() => emitCompanion("bld:phase", { phase: "memo" }));
    expect(useCompanionStore.getState().bldPhase).toBe("off");
    useCompanionStore.setState({ record: { settings: { ...DEFAULT_SETTINGS, mode: "off" }, tours: {} } });
    act(() => emitCompanion("bld:phase", { phase: "memo" }));
    expect(useCompanionStore.getState().bldPhase).toBe("off");
  });

  it("the stage is decorative and sits in the corner", () => {
    renderHook(() => useBldStage());
    const { container } = render(<BldStage />);
    expect(container.querySelector("[data-cubby-bld]")).toBeNull();
    act(() => emitCompanion("bld:phase", { phase: "execute" }));
    const stage = container.querySelector("[data-cubby-bld]")!;
    expect(stage.getAttribute("aria-hidden")).toBe("true");
    expect(stage.className).toContain("pointer-events-none");
    // Not hidden by Focus mode: it's the one thing allowed while solving.
    expect(stage.hasAttribute("data-focus-hide")).toBe(false);
  });
});
