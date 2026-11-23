import { beforeEach, describe, expect, it } from "vitest";

import {
  applyHandoffItems,
  collectHandoffItems,
  isHandoffKey,
  isHandoffMessage,
  safeNextPath,
} from "@/lib/handoff";

describe("guest data handoff helpers", () => {
  beforeEach(() => localStorage.clear());

  it("moves every cubehub key and nothing else", () => {
    expect(isHandoffKey("cubehub.timer.v1")).toBe(true);
    expect(isHandoffKey("cubehub-default-session")).toBe(true);
    expect(isHandoffKey("cubehubx")).toBe(false);
    expect(isHandoffKey("sb-abc-auth-token")).toBe(false);

    localStorage.setItem("cubehub.timer.v1", '{"solves":[]}');
    localStorage.setItem("cubehub-focus-mode", "true");
    localStorage.setItem("other", "x");
    expect(collectHandoffItems(localStorage)).toEqual({
      "cubehub.timer.v1": '{"solves":[]}',
      "cubehub-focus-mode": "true",
    });
  });

  it("never overwrites a key the app origin already has", () => {
    localStorage.setItem("cubehub.timer.v1", "app copy");
    const written = applyHandoffItems(localStorage, {
      "cubehub.timer.v1": "old copy",
      "cubehub.settings.v1": "{}",
      "not-ours": "x",
      "cubehub.bad": 42,
    });
    expect(written).toEqual(["cubehub.settings.v1"]);
    expect(localStorage.getItem("cubehub.timer.v1")).toBe("app copy");
    expect(localStorage.getItem("not-ours")).toBeNull();
    expect(localStorage.getItem("cubehub.bad")).toBeNull();
  });

  it("ignores junk payloads", () => {
    expect(applyHandoffItems(localStorage, null)).toEqual([]);
    expect(applyHandoffItems(localStorage, "cubehub.timer.v1")).toEqual([]);
  });

  it("only redirects to same-origin paths", () => {
    expect(safeNextPath("/timer?x=1")).toBe("/timer?x=1");
    expect(safeNextPath(null)).toBe("/home");
    expect(safeNextPath("https://evil.example")).toBe("/home");
    expect(safeNextPath("//evil.example")).toBe("/home");
    expect(safeNextPath("/\\evil.example")).toBe("/home");
  });

  it("recognises its own messages only", () => {
    expect(isHandoffMessage({ type: "cubehub-handoff:ready" })).toBe(true);
    expect(isHandoffMessage({ type: "something-else" })).toBe(false);
    expect(isHandoffMessage("cubehub-handoff:ready")).toBe(false);
  });
});
