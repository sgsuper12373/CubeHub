import { describe, expect, it } from "vitest";

import {
  availableCards,
  moveCard,
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

  it("a regular member gets the default set, daily first, streak off", () => {
    const { main, rail } = homeCards("member", null);
    expect(main).toEqual(["daily", "stats", "learning", "drill", "achievement", "tip"]);
    expect(rail).toEqual(["friends", "clubs", "whatsnew"]);
  });

  it("the welcome card hides itself once its steps are done", () => {
    expect(homeCards("member-new", null, { welcomeDone: true }).main).not.toContain("welcome");
  });

  it("applies hidden and shown, ignoring unknown ids", () => {
    const layout = parseHomeLayout({ hidden: ["drill", "compete", 7], shown: ["streak", "nope"] });
    expect(layout).toEqual({ hidden: ["drill"], shown: ["streak"] });
    const { main } = homeCards("member", layout);
    expect(main).toEqual(["daily", "stats", "learning", "achievement", "tip", "streak"]);
  });

  it("the daily card is on for returning guests and can be switched on by new visitors", () => {
    expect(homeCards("guest-returning", null).main[0]).toBe("daily");
    expect(homeCards("guest-new", null).main).not.toContain("daily");
    expect(availableCards("guest-new")).toContain("daily");
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

  it("moves a card up, down and before another, within its own column", () => {
    const up = moveCard("member", null, "drill", "up");
    expect(homeCards("member", up).main).toEqual(["daily", "stats", "drill", "learning", "achievement", "tip"]);
    const down = moveCard("member", up, "daily", "down");
    expect(homeCards("member", down).main).toEqual(["stats", "daily", "drill", "learning", "achievement", "tip"]);
    const dropped = moveCard("member", down, "tip", { before: "stats" });
    expect(homeCards("member", dropped).main).toEqual(["tip", "stats", "daily", "drill", "learning", "achievement"]);
    // The rail keeps its own order, and a drop onto the other column is not a move.
    expect(homeCards("member", dropped).rail).toEqual(["friends", "clubs", "whatsnew"]);
    expect(moveCard("member", dropped, "clubs", { before: "stats" })).toEqual(dropped);
  });

  it("keeps a saved order through a reload, with new cards after and the welcome card first", () => {
    const layout = parseHomeLayout({ hidden: [], shown: ["streak"], order: ["tip", "learning"] });
    expect(homeCards("member", layout).main.slice(0, 2)).toEqual(["tip", "learning"]);
    expect(homeCards("member", layout).main).toContain("streak");
    expect(homeCards("member-new", parseHomeLayout({ hidden: [], shown: [], order: ["tip"] })).main[0]).toBe("welcome");
  });
});
