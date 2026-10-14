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

  it("Profile covers your own profile, Edit profile, Settings and People", () => {
    expect(navItems.find((i) => i.label === "Profile")?.href).toBe("/profile");
    expect(activeNavHref("/profile", navItems, "me_cubes")).toBe("/profile");
    expect(activeNavHref("/profile/me_cubes", navItems, "me_cubes")).toBe("/profile");
    expect(activeNavHref("/profile/Me_Cubes/followers", navItems, "me_cubes")).toBe("/profile");
    expect(activeNavHref("/profile/edit", navItems, "me_cubes")).toBe("/profile");
    expect(activeNavHref("/settings", navItems, "me_cubes")).toBe("/profile");
    expect(activeNavHref("/people", navItems, "me_cubes")).toBe("/profile");
    expect(activeNavHref("/profiles-list", navItems)).toBeNull();
  });

  it("someone else's profile lights up no tab", () => {
    expect(activeNavHref("/profile/someone", navItems, "me_cubes")).toBeNull();
    expect(activeNavHref("/profile/someone/compare", navItems, "me_cubes")).toBeNull();
    expect(activeNavHref("/profile/someone", navItems, null)).toBeNull();
  });

  it("the phone bar keeps five tabs, with Drill in it", () => {
    expect(mobileNavItems).toHaveLength(5);
    expect(mobileNavItems.map((i) => i.label)).toContain("Drill");
  });

  it("leaves out Compete and Shop until they exist", () => {
    const labels = navItems.map((i) => i.label);
    expect(labels).not.toContain("Compete");
    expect(labels).not.toContain("Shop");
    expect(mobileNavItems.map((i) => i.label)).toEqual(["Timer", "Stats", "Learn", "Drill", "Profile"]);
  });
});
