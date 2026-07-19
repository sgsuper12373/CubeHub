import { cn } from "@/lib/utils";

/**
 * Dependency-free trend line for a short run of solves.
 *
 * The viewBox is fixed and `preserveAspectRatio` is left at its default, so
 * the drawing letterboxes inside whatever width it is given rather than
 * stretching. That is what keeps the dots circular and the stroke even at any
 * container width — no ResizeObserver, no measurement, no `vectorEffect`
 * patches. The slight horizontal inset in a wide rail reads as padding.
 *
 * `points` is oldest-first (left to right) and uses null for a DNF.
 */

const VIEW_W = 240;
const VIEW_H = 56;
const PAD_X = 6;
const PAD_Y = 8;

export function Sparkline({
  points,
  className,
  ariaLabel,
}: {
  points: (number | null)[];
  className?: string;
  ariaLabel: string;
}) {
  const finite = points.filter((p): p is number => p !== null);

  if (points.length < 2 || finite.length === 0) {
    return (
      <p className={cn("text-xs text-muted-foreground", className)}>
        Two solves to start the trend.
      </p>
    );
  }

  const min = Math.min(...finite);
  const max = Math.max(...finite);
  // 8% headroom so the extremes never touch the edge. An all-equal run has no
  // spread to scale against, so it draws flat through the middle.
  const span = max - min;
  const pad = span === 0 ? 1 : span * 0.08;
  const lo = min - pad;
  const hi = max + pad;

  const x = (i: number) =>
    PAD_X + (i * (VIEW_W - 2 * PAD_X)) / (points.length - 1);
  const y = (v: number) =>
    span === 0
      ? VIEW_H / 2
      : PAD_Y + ((hi - v) / (hi - lo)) * (VIEW_H - 2 * PAD_Y);

  // Split into contiguous non-null runs — a DNF breaks the line rather than
  // interpolating across it, because the gap is itself the information.
  const runs: { i: number; v: number }[][] = [];
  let run: { i: number; v: number }[] = [];
  points.forEach((v, i) => {
    if (v === null) {
      if (run.length) runs.push(run);
      run = [];
    } else {
      run.push({ i, v });
    }
  });
  if (run.length) runs.push(run);

  const bestIndex = points.indexOf(min);
  const lastFiniteIndex = points.reduce<number>(
    (acc, v, i) => (v !== null ? i : acc),
    -1,
  );
  const lastFinite = lastFiniteIndex === -1 ? null : points[lastFiniteIndex];

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className={cn(
        "w-full overflow-visible",
        "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200",
        className,
      )}
    >
      {runs.map((r, ri) =>
        r.length === 1 ? (
          <circle
            key={`r${ri}`}
            cx={x(r[0].i)}
            cy={y(r[0].v)}
            r={1.5}
            fill="var(--muted-foreground)"
          />
        ) : (
          <polyline
            key={`r${ri}`}
            points={r.map((p) => `${x(p.i)},${y(p.v)}`).join(" ")}
            fill="none"
            stroke="var(--muted-foreground)"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ),
      )}

      {/* DNFs: a cross on the baseline. Shape and position carry the meaning,
          so this reads without relying on the colour. */}
      {points.map((v, i) =>
        v === null ? (
          <g
            key={`dnf${i}`}
            stroke="var(--timer-hold)"
            strokeWidth={1.5}
            strokeLinecap="round"
          >
            <line
              x1={x(i) - 3}
              y1={VIEW_H - PAD_Y - 3}
              x2={x(i) + 3}
              y2={VIEW_H - PAD_Y + 3}
            />
            <line
              x1={x(i) - 3}
              y1={VIEW_H - PAD_Y + 3}
              x2={x(i) + 3}
              y2={VIEW_H - PAD_Y - 3}
            />
          </g>
        ) : null,
      )}

      {/* Only two dots — twelve would be noise. Best gets a ring so it stays
          legible where the line doubles back over it. */}
      {bestIndex !== -1 && (
        <circle
          cx={x(bestIndex)}
          cy={y(min)}
          r={3.5}
          fill="var(--timer-ready)"
          stroke="var(--background)"
          strokeWidth={1.5}
        />
      )}
      {lastFinite !== null && lastFiniteIndex !== bestIndex && (
        <circle
          cx={x(lastFiniteIndex)}
          cy={y(lastFinite)}
          r={3}
          fill="var(--background)"
          stroke="var(--muted-foreground)"
          strokeWidth={1.5}
        />
      )}
    </svg>
  );
}
