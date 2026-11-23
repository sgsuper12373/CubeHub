import { describe, expect, it } from "vitest";

import { CHANGELOG, CUBBY_TIPS, latestChanges, tipForDay } from "@/lib/home/content";
import { parseDismissed } from "@/lib/home/dismissals";

describe("home content", () => {
  it("the changelog is well formed, newest first, with internal links", () => {
    expect(CHANGELOG.length).toBeGreaterThan(0);
    for (const e of CHANGELOG) {
      expect(e.id).toBeTruthy();
      expect(e.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(e.link.startsWith("/")).toBe(true);
    }
    const dates = CHANGELOG.map((e) => e.date);
    expect([...dates].sort().reverse()).toEqual(dates);
    expect(new Set(CHANGELOG.map((e) => e.id)).size).toBe(CHANGELOG.length);
  });

  it("shows the latest two not dismissed", () => {
    const [first, second, third] = CHANGELOG;
    expect(latestChanges(new Set()).map((e) => e.id)).toEqual([first.id, second.id]);
    expect(latestChanges(new Set([first.id])).map((e) => e.id)).toEqual([second.id, third.id]);
  });

  it("gives one tip per day, the same all day", () => {
    const morning = tipForDay(new Date(2026, 10, 24, 6));
    expect(tipForDay(new Date(2026, 10, 24, 23))).toBe(morning);
    expect(CUBBY_TIPS).toContain(morning);
    expect(tipForDay(new Date(2026, 10, 25, 6))).not.toBe(morning);
  });

  it("no tip scolds", () => {
    for (const tip of CUBBY_TIPS) expect(tip).not.toMatch(/you missed|you forgot|shame|lazy/i);
  });

  it("reads dismissed ids defensively", () => {
    expect(parseDismissed('["a","b",3]')).toEqual(new Set(["a", "b"]));
    expect(parseDismissed("junk")).toEqual(new Set());
  });
});
