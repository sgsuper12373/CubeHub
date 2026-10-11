import { describe, expect, it } from "vitest";

import { centreSquare } from "@/lib/profile/avatar";
import {
  countryFlag,
  countryName,
  countryOptions,
  isOwnAvatarUrl,
  isReservedUsername,
  validateProfileInput,
} from "@/lib/profile/validate";

const base = { displayName: "Sumit", bio: "", country: "IN", wcaId: "", isPublic: true };

describe("validateProfileInput", () => {
  it("trims, normalises and maps to columns", () => {
    expect(
      validateProfileInput({
        displayName: "  Sumit   Garad ",
        bio: "Main: 3x3\r\n\r\n\r\n\r\nGoal: sub-15  ",
        country: "in",
        wcaId: " 2019sing01 ",
        isPublic: false,
      }),
    ).toEqual({
      ok: true,
      update: {
        display_name: "Sumit Garad",
        bio: "Main: 3x3\n\nGoal: sub-15",
        country: "IN",
        wca_id: "2019SING01",
        is_public: false,
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
  ])("rejects %j", (patch, field) => {
    expect(validateProfileInput({ ...base, ...patch })).toMatchObject({ ok: false, field });
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
