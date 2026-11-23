import { describe, it, expect } from "vitest";

import { activeNavHref, mobileMoreItems, mobileNavItems, navItems, sidebarItems } from "@/lib/navigation";

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

  it("leaves out Compete and Shop until they exist", () => {
    const labels = navItems.map((i) => i.label);
    expect(labels).not.toContain("Compete");
    expect(labels).not.toContain("Shop");
  });
});

describe("Clubs in the nav", () => {
  it("is a desktop section covering every club page, but not a phone tab", () => {
    expect(activeNavHref("/clubs", navItems)).toBe("/clubs");
    expect(activeNavHref("/clubs/pune-cubers/manage", navItems)).toBe("/clubs");
    expect(activeNavHref("/clubs/join/abc", navItems)).toBe("/clubs");
    expect(mobileNavItems.some((i) => i.href === "/clubs")).toBe(false);
    expect(mobileMoreItems.some((i) => i.href === "/clubs")).toBe(true);
  });
});

describe("sidebar items", () => {
  it("starts with Home, which lights on /home and on / (single-host mode)", () => {
    expect(sidebarItems[0]).toMatchObject({ label: "Home", href: "/home", group: "main" });
    expect(activeNavHref("/home", sidebarItems)).toBe("/home");
    expect(activeNavHref("/home/daily", sidebarItems)).toBe("/home");
    expect(activeNavHref("/", sidebarItems)).toBe("/home");
    expect(activeNavHref("/homework", sidebarItems)).toBeNull();
  });

  it("keeps Drill and Learn apart", () => {
    expect(activeNavHref("/learn/333/drill", sidebarItems)).toBe("/learn/333/drill");
    expect(activeNavHref("/learn/333/pll/21", sidebarItems)).toBe("/learn");
  });

  it("People covers the old /friends address; profiles light nothing", () => {
    expect(activeNavHref("/people", sidebarItems)).toBe("/people");
    expect(activeNavHref("/friends", sidebarItems)).toBe("/people");
    expect(activeNavHref("/profile/someone", sidebarItems, "me")).toBeNull();
    expect(activeNavHref("/profile/me", sidebarItems, "me")).toBeNull();
  });

  it("groups items into main, practice and community, with no Compete or Shop", () => {
    expect(sidebarItems.map((i) => `${i.group}:${i.label}`)).toEqual([
      "main:Home",
      "main:Timer",
      "main:Stats",
      "practice:Learn",
      "practice:Drill Lab",
      "practice:Playground",
      "community:Clubs",
      "community:People",
    ]);
  });
});

describe("phone bottom bar", () => {
  it("has Home, Timer, Learn and Drill as tabs (More is the fifth)", () => {
    expect(mobileNavItems.map((i) => i.href)).toEqual(["/home", "/timer", "/learn", "/learn/333/drill"]);
  });

  it("puts everything else in the More sheet", () => {
    expect(mobileMoreItems.map((i) => i.label)).toEqual([
      "Stats",
      "Playground",
      "Clubs",
      "People",
      "Profile",
      "Settings",
    ]);
  });

  it("lights no tab for a More page, so the bar can light More instead", () => {
    expect(activeNavHref("/stats", mobileNavItems)).toBeNull();
    expect(activeNavHref("/stats", mobileMoreItems)).toBe("/stats");
    expect(activeNavHref("/profile/me", mobileMoreItems, "me")).toBe("/profile");
    expect(activeNavHref("/learn/333/drill", mobileNavItems)).toBe("/learn/333/drill");
  });
});
