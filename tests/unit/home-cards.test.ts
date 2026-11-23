import { describe, expect, it } from "vitest";

import {
  continueButtonLabel,
  detectVisitor,
  drillButtonLabel,
  greeting,
  greetingName,
  homeCards,
  isCardOn,
  parseHomeLayout,
  setCardOn,
} from "@/lib/home/cards";

describe("visitor detection", () => {
  it("tells guests and members apart, new and returning", () => {
    expect(detectVisitor({ signedIn: false, solveCount: 0 })).toBe("guest-new");
    expect(detectVisitor({ signedIn: false, solveCount: 3 })).toBe("guest-returning");
    expect(detectVisitor({ signedIn: true, solveCount: 19 })).toBe("member-new");
    expect(detectVisitor({ signedIn: true, solveCount: 20 })).toBe("member");
  });
});

describe("home cards", () => {
  it("a first-time guest gets the welcome card, Learn and Playground, and no social cards", () => {
    const { main, rail } = homeCards("guest-new", null);
    expect(main).toEqual(["welcome", "learning", "playground", "tip"]);
    expect(rail).toEqual(["whatsnew"]);
  });

  it("a regular member gets the default set, streak off", () => {
    const { main, rail } = homeCards("member", null);
    expect(main).toEqual(["stats", "learning", "drill", "tip"]);
    expect(rail).toEqual(["friends", "clubs", "whatsnew"]);
  });

  it("the welcome card hides itself once its steps are done", () => {
    expect(homeCards("member-new", null, { welcomeDone: true }).main).not.toContain("welcome");
  });

  it("applies hidden and shown, ignoring unknown ids", () => {
    const layout = parseHomeLayout({ hidden: ["drill", "daily", 7], shown: ["streak", "nope"] });
    expect(layout).toEqual({ hidden: ["drill"], shown: ["streak"] });
    const { main } = homeCards("member", layout);
    expect(main).toEqual(["stats", "learning", "tip", "streak"]);
  });

  it("never shows signed-in-only cards to guests, even if a layout asks", () => {
    const { rail } = homeCards("guest-returning", { hidden: [], shown: ["friends", "clubs"] });
    expect(rail).toEqual(["whatsnew"]);
  });

  it("switching a card off and on round-trips", () => {
    let layout = setCardOn("member", null, "tip", false);
    expect(isCardOn("member", layout, "tip")).toBe(false);
    layout = setCardOn("member", layout, "streak", true);
    expect(isCardOn("member", layout, "streak")).toBe(true);
    layout = setCardOn("member", layout, "tip", true);
    expect(isCardOn("member", layout, "tip")).toBe(true);
    expect(layout).toEqual({ hidden: [], shown: ["streak"] });
  });

  it("a card switched off stays off when the visitor changes", () => {
    const layout = setCardOn("member-new", null, "drill", false);
    expect(homeCards("member", layout).main).not.toContain("drill");
  });

  it("reads JSON strings and rejects junk", () => {
    expect(parseHomeLayout('{"hidden":["tip"]}')).toEqual({ hidden: ["tip"], shown: [] });
    expect(parseHomeLayout("not json")).toBeNull();
    expect(parseHomeLayout(null)).toBeNull();
    expect(parseHomeLayout([1])).toBeNull();
  });
});

describe("greeting and quick-start labels", () => {
  it("greets by time of day and first name", () => {
    expect(greeting("Sumit", new Date(2026, 10, 24, 8))).toBe("Good morning, Sumit");
    expect(greeting("Sumit", new Date(2026, 10, 24, 14))).toBe("Good afternoon, Sumit");
    expect(greeting("Sumit", new Date(2026, 10, 24, 21))).toBe("Good evening, Sumit");
    expect(greeting("Sumit", null)).toBe("Hi, Sumit");
    expect(greeting(null, new Date())).toBe("Welcome to CuberHub");
    expect(greetingName("Sumit Garad", "sumit_g")).toBe("Sumit");
    expect(greetingName(null, "sumit_g")).toBe("sumit_g");
  });

  it("labels the drill and learn buttons from real data", () => {
    expect(drillButtonLabel(0)).toBe("Open Drill Lab");
    expect(drillButtonLabel(1)).toBe("Drill 1 due case");
    expect(drillButtonLabel(6)).toBe("Drill 6 due cases");
    expect(continueButtonLabel("PLL")).toBe("Continue PLL");
    expect(continueButtonLabel(null)).toBe("Start learning");
  });
});
