"use client";

import { TimeGrid, XLabels } from "@/components/stats/chart/axes";
import { ChartFrame, ChartLegend, ChartTable } from "@/components/stats/chart/chart-frame";
import { linearScale, timeTicks } from "@/components/stats/chart/scale";
import { useMeasuredWidth } from "@/components/stats/chart/use-measured-width";
import type { PbProgression, ProgressPoint } from "@/lib/profile/dal";
import { improvement, stepPath, timelineExtent } from "@/lib/profile/timeline";
import { formatMs } from "@/lib/timer/format";

const SERIES = [
  { key: "single", label: "Single", color: "var(--chart-4)" },
  { key: "ao5", label: "Ao5", color: "var(--chart-1)" },
  { key: "ao12", label: "Ao12", color: "var(--chart-2)" },
] as const;

const HEIGHT = 220;
const PAD = { top: 12, right: 12, bottom: 24, left: 44 };

const day = (iso: string | number) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const month = (t: number) =>
  new Date(t).toLocaleDateString("en-IN", { month: "short", year: "2-digit", timeZone: "Asia/Kolkata" });

/**
 * How a cuber's PBs on one event came down over time: single, Ao5 and Ao12 as
 * step lines (faster is lower). Same chart language as /stats: measured
 * width, the shared grid, legend and table view.
 */
export function PbTimeline({
  progression,
  eventName,
  lastActiveOn,
}: {
  progression: PbProgression;
  eventName: string;
  /** IST day of the latest solve (YYYY-MM-DD): the current PBs run out to it. */
  lastActiveOn: string | null;
}) {
  const { ref, width } = useMeasuredWidth<HTMLDivElement>();
  // End of the last active IST day (18:29:59 UTC).
  const end = lastActiveOn ? Date.parse(`${lastActiveOn}T23:59:59+05:30`) : 0;

  const lines = SERIES.map((s) => ({ ...s, points: progression[s.key] as ProgressPoint[] })).filter(
    (s) => s.points.length > 0,
  );
  const extent = timelineExtent(lines.map((l) => l.points), end);

  const summaries = lines.flatMap((l) => {
    const imp = improvement(l.points);
    return imp ? [`${l.label}: ${formatMs(imp.from)} → ${formatMs(imp.to)} since ${month(Date.parse(imp.at))}`] : [];
  });

  return (
    <ChartFrame
      title="PB timeline"
      hint={`${eventName}: each step down is a new personal best.`}
      isEmpty={!extent}
      emptyMessage="No records on this event yet."
      table={
        <ChartTable
          headers={["Date", "Category", "Time"]}
          rows={lines
            .flatMap((l) => l.points.map((p) => ({ label: l.label, ...p })))
            .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
            .map((p) => [day(p.at), p.label, formatMs(p.ms)])}
        />
      }
    >
      <div ref={ref} className="w-full">
        {extent && width > 0 && (
          <Chart lines={lines} extent={extent} width={width} />
        )}
      </div>
      {lines.length > 1 && <ChartLegend items={lines.map((l) => ({ label: l.label, color: l.color }))} />}
      {summaries.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">{summaries.join(" · ")}</p>
      )}
    </ChartFrame>
  );
}

function Chart({
  lines,
  extent,
  width,
}: {
  lines: { key: string; label: string; color: string; points: ProgressPoint[] }[];
  extent: NonNullable<ReturnType<typeof timelineExtent>>;
  width: number;
}) {
  const { ticks, domain } = timeTicks(extent.minMs, extent.maxMs, 4);
  // Faster is lower on the page: the fastest time sits on the plot's floor.
  const yDown = linearScale(domain, [HEIGHT - PAD.bottom, PAD.top]);
  const x = linearScale([extent.startT, extent.endT], [PAD.left, width - PAD.right]);

  const anchors = ["start", "middle", "end"] as const;
  const labels = [extent.startT, (extent.startT + extent.endT) / 2, extent.endT].map((t, i) => ({
    x: x(t),
    text: month(t),
    anchor: anchors[i],
  }));

  return (
    <svg
      width={width}
      height={HEIGHT}
      role="img"
      aria-label={`PB timeline: ${lines.map((l) => `${l.label} ${formatMs(l.points[l.points.length - 1].ms)}`).join(", ")}`}
    >
      <TimeGrid ticks={ticks} y={yDown} left={PAD.left} right={width - PAD.right} />
      <XLabels labels={labels} bottom={HEIGHT - PAD.bottom} />
      {lines.map((l) => (
        <g key={l.key}>
          <path
            d={stepPath(l.points, x, yDown, extent.endT)}
            fill="none"
            stroke={l.color}
            strokeWidth={2}
            strokeLinejoin="round"
          />
          {l.points.map((p, i) => (
            <circle key={p.at} cx={x(Date.parse(p.at))} cy={yDown(p.ms)} r={3.5} fill={l.color} stroke="var(--card)" strokeWidth={1.5}>
              <title>
                {`${l.label} ${formatMs(p.ms)} · ${day(p.at)}${i > 0 ? ` (−${formatMs(l.points[i - 1].ms - p.ms)})` : ""}`}
              </title>
            </circle>
          ))}
        </g>
      ))}
    </svg>
  );
}
