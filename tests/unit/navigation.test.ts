import { describe, it, expect } from "vitest";

import { activeNavHref, mobileNavItems, navItems } from "@/lib/navigation";

describe("nav active tab", () => {
  it("highlights exactly one tab, the most specific", () => {
    expect(activeNavHref("/learn/333/drill", navItems)).toBe("/learn/333/drill");
    expect(activeNavHref("/learn/222/drill", navItems)).toBe("/learn/333/drill");
    expect(activeNavHref("/learn/333/pll", navItems)).toBe("/learn");
    expect(activeNavHref("/learn", navItems)).toBe("/learn");
    expect(activeNavHref("/timer", navItems)).toBe("/timer");
    expect(activeNavHref("/", navItems)).toBeNull();
    // A series whose slug merely starts with "drill" is still Learn.
    expect(activeNavHref("/learn/333/drills-intro", navItems)).toBe("/learn");
  });

  it("the phone bar keeps five tabs, with Drill in it", () => {
    expect(mobileNavItems).toHaveLength(5);
    expect(mobileNavItems.map((i) => i.label)).toContain("Drill");
  });
});
