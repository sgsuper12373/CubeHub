import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Heatmap } from "@/components/stats/chart/heatmap";
import { improvement, stepPath, timelineExtent } from "@/lib/profile/timeline";

const P = (at: string, ms: number) => ({ at, ms });

describe("PB timeline maths", () => {
  const x = (t: number) => (t - Date.parse("2026-01-01T00:00:00Z")) / 86_400_000; // days
  const y = (ms: number) => ms / 1000; // seconds

  it("draws a step down at each record and runs the last one out to the end", () => {
    const points = [P("2026-01-01T00:00:00Z", 12000), P("2026-01-03T00:00:00Z", 10000), P("2026-01-08T00:00:00Z", 9000)];
    expect(stepPath(points, x, y, Date.parse("2026-01-10T00:00:00Z"))).toBe("M0,12 H2 V10 H7 V9 H9");
  });

  it("draws nothing with no points", () => {
    expect(stepPath([], x, y, 0)).toBe("");
  });

  it("fits every series, ending at the last active day", () => {
    const extent = timelineExtent(
      [[P("2026-01-01T00:00:00Z", 12000)], [P("2026-02-01T00:00:00Z", 15000), P("2026-03-01T00:00:00Z", 13000)]],
      Date.parse("2026-04-01T00:00:00Z"),
    );
    expect(extent).toEqual({
      startT: Date.parse("2026-01-01T00:00:00Z"),
      endT: Date.parse("2026-04-01T00:00:00Z"),
      minMs: 12000,
      maxMs: 15000,
    });
  });

  it("gives a record set on the last active day some width, and nothing for no data", () => {
    const at = Date.parse("2026-03-01T10:00:00Z");
    expect(timelineExtent([[P("2026-03-01T10:00:00Z", 9000)]], 0)?.endT).toBe(at + 60_000);
    expect(timelineExtent([[], []], 0)).toBeNull();
  });

  it("summarises the first and current record", () => {
    expect(improvement([P("2026-01-01T00:00:00Z", 14200), P("2026-02-01T00:00:00Z", 12800)])).toEqual({
      from: 14200,
      to: 12800,
      at: "2026-01-01T00:00:00Z",
    });
    expect(improvement([P("2026-01-01T00:00:00Z", 14200)])).toBeNull();
  });
});

describe("Heatmap from day counts", () => {
  it("colours the days it is given and leaves the rest empty", () => {
    const today = new Date();
    const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const { container } = render(<Heatmap days={[{ day: key, count: 20 }]} />);
    const fills = [...container.querySelectorAll("rect")].map((r) => r.getAttribute("fill") ?? r.style.fill);
    expect(fills.length).toBeGreaterThan(300);
    expect(fills.filter((f) => f === "var(--chart-seq-3)")).toHaveLength(1);
    expect(fills.filter((f) => f !== "var(--chart-seq-0)")).toHaveLength(1);
  });
});
