import { describe, expect, it } from "vitest";

import { parseTypedTime } from "@/lib/timer/parse-time";

const ok = (timeMs: number, penalty = "none") => ({ ok: true, timeMs, penalty });

describe("parseTypedTime", () => {
  it.each([
    ["12.34", 12340],
    ["12.3", 12300],
    ["12.345", 12345],
    ["9", 90], // digits only: centiseconds
    ["1234", 12340],
    ["10234", 62340],
    ["123456", 754560], // 12:34.56
    ["1:02.34", 62340],
    ["1:02", 62000],
    ["1:00:00", 3600000],
    [" 12.34 ", 12340],
  ])("reads %j as %i ms", (input, ms) => {
    expect(parseTypedTime(input)).toEqual(ok(ms));
  });

  it("reads +2 and DNF markers", () => {
    expect(parseTypedTime("12.34+")).toEqual(ok(12340, "plus2"));
    expect(parseTypedTime("1234+")).toEqual(ok(12340, "plus2"));
    expect(parseTypedTime("DNF")).toEqual(ok(1, "dnf"));
    expect(parseTypedTime("dnf(12.34)")).toEqual(ok(12340, "dnf"));
    expect(parseTypedTime("DNF 15.2")).toEqual(ok(15200, "dnf"));
  });

  it.each(["", "abc", "12..3", "1:75", "1:2:3:4", "12.3456", "-5", "0", "0.00", "00", "1:60.00", "17000"])(
    "rejects %j",
    (input) => {
      expect(parseTypedTime(input).ok).toBe(false);
    },
  );

  it("rejects 24 hours or more", () => {
    expect(parseTypedTime("24:00:00").ok).toBe(false);
  });
});
