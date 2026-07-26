import { describe, it, expect } from "vitest";
import { formatMs, formatResult, formatAverage } from "@/lib/timer/format";

describe("formatMs", () => {
  it("formats centisecond times under 1 minute correctly without rounding up", () => {
    expect(formatMs(9_423)).toBe("9.42");
    expect(formatMs(12_050)).toBe("12.05");
  });

  it("formats times over 1 minute with minutes and leading zeros for seconds", () => {
    expect(formatMs(62_450)).toBe("1:02.45");
    expect(formatMs(125_890)).toBe("2:05.89");
  });

  it("supports 3 decimal places when requested", () => {
    expect(formatMs(9_423, 3)).toBe("9.423");
  });

  it("handles negative or non-finite inputs gracefully by returning zeroed format", () => {
    expect(formatMs(-500)).toBe("0.00");
    expect(formatMs(NaN)).toBe("0.00");
  });
});

describe("formatResult", () => {
  it("returns raw time formatting for none penalty", () => {
    expect(formatResult(14_520, "none")).toBe("14.52");
  });

  it("adds 2000ms and appends + marker for plus2 penalty", () => {
    expect(formatResult(14_520, "plus2")).toBe("16.52+");
  });

  it("returns DNF for dnf penalty regardless of time", () => {
    expect(formatResult(14_520, "dnf")).toBe("DNF");
  });
});

describe("formatAverage", () => {
  it("returns dash for null average", () => {
    expect(formatAverage(null)).toBe("—");
  });

  it("returns DNF string when average is DNF", () => {
    expect(formatAverage("DNF")).toBe("DNF");
  });

  it("formats numeric average in milliseconds", () => {
    expect(formatAverage(15_340)).toBe("15.34");
  });
});
