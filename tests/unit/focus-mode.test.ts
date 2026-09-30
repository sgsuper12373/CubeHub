import { beforeEach, describe, expect, it } from "vitest";

import { isFocusHidden, loadFocusMode, saveFocusMode } from "@/lib/timer/focus";
import { useLayoutStore } from "@/stores/layout-store";

describe("isFocusHidden", () => {
  it("hides once the solve is under way", () => {
    expect(isFocusHidden("ready", false)).toBe(true);
    expect(isFocusHidden("running", false)).toBe(true);
    expect(isFocusHidden("inspecting", true)).toBe(true);
  });

  it("stays visible at rest and after the solve", () => {
    expect(isFocusHidden("idle", false)).toBe(false);
    expect(isFocusHidden("stopped", false)).toBe(false);
  });

  it("ignores a press-and-hold from idle (releasing early mustn't flash the UI)", () => {
    expect(isFocusHidden("holding", false)).toBe(false);
  });

  it("keeps hiding through a hold during inspection", () => {
    expect(isFocusHidden("holding", true)).toBe(true);
  });
});

describe("Focus Mode persistence", () => {
  beforeEach(() => localStorage.clear());

  it("defaults to off and round-trips through localStorage", () => {
    expect(loadFocusMode()).toBe(false);
    saveFocusMode(true);
    expect(loadFocusMode()).toBe(true);
  });

  it("is saved by the layout store and restored on hydrate", () => {
    useLayoutStore.getState().setFocusMode(true);
    useLayoutStore.setState({ isFocusMode: false });
    useLayoutStore.getState().hydrate();
    expect(useLayoutStore.getState().isFocusMode).toBe(true);
  });
});
