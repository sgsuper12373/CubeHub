"use client";

import { ArrowDown, ArrowUp, Minus } from "lucide-react";

import { Sparkline } from "@/components/stats/sparkline";
import { formatAverage, formatMs } from "@/lib/timer/format";
import { ao5Delta, effectiveMs } from "@/lib/timer/stats";
import type { Solve } from "@/lib/timer/types";
import { cn } from "@/lib/utils";

const WINDOW = 12;

/**
 * The last dozen solves as a trend line, plus which way the Ao5 is moving.
 *
 * Direction convention: the arrow points the way *the time* moved, so down is
 * faster and reads green. Pointing the arrow at "improvement" instead would
 * read backwards to a cuber. The words "faster"/"slower" are always in the
 * DOM alongside, so the meaning never rests on colour alone.
 */
export function SessionTrend({ solves }: { solves: Solve[] }) {
  if (solves.length === 0) return null;

  // The store keeps solves newest-first; the sparkline reads left-to-right in
  // chronological order, so this reverse is load-bearing.
  const points = solves.slice(0, WINDOW).reverse().map(effectiveMs);
  const { current, deltaMs } = ao5Delta(solves);

  const finite = points.filter((p): p is number => p !== null);
  const dnfCount = points.length - finite.length;
  const ariaLabel =
    finite.length > 0
      ? `Last ${points.length} solves, ${formatMs(Math.min(...finite))} to ${formatMs(
          Math.max(...finite),
        )}${dnfCount > 0 ? `, ${dnfCount} DNF` : ""}`
      : `Last ${points.length} solves, all DNF`;

  return (
    <section className="px-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Trend
        </h3>
        <Ao5Delta current={current} deltaMs={deltaMs} count={solves.length} />
      </div>
      <Sparkline points={points} ariaLabel={ariaLabel} className="mt-1 h-10 md:h-14" />
    </section>
  );
}

function Ao5Delta({
  current,
  deltaMs,
  count,
}: {
  current: number | "DNF" | null;
  deltaMs: number | null;
  count: number;
}) {
  if (current === null) {
    return (
      <span className="text-xs text-muted-foreground tabular-nums">
        Ao5 — · {5 - count} to go
      </span>
    );
  }

  if (current === "DNF") {
    return (
      <span className="text-xs font-medium text-timer-hold tabular-nums">
        Ao5 DNF
      </span>
    );
  }

  const value = (
    <span className="font-mono text-xs font-medium text-foreground tabular-nums">
      {formatAverage(current)}
    </span>
  );

  // No previous Ao5 to compare against (fewer than six solves, or the previous
  // window was a DNF average).
  if (deltaMs === null) {
    return (
      <span className="flex items-baseline gap-1.5">
        <span className="text-xs text-muted-foreground">Ao5</span>
        {value}
        <span className="text-[0.65rem] text-muted-foreground">first</span>
      </span>
    );
  }

  const faster = deltaMs < 0;
  const Icon = deltaMs === 0 ? Minus : faster ? ArrowDown : ArrowUp;
  const tone =
    deltaMs === 0
      ? "text-muted-foreground"
      : faster
        ? "text-timer-ready"
        : "text-timer-hold";
  const word = deltaMs === 0 ? "same" : faster ? "faster" : "slower";

  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-xs text-muted-foreground">Ao5</span>
      {value}
      <span className={cn("flex items-center gap-0.5 text-[0.65rem]", tone)}>
        <Icon className="size-3 shrink-0 self-center" aria-hidden />
        {deltaMs !== 0 && (
          <span className="font-mono tabular-nums">
            {formatMs(Math.abs(deltaMs))}
          </span>
        )}
        <span className={cn(deltaMs !== 0 && "hidden lg:inline")}>{word}</span>
        {deltaMs !== 0 && <span className="sr-only">{word}</span>}
      </span>
    </span>
  );
}
