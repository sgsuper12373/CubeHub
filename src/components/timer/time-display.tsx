"use client";

import { useEffect, useRef } from "react";

import { formatMs, formatResult } from "@/lib/timer/format";
import { cn } from "@/lib/utils";
import {
  DNF_OVERRUN_MS,
  HOLD_MS,
  inspectionDurationMs,
  useTimerStore,
} from "@/stores/timer-store";

/**
 * The big digits. All time-varying content is written imperatively into a
 * single <span> from one requestAnimationFrame loop — React never renders
 * the ticking value, so there are zero component commits while a solve runs.
 * React re-renders only on phase changes (six per solve), which is also when
 * the color classes swap.
 *
 * The same rAF loop drives the two time-based transitions:
 * holding ≥ HOLD_MS → ready, and inspection overrun → +2 / DNF.
 */
export function TimeDisplay({
  hideWhileSolving,
  className,
}: {
  hideWhileSolving: boolean;
  className?: string;
}) {
  const phase = useTimerStore((s) => s.phase);
  const digitsRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = digitsRef.current;
    if (!el) return;

    const paint = (now: number) => {
      const s = useTimerStore.getState();
      el.style.color = "";

      switch (s.phase) {
        case "idle":
          el.textContent =
            s.finalElapsedMs !== null ? formatMs(s.finalElapsedMs) : "0.00";
          break;
        case "holding":
        case "ready":
          el.textContent = "0.00";
          break;
        case "inspecting": {
          const duration =
            inspectionDurationMs(s.settings.inspectionMode) ?? 15_000;
          const elapsed = now - (s.inspectionStartedAt ?? now);
          if (elapsed > duration + DNF_OVERRUN_MS) {
            s.markInspectionPenalty("dnf");
            el.textContent = "DNF";
            el.style.color = "var(--timer-hold)";
          } else if (elapsed > duration) {
            s.markInspectionPenalty("plus2");
            el.textContent = "+2";
            el.style.color = "var(--timer-hold)";
          } else {
            el.textContent = String(Math.ceil((duration - elapsed) / 1000));
            if (duration - elapsed <= 3_000)
              el.style.color = "var(--timer-hold)";
          }
          break;
        }
        case "running":
          el.textContent = hideWhileSolving
            ? "solve"
            : formatMs(now - (s.solveStartedAt ?? now));
          break;
        case "stopped":
          el.textContent = formatResult(
            s.finalElapsedMs ?? 0,
            s.inspectionPenalty,
          );
          break;
      }
    };

    paint(performance.now());

    const ticking =
      phase === "inspecting" ||
      phase === "holding" ||
      phase === "ready" ||
      phase === "running";
    if (!ticking) return;

    let frame = 0;
    const loop = () => {
      const now = performance.now();
      const s = useTimerStore.getState();
      if (
        s.phase === "holding" &&
        s.holdStartedAt !== null &&
        now - s.holdStartedAt >= HOLD_MS
      ) {
        s.ready(); // phase change re-runs this effect; loop restarts cleanly
      }
      paint(now);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [phase, hideWhileSolving]);

  return (
    <div
      className={cn(
        "grid h-28 place-items-center md:h-36",
        className,
      )}
    >
      <span
        ref={digitsRef}
        className={cn(
          "font-mono text-7xl font-semibold tabular-nums transition-[color,transform] duration-150 md:text-8xl",
          phase === "holding" && "text-timer-hold",
          phase === "ready" && "scale-[1.02] text-timer-ready",
          phase === "stopped" && "text-timer-ready",
        )}
      />
    </div>
  );
}
