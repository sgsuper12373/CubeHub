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

  it("Profile covers your profile, anyone's profile, Settings and Friends", () => {
    expect(navItems.find((i) => i.label === "Profile")?.href).toBe("/profile");
    expect(activeNavHref("/profile", navItems)).toBe("/profile");
    expect(activeNavHref("/profile/someone", navItems)).toBe("/profile");
    expect(activeNavHref("/settings", navItems)).toBe("/profile");
    expect(activeNavHref("/friends", navItems)).toBe("/profile");
    expect(activeNavHref("/profile/someone/compare", navItems)).toBe("/profile");
    expect(activeNavHref("/profiles-list", navItems)).toBeNull();
  });

  it("the phone bar keeps five tabs, with Drill in it", () => {
    expect(mobileNavItems).toHaveLength(5);
    expect(mobileNavItems.map((i) => i.label)).toContain("Drill");
  });
});
