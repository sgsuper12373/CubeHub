import { describe, expect, it } from "vitest";

import { matchCommands, nameQuery, parseCaseQuery, staticCommands, usernameQuery } from "@/lib/palette";

const nav = [
  { puzzle: "333", name: "3x3", series: [{ slug: "beginner", name: "Beginner method" }, { slug: "oll", name: "OLL" }, { slug: "pll", name: "PLL" }] },
  { puzzle: "222", name: "2x2", series: [{ slug: "cll", name: "CLL" }] },
];
const commands = staticCommands(nav, "riya_cubes");

describe("command palette", () => {
  it("lists the pages for an empty query", () => {
    expect(matchCommands(commands, "").map((c) => c.label)).toContain("Timer");
    expect(matchCommands(commands, "").every((c) => c.group === "Pages")).toBe(true);
  });

  it("finds pages by label or keyword, label prefix first", () => {
    expect(matchCommands(commands, "sta")[0].label).toBe("Stats");
    expect(matchCommands(commands, "pb")[0].label).toBe("Stats");
    expect(matchCommands(commands, "drill")[0]).toMatchObject({ label: "Drill Lab", href: "/learn/333/drill" });
  });

  it("finds Learn series with their puzzle, and the cuber's own profile", () => {
    expect(matchCommands(commands, "2x2 cll")[0]).toMatchObject({ href: "/learn/222/cll" });
    expect(matchCommands(commands, "your profile")[0]).toMatchObject({ href: "/profile/riya_cubes" });
    expect(staticCommands(nav, null).some((c) => c.id === "page:profile")).toBe(false);
  });

  it("switches themes, including following the system", () => {
    const themes = matchCommands(commands, "theme");
    expect(themes.map((c) => ("theme" in c ? c.theme : null))).toEqual(expect.arrayContaining(["slate", "paper", "system"]));
  });

  it("reads 'OLL 33' as a case number in a listed series only", () => {
    expect(parseCaseQuery("OLL 33", nav)).toEqual({ puzzle: "333", series: "oll", number: 33 });
    expect(parseCaseQuery("pll4", nav)).toEqual({ puzzle: "333", series: "pll", number: 4 });
    expect(parseCaseQuery("cll #2", nav)).toEqual({ puzzle: "222", series: "cll", number: 2 });
    expect(parseCaseQuery("zbll 12", nav)).toBeNull();
    expect(parseCaseQuery("Gb perm", nav)).toBeNull();
  });

  it("only looks up plausible usernames", () => {
    expect(usernameQuery("@riya_cubes")).toBe("riya_cubes");
    expect(usernameQuery("Gb perm")).toBeNull();
    expect(usernameQuery("x")).toBeNull();
  });

  it("looks up display names, refusing anything PostgREST would read as syntax", () => {
    expect(nameQuery("  Riya   S ")).toBe("Riya S");
    expect(nameQuery("J. Doe")).toBe("J. Doe");
    expect(nameQuery("a,b")).toBeNull();
    expect(nameQuery("x")).toBeNull();
  });
});
