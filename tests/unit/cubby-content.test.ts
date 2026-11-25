import { describe, expect, it } from "vitest";

import { contentProblems, fillLine, pickGreeting, pickLine, type Greeting } from "@/lib/companion/content";

const valid = {
  page: "timer",
  tourVersion: 2,
  tour: [
    { id: "a", target: "timer-scramble", title: "T", body: "B", since: 1 },
    { id: "b", target: null, title: "T", body: "B", since: 2, waitFor: "timer:started", mood: "happy" },
  ],
  greetings: [{ when: "firstVisit", line: "Hi, I'm {name}.", actions: [{ label: "Tour", href: "/timer" }] }],
  reactions: { pb: ["New PB! {time}"] },
  tips: ["Press ? for shortcuts."],
};

describe("contentProblems", () => {
  it("accepts a valid file", () => {
    expect(contentProblems(valid)).toEqual([]);
  });

  it("names each problem", () => {
    const bad = {
      ...valid,
      tourVersion: 1,
      tour: [
        { id: "a", target: "Bad Target", title: "", body: "B", since: 1, waitFor: "nope", mood: "angry" },
        { id: "a", target: null, title: "T", body: "B", since: 2 },
      ],
      greetings: [{ when: "someday", line: "" }],
      reactions: { party: ["x"] },
      tips: [""],
    };
    const problems = contentProblems(bad);
    expect(problems).toEqual(
      expect.arrayContaining([
        "tour[0].target: a data-tour value or null",
        "tour[0].title: missing",
        "tour[0].waitFor: unknown event",
        "tour[0].mood: unknown",
        'tour[1].id: duplicate "a"',
        "tour[1].since: 1..tourVersion",
        "greetings[0].when: unknown condition",
        "greetings[0].line: missing",
        "reactions.party: unknown reaction",
        "tips: an array of lines",
      ]),
    );
  });
});

describe("fillLine", () => {
  it("fills known keys and leaves the rest", () => {
    expect(fillLine("New PB! {time} — {delta} off. Love, {name}. {x}", { time: "12.84", delta: "0.60", name: "Cubby" })).toBe("New PB! 12.84 — 0.60 off. Love, Cubby. {x}");
  });
});

describe("pickGreeting", () => {
  const pool: Greeting[] = [
    { when: "firstVisit", line: "first" },
    { when: "daysAway>=7", line: "week" },
    { when: "morning", line: "morning" },
    { when: "always", line: "always" },
  ];

  it("prefers the most specific match", () => {
    expect(pickGreeting(pool, { firstVisit: true, daysAway: null, hour: 9 })?.line).toBe("first");
    expect(pickGreeting(pool, { firstVisit: false, daysAway: 9, hour: 9 })?.line).toBe("week");
    expect(pickGreeting(pool, { firstVisit: false, daysAway: 1, hour: 9 })?.line).toBe("morning");
    expect(pickGreeting(pool, { firstVisit: false, daysAway: 1, hour: 15 })?.line).toBe("always");
  });

  it("returns null when nothing matches", () => {
    expect(pickGreeting([{ when: "night", line: "n" }], { firstVisit: false, daysAway: 0, hour: 12 })).toBeNull();
  });

  it("picks within a group by the random source", () => {
    const two: Greeting[] = [
      { when: "always", line: "a" },
      { when: "always", line: "b" },
    ];
    expect(pickGreeting(two, { firstVisit: false, daysAway: 0, hour: 12 }, () => 0.99)?.line).toBe("b");
    expect(pickLine(["x", "y"], () => 0)).toBe("x");
    expect(pickLine([], () => 0)).toBeNull();
  });
});
