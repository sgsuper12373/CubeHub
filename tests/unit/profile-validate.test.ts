import { describe, expect, it } from "vitest";

import { centreSquare } from "@/lib/profile/avatar";
import {
  countryFlag,
  countryName,
  countryOptions,
  isOwnAvatarUrl,
  isReservedUsername,
  validateProfileInput,
  validateSetups,
} from "@/lib/profile/validate";

const base = {
  displayName: "Sumit",
  bio: "",
  country: "IN",
  wcaId: "",
  isPublic: true,
  showActivity: true,
  showLearning: true,
  mainMethod: "",
  learningNow: "",
};

describe("validateProfileInput", () => {
  it("trims, normalises and maps to columns", () => {
    expect(
      validateProfileInput({
        displayName: "  Sumit   Garad ",
        bio: "Main: 3x3\r\n\r\n\r\n\r\nGoal: sub-15  ",
        country: "in",
        wcaId: " 2019sing01 ",
        isPublic: false,
        showActivity: false,
        showLearning: true,
        mainMethod: "cfop",
        learningNow: "  full   OLL ",
      }),
    ).toEqual({
      ok: true,
      update: {
        display_name: "Sumit Garad",
        bio: "Main: 3x3\n\nGoal: sub-15",
        country: "IN",
        wca_id: "2019SING01",
        is_public: false,
        show_activity: false,
        show_learning: true,
        main_method: "cfop",
        learning_now: "full OLL",
      },
    });
  });

  it("stores empty optional fields as null", () => {
    const r = validateProfileInput({ ...base, displayName: "  ", bio: " \n " });
    expect(r).toMatchObject({ ok: true, update: { display_name: null, bio: null, wca_id: null } });
  });

  it.each([
    [{ displayName: "x".repeat(61) }, "displayName"],
    [{ bio: "x".repeat(501) }, "bio"],
    [{ country: "XX" }, "country"],
    [{ country: "" }, "country"],
    [{ wcaId: "2019SIN01" }, "wcaId"],
    [{ wcaId: "SING201901" }, "wcaId"],
    [{ mainMethod: "magic" }, "mainMethod"],
    [{ learningNow: "x".repeat(81) }, "learningNow"],
  ])("rejects %j", (patch, field) => {
    expect(validateProfileInput({ ...base, ...patch })).toMatchObject({ ok: false, field });
  });
});

describe("validateSetups", () => {
  it("saves named cubes, clears empty ones, and tidies spacing", () => {
    const r = validateSetups({ "333": "  GAN   12 Maglev ", pyra: "" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.save).toEqual([{ puzzle_type: "333", cube_name: "GAN 12 Maglev" }]);
    expect(r.cleared).toContain("pyra");
    expect(r.cleared).toContain("222");
    expect(r.cleared).toHaveLength(7);
  });

  it("refuses a name over 80 characters, naming the event", () => {
    expect(validateSetups({ skewb: "x".repeat(81) })).toEqual({
      ok: false,
      error: "Keep the Skewb cube name under 80 characters.",
    });
  });
});

describe("countries", () => {
  it("lists India first, then the rest by name", () => {
    const options = countryOptions();
    expect(options[0]).toEqual({ code: "IN", name: "India" });
    expect(options.length).toBeGreaterThan(240);
    const names = options.slice(1).map((o) => o.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it("names and flags a code", () => {
    expect(countryName("NP")).toBe("Nepal");
    expect(countryFlag("IN")).toBe("🇮🇳");
    expect(countryFlag("in")).toBe("");
  });
});

describe("usernames and avatars", () => {
  it("reserves paths under /profile", () => {
    expect(isReservedUsername("edit")).toBe(true);
    expect(isReservedUsername("Edit")).toBe(true);
    expect(isReservedUsername("editor")).toBe(false);
  });

  it("accepts only a file in the user's own avatar folder", () => {
    const url = "https://abc.supabase.co";
    const me = "11111111-1111-1111-1111-111111111111";
    const own = `${url}/storage/v1/object/public/avatars/${me}/1760000000000.webp`;
    expect(isOwnAvatarUrl(own, url, me)).toBe(true);
    expect(isOwnAvatarUrl(own, `${url}/`, me)).toBe(true);
    expect(isOwnAvatarUrl(own.replace(me, "22222222-2222-2222-2222-222222222222"), url, me)).toBe(false);
    expect(isOwnAvatarUrl("https://evil.example/a.webp", url, me)).toBe(false);
    expect(isOwnAvatarUrl(`${url}/storage/v1/object/public/avatars/${me}/../x.webp`, url, me)).toBe(false);
    expect(isOwnAvatarUrl(`${url}/storage/v1/object/public/avatars/${me}/a.svg`, url, me)).toBe(false);
  });

  it("crops the centre square of any photo", () => {
    expect(centreSquare(4000, 3000)).toEqual({ sx: 500, sy: 0, side: 3000 });
    expect(centreSquare(1080, 1920)).toEqual({ sx: 0, sy: 420, side: 1080 });
    expect(centreSquare(256, 256)).toEqual({ sx: 0, sy: 0, side: 256 });
  });
});
