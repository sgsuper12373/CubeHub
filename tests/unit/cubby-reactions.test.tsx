import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useCompanionReactions } from "@/components/cubby/use-reactions";
import { getCubbyRenderer } from "@/components/cubby/renderer-instance";
import { CUBBY_CONTENT } from "@/content/cubby";
import { emitCompanion } from "@/lib/companion/bus";
import { pickFilledLine } from "@/lib/companion/content";
import { parseRecord } from "@/lib/companion/record";
import { DEFAULT_SETTINGS } from "@/lib/companion/settings";
import type { SvgCubbyMachine } from "@/lib/companion/svg-machine";
import { setCompanionPersister, useCompanionStore } from "@/stores/companion-store";
import { useTimerStore } from "@/stores/timer-store";

function oneShot(): string | null {
  return (getCubbyRenderer() as unknown as SvgCubbyMachine).getSnapshot().oneShot?.trigger ?? null;
}

describe("pickFilledLine", () => {
  it("leaves out lines with unfilled placeholders", () => {
    const lines = ["New PB! {time}, {delta} off.", "That's a PB: {time}!"];
    expect(pickFilledLine(lines, { time: "9.87", delta: null }, () => 0)).toBe("That's a PB: 9.87!");
    expect(pickFilledLine(lines, { time: "9.87", delta: "0.40" }, () => 0)).toBe("New PB! 9.87, 0.40 off.");
    expect(pickFilledLine(["{nope}"], {}, () => 0)).toBeNull();
  });
});

describe("Cubby's reactions", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    setCompanionPersister(() => {});
    useCompanionStore.setState({ hydrated: true, record: parseRecord(null), page: "timer", content: CUBBY_CONTENT.timer!, bubble: null, tour: null });
    useTimerStore.setState({ phase: "stopped", inspectionStartedAt: null });
    getCubbyRenderer().destroy();
  });
  afterEach(() => getCubbyRenderer().destroy());

  it("celebrates a PB with a line naming the time", () => {
    renderHook(() => useCompanionReactions());
    emitCompanion("pb", { time: "12.84", delta: "0.60", label: "single" });
    expect(oneShot()).toBe("celebrate");
    expect(useCompanionStore.getState().bubble?.text).toMatch(/12\.84/);
  });

  it("winces at a DNF without a word", () => {
    renderHook(() => useCompanionReactions());
    emitCompanion("penalty", { penalty: "dnf" });
    expect(oneShot()).toBe("wince");
    expect(useCompanionStore.getState().bubble).toBeNull();
  });

  it("says one unprompted line per page per session; the second PB only animates", () => {
    renderHook(() => useCompanionReactions());
    emitCompanion("pb", { time: "12.84", delta: null, label: "single" });
    useCompanionStore.getState().dismissBubble();
    emitCompanion("pb", { time: "12.10", delta: "0.74", label: "single" });
    expect(oneShot()).toBe("celebrate");
    expect(useCompanionStore.getState().bubble).toBeNull();
  });

  it("stays quiet while the timer runs", () => {
    renderHook(() => useCompanionReactions());
    useTimerStore.setState({ phase: "running" });
    emitCompanion("pb", { time: "12.84", delta: "0.60", label: "single" });
    expect(oneShot()).toBeNull();
    expect(useCompanionStore.getState().bubble).toBeNull();
  });

  it("respects Reactions: PBs only and Quiet", () => {
    renderHook(() => useCompanionReactions());
    useCompanionStore.setState({ record: { settings: { ...DEFAULT_SETTINGS, reactions: "pb" }, tours: {} } });
    emitCompanion("penalty", { penalty: "plus2" });
    expect(oneShot()).toBeNull();
    useCompanionStore.setState({ record: { settings: { ...DEFAULT_SETTINGS, mode: "quiet" }, tours: {} } });
    emitCompanion("pb", { time: "1", delta: null, label: "single" });
    expect(oneShot()).toBeNull();
  });

  it("looks concerned beside an error, then recovers", async () => {
    renderHook(() => useCompanionReactions());
    emitCompanion("error", { message: "Couldn't save" });
    expect((getCubbyRenderer() as unknown as SvgCubbyMachine).getSnapshot().inputs.mood).toBe("concerned");
  });
});
