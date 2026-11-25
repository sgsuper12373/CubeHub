import { afterEach, describe, expect, it, vi } from "vitest";

import { homeCardClick, homeCustomizeProps, trackDailyAttempt, trackHomeCardClick } from "@/lib/home/analytics";

const track = vi.hoisted(() => vi.fn());
vi.mock("@vercel/analytics", () => ({ track }));

function mount(html: string): HTMLElement {
  document.body.innerHTML = html;
  return document.body;
}

afterEach(() => {
  document.body.innerHTML = "";
  track.mockClear();
});

describe("homeCardClick", () => {
  it("names the card and the link's path, without the query", () => {
    mount(`<section data-tour="home-daily"><a href="/home/daily?day=2026-11-25"><span id="t">Leaderboard</span></a></section>`);
    expect(homeCardClick(document.getElementById("t"))).toEqual({ card: "daily", action: "/home/daily" });
  });

  it("uses a button's aria-label, else its text", () => {
    mount(`<div data-tour="home-tip"><button id="a" aria-label="Dismiss tip">×</button><button id="b">  Start
      session </button></div>`);
    expect(homeCardClick(document.getElementById("a"))).toEqual({ card: "tip", action: "Dismiss tip" });
    expect(homeCardClick(document.getElementById("b"))).toEqual({ card: "tip", action: "Start session" });
  });

  it("works for the quick-start row", () => {
    mount(`<div data-tour="home-quick-start"><a id="q" href="/timer">Start session</a></div>`);
    expect(homeCardClick(document.getElementById("q"))).toEqual({ card: "quick-start", action: "/timer" });
  });

  it("ignores clicks outside a card or not on a control", () => {
    mount(`<a id="out" href="/learn">Learn</a><div data-tour="home-stats"><p id="p">text</p></div>`);
    expect(homeCardClick(document.getElementById("out"))).toBeNull();
    expect(homeCardClick(document.getElementById("p"))).toBeNull();
    expect(homeCardClick(null)).toBeNull();
  });

  it("ignores data-tour targets that aren't Home's", () => {
    mount(`<nav data-tour="sidebar"><a id="s" href="/timer">Timer</a></nav>`);
    expect(homeCardClick(document.getElementById("s"))).toBeNull();
  });

  it("sends the event only for card clicks", () => {
    mount(`<div data-tour="home-stats"><a id="s" href="/stats">See all</a></div><p id="x">x</p>`);
    trackHomeCardClick(document.getElementById("x"));
    expect(track).not.toHaveBeenCalled();
    trackHomeCardClick(document.getElementById("s"));
    expect(track).toHaveBeenCalledWith("home_card_click", { card: "stats", action: "/stats" });
  });
});

describe("homeCustomizeProps", () => {
  it("turns a layout into comma lists", () => {
    expect(homeCustomizeProps({ hidden: ["tip", "streak"], shown: ["achievement"] })).toEqual({ hidden: "tip,streak", shown: "achievement" });
    expect(homeCustomizeProps({ hidden: [], shown: [] })).toEqual({ hidden: "none", shown: "none" });
  });

  it("marks a reset as default", () => {
    expect(homeCustomizeProps(null)).toEqual({ hidden: "default", shown: "default" });
  });
});

describe("trackDailyAttempt", () => {
  it("reports solve, plus2 or dnf", () => {
    trackDailyAttempt("none");
    trackDailyAttempt("dnf");
    expect(track).toHaveBeenNthCalledWith(1, "daily_attempt", { result: "solve" });
    expect(track).toHaveBeenNthCalledWith(2, "daily_attempt", { result: "dnf" });
  });
});
