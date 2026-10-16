import { describe, expect, it } from "vitest";

import { editTimeLeft, EDIT_WINDOW_MS, isAlgNotation, parseVideoUrl, validatePostInput, type PostInput } from "@/lib/clubs/posts";

const base: PostInput = { kind: "text", body: "Meetup Sunday", alg: "", puzzle: "333", setup: "", videoUrl: "" };

describe("validatePostInput", () => {
  it("keeps only the fields a kind uses", () => {
    const res = validatePostInput({ ...base, alg: "R U", videoUrl: "https://youtu.be/abcdefghijk" });
    expect(res).toEqual({
      ok: true,
      value: { kind: "text", body: "Meetup Sunday", alg: null, puzzle: null, setup: null, video_url: null },
    });
  });

  it("needs text, at most 1000 characters", () => {
    expect(validatePostInput({ ...base, body: "   " })).toMatchObject({ ok: false, field: "body" });
    expect(validatePostInput({ ...base, body: "x".repeat(1001) })).toMatchObject({ ok: false, field: "body" });
  });

  it("accepts an algorithm with an optional setup and caption", () => {
    const res = validatePostInput({ ...base, kind: "alg", body: "", alg: "  R U  R' U' ", puzzle: "222", setup: "F" });
    expect(res).toEqual({
      ok: true,
      value: { kind: "alg", body: null, alg: "R U R' U'", puzzle: "222", setup: "F", video_url: null },
    });
  });

  it.each([
    ["alg", { alg: "" }],
    ["alg", { alg: "R U hello" }],
    ["alg", { alg: "R ".repeat(101) }],
    ["puzzle", { puzzle: "444" }],
    ["setup", { setup: "R".repeat(201) }],
    ["body", { body: "x".repeat(501) }],
  ] as [string, Partial<PostInput>][])("rejects an algorithm post with a bad %s", (field, patch) => {
    expect(validatePostInput({ ...base, kind: "alg", alg: "R U", ...patch })).toMatchObject({ ok: false, field });
  });

  it.each([
    "https://youtu.be/dQw4w9WgXcQ",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com/shorts/dQw4w9WgXcQ",
    "https://www.instagram.com/reel/C1a2b3c4/",
  ])("accepts %s", (url) => {
    expect(validatePostInput({ ...base, kind: "video", videoUrl: url })).toMatchObject({ ok: true });
  });

  it.each(["http://youtu.be/dQw4w9WgXcQ", "https://vimeo.com/1234", "https://evil.com/youtube.com/watch?v=x", "javascript:alert(1)"])(
    "refuses %s",
    (url) => {
      expect(validatePostInput({ ...base, kind: "video", videoUrl: url })).toMatchObject({ ok: false, field: "videoUrl" });
    },
  );
});

describe("isAlgNotation", () => {
  it.each(["R U R' U'", "(R U R' U') x2", "Rw U2' M' E S", "r u' F2"])("accepts %s", (alg) => {
    expect(isAlgNotation(alg)).toBe(true);
  });
  it.each(["R U Q", "[R, U]", "R4x", "<script>"])("refuses %s", (alg) => {
    expect(isAlgNotation(alg)).toBe(false);
  });
});

describe("parseVideoUrl", () => {
  it("finds the YouTube id in every link shape", () => {
    for (const url of [
      "https://youtu.be/dQw4w9WgXcQ?t=10",
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=x",
      "https://m.youtube.com/shorts/dQw4w9WgXcQ",
      "https://youtube.com/live/dQw4w9WgXcQ",
    ]) {
      expect(parseVideoUrl(url)).toMatchObject({ site: "youtube", id: "dQw4w9WgXcQ" });
    }
  });
  it("recognises Instagram and refuses the rest", () => {
    expect(parseVideoUrl("https://www.instagram.com/p/abc123/")).toMatchObject({ site: "instagram" });
    expect(parseVideoUrl("https://www.youtube.com/watch?v=<bad>")).toBeNull();
    expect(parseVideoUrl("https://example.com/x")).toBeNull();
    expect(parseVideoUrl("not a url")).toBeNull();
  });
});

describe("editTimeLeft", () => {
  it("counts down 15 minutes from posting", () => {
    const now = Date.parse("2026-10-17T10:00:00Z");
    expect(editTimeLeft("2026-10-17T10:00:00Z", now)).toBe(EDIT_WINDOW_MS);
    expect(editTimeLeft("2026-10-17T09:50:00Z", now)).toBe(5 * 60 * 1000);
    expect(editTimeLeft("2026-10-17T09:40:00Z", now)).toBe(0);
  });
});
