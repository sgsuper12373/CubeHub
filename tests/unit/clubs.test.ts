import { describe, expect, it } from "vitest";

import {
  canManage,
  clubErrorMessage,
  slugify,
  validateClubInput,
  type ClubInput,
} from "@/lib/clubs/types";

const base: ClubInput = {
  name: "Pune Speedcubers",
  slug: "pune-speedcubers",
  description: "",
  type: "city",
  tags: ["333"],
  isPublic: true,
};

describe("slugify", () => {
  it("lowercases and dashes words", () => {
    expect(slugify("Pune Speedcubers!")).toBe("pune-speedcubers");
  });
  it("drops accents and trims dashes", () => {
    expect(slugify("  Café  Cubers -- ")).toBe("cafe-cubers");
  });
  it("never exceeds 40 characters or ends in a dash", () => {
    const slug = slugify("a".repeat(39) + " bcd");
    expect(slug.length).toBeLessThanOrEqual(40);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("validateClubInput", () => {
  it("accepts a normal club and tidies the name", () => {
    const res = validateClubInput({ ...base, name: "  Pune   Speedcubers " });
    expect(res).toMatchObject({ ok: true, value: { name: "Pune Speedcubers" } });
  });

  it.each([
    ["name", { name: "ab" }],
    ["name", { name: "x".repeat(41) }],
    ["slug", { slug: "Has Spaces" }],
    ["slug", { slug: "new" }],
    ["slug", { slug: "ab" }],
    ["description", { description: "x".repeat(301) }],
    ["type", { type: "village" }],
    ["tags", { tags: ["333", "222", "casual", "methods"] }],
    ["tags", { tags: ["feet"] }],
  ] as [string, Partial<ClubInput>][])("rejects a bad %s", (field, patch) => {
    expect(validateClubInput({ ...base, ...patch })).toMatchObject({ ok: false, field });
  });

  it("de-duplicates tags", () => {
    expect(validateClubInput({ ...base, tags: ["333", "333"] })).toMatchObject({ ok: true, value: { tags: ["333"] } });
  });
});

describe("clubErrorMessage", () => {
  it("passes through the RPCs' own wording", () => {
    expect(clubErrorMessage({ message: "You own 3 clubs already.", hint: "owned_limit" }, "fallback")).toBe(
      "You own 3 clubs already.",
    );
  });
  it("hides anything else", () => {
    expect(clubErrorMessage({ message: "permission denied for table clubs" }, "Couldn't save.")).toBe("Couldn't save.");
    expect(clubErrorMessage(null, "Couldn't save.")).toBe("Couldn't save.");
  });
});

describe("canManage", () => {
  it("is owners and admins only", () => {
    expect(canManage({ kind: "member", role: "owner" })).toBe(true);
    expect(canManage({ kind: "member", role: "admin" })).toBe(true);
    expect(canManage({ kind: "member", role: "member" })).toBe(false);
    expect(canManage({ kind: "requested" })).toBe(false);
  });
});
