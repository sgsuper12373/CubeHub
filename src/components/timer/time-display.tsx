"use client";

import { useEffect, useRef } from "react";

import { formatMs, formatResult } from "@/lib/timer/format";
import { cn } from "@/lib/utils";
import {
  DNF_OVERRUN_MS,
  getHoldMs,
  inspectionDurationMs,
  useTimerStore,
} from "@/stores/timer-store";
import { announce, cancelAnnounce } from "@/lib/timer/voice";

/**
 * The big digits. All time-varying content is written imperatively into a
 * single <span> from one requestAnimationFrame loop — React never renders
 * the ticking value, so there are zero component commits while a solve runs.
 * React re-renders only on phase changes (six per solve), which is also when
 * the color classes swap.
 *
 * The same rAF loop drives the two time-based transitions:
 * holding ≥ holdMs → ready, and inspection overrun → +2 / DNF.
 */
export function TimeDisplay({
  hideWhileSolving,
  celebrate = false,
  className,
}: {
  hideWhileSolving: boolean;
  /** Briefly true right after a personal best — drives the glow. */
  celebrate?: boolean;
  className?: string;
}) {
  const phase = useTimerStore((s) => s.phase);
  const digitsRef = useRef<HTMLSpanElement>(null);
  const announcedMarksRef = useRef<Set<number>>(new Set());

  // Reset announced marks and cancel speech when phase resets
  useEffect(() => {
    if (phase === "idle") {
      announcedMarksRef.current.clear();
      cancelAnnounce();
    } else if (phase === "running" || phase === "stopped") {
      cancelAnnounce();
    }
  }, [phase]);

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
            const remaining = Math.ceil((duration - elapsed) / 1000);
            el.textContent = String(remaining);
            if (remaining <= 3) el.style.color = "var(--timer-hold)";

            if (s.settings.voiceEnabled) {
              const mark = duration === 15_000 ? (remaining === 7 ? 8 : remaining === 3 ? 12 : null) : (remaining === 4 ? 4 : remaining === 2 ? 6 : null);
              if (mark && !announcedMarksRef.current.has(mark)) {
                announcedMarksRef.current.add(mark);
                announce(`${mark} seconds`);
              }
            }
          }
          break;
        }
        case "running":
          const ms = now - (s.solveStartedAt ?? now);
          el.textContent = hideWhileSolving
            ? "solve"
            : formatMs(ms, s.settings.precision ?? 2);
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
        now - s.holdStartedAt >= getHoldMs()
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
          phase === "ready" && "timer-ready-pulse text-timer-ready",
          phase === "stopped" && "text-timer-ready",
          celebrate && "timer-pb-glow",
        )}
      />
    </div>
  );
}
