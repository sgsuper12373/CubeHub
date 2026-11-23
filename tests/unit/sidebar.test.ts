import { describe, expect, it } from "vitest";

import {
  parseSidebarCookie,
  serializeSidebarCookie,
  sidebarGroupFor,
  sidebarMode,
  toggleHidden,
  toggleRail,
} from "@/lib/sidebar";

describe("sidebar groups", () => {
  it("puts the timer, the drill and the playground in their own groups", () => {
    expect(sidebarGroupFor("/timer")).toBe("timer");
    expect(sidebarGroupFor("/learn/333/drill")).toBe("practice");
    expect(sidebarGroupFor("/learn/222/drill")).toBe("practice");
    expect(sidebarGroupFor("/playground")).toBe("practice");
    expect(sidebarGroupFor("/learn/333/pll")).toBe("browse");
    expect(sidebarGroupFor("/home")).toBe("browse");
    expect(sidebarGroupFor("/timers")).toBe("browse");
  });

  it("defaults: Rail on timer and practice, auto (Rail md, Expanded lg) elsewhere", () => {
    expect(sidebarMode({}, "timer")).toBe("rail");
    expect(sidebarMode({}, "practice")).toBe("rail");
    expect(sidebarMode({}, "browse")).toBe("auto");
  });

  it("an explicit choice wins over the default, per group", () => {
    const prefs = { timer: "hidden", browse: "rail" } as const;
    expect(sidebarMode(prefs, "timer")).toBe("hidden");
    expect(sidebarMode(prefs, "browse")).toBe("rail");
    expect(sidebarMode(prefs, "practice")).toBe("rail");
  });
});

describe("sidebar cookie", () => {
  it("round-trips", () => {
    const prefs = { timer: "rail", practice: "hidden", browse: "expanded" } as const;
    expect(parseSidebarCookie(serializeSidebarCookie(prefs))).toEqual(prefs);
  });

  it("reads the plan's plain JSON form too", () => {
    expect(parseSidebarCookie('{"timer":"rail","browse":"expanded"}')).toEqual({ timer: "rail", browse: "expanded" });
  });

  it("ignores junk", () => {
    expect(parseSidebarCookie(undefined)).toEqual({});
    expect(parseSidebarCookie("not json")).toEqual({});
    expect(parseSidebarCookie("%E0%A4%A")).toEqual({});
    expect(parseSidebarCookie('{"timer":"wide","nope":"rail"}')).toEqual({});
    expect(parseSidebarCookie("[1,2]")).toEqual({});
  });
});

describe("sidebar shortcuts", () => {
  it("Ctrl+B hides, then restores what was showing", () => {
    expect(toggleHidden("rail", "expanded")).toBe("hidden");
    expect(toggleHidden("auto", "expanded")).toBe("hidden");
    expect(toggleHidden("hidden", "rail")).toBe("rail");
  });

  it("Ctrl+\\\\ switches Expanded and Rail", () => {
    expect(toggleRail("expanded")).toBe("rail");
    expect(toggleRail("rail")).toBe("expanded");
    expect(toggleRail("hidden")).toBe("expanded");
  });
});
