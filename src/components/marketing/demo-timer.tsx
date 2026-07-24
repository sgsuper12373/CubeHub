"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { formatMs } from "@/lib/timer/format";
import { generateScramble } from "@/lib/timer/scrambler";
import { cn } from "@/lib/utils";

/**
 * A throwaway timer for the landing page.
 *
 * Deliberately shares no state with the real timer: this file imports neither
 * `useTimerStore` nor `useSessionStore`. Both are module singletons that
 * survive client-side navigation, so a "demo mode" flag on them would risk a
 * visitor's later solves silently going unrecorded if the flag ever failed to
 * reset. Nothing here touches localStorage or the session store, so there is
 * no state to leak in the first place.
 *
 * What it does share are the genuinely pure pieces — `formatMs`, the real
 * WCA scramble generator, and the `--timer-*` tokens — so it looks and reads
 * exactly like the timer the visitor is about to use.
 *
 * Key handling is scoped by an IntersectionObserver rather than a bare window
 * listener: Space starts a solve while the card is on screen, and goes back to
 * scrolling the page once the visitor moves past it.
 */

const HOLD_MS = 300;
const STOP_DEBOUNCE_MS = 200;
const MAX_TIMES = 5;

type DemoPhase = "idle" | "holding" | "ready" | "running" | "stopped";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

export function DemoTimer({ className }: { className?: string }) {
  const [phase, setPhase] = useState<DemoPhase>("idle");
  const [times, setTimes] = useState<number[]>([]);
  const [scramble, setScramble] = useState<string | null>(null);

  const digitsRef = useRef<HTMLSpanElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const engagedRef = useRef(false);
  const holdStartedAt = useRef<number | null>(null);
  const solveStartedAt = useRef<number | null>(null);
  const stoppedAt = useRef<number | null>(null);
  const finalMs = useRef<number | null>(null);

  const nextScramble = useCallback(() => {
    let cancelled = false;
    void generateScramble("333")
      .then((alg) => {
        if (!cancelled) setScramble(alg);
      })
      .catch(() => {
        // A landing page without a scramble is still a usable timer.
        if (!cancelled) setScramble(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => nextScramble(), [nextScramble]);

  // Only claim the Space key while the card is actually on screen.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        engagedRef.current = entry.isIntersecting;
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Phase is mirrored into a ref so the event handlers can branch on the
  // current value synchronously. The state updaters themselves stay pure.
  const phaseRef = useRef<DemoPhase>("idle");
  const go = useCallback((next: DemoPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const press = useCallback(() => {
    const now = performance.now();
    const p = phaseRef.current;

    if (p === "running") {
      const elapsed = now - (solveStartedAt.current ?? now);
      finalMs.current = elapsed;
      solveStartedAt.current = null;
      stoppedAt.current = now;
      setTimes((t) => [elapsed, ...t].slice(0, MAX_TIMES));
      go("stopped");
      return;
    }
    if (p === "stopped") {
      // Ignore the tail of the tap that just stopped the timer.
      if (now - (stoppedAt.current ?? 0) < STOP_DEBOUNCE_MS) return;
      nextScramble();
      holdStartedAt.current = now;
      go("holding");
      return;
    }
    if (p === "idle") {
      holdStartedAt.current = now;
      go("holding");
    }
  }, [go, nextScramble]);

  const release = useCallback(() => {
    const now = performance.now();
    const p = phaseRef.current;

    if (p === "holding") {
      holdStartedAt.current = null;
      go("idle");
      return;
    }
    if (p === "ready") {
      holdStartedAt.current = null;
      finalMs.current = null;
      solveStartedAt.current = now;
      go("running");
    }
  }, [go]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!engagedRef.current || e.repeat || isEditableTarget(e.target)) return;
      if (e.code !== "Space") return;
      e.preventDefault();
      press();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (!engagedRef.current || isEditableTarget(e.target)) return;
      if (e.code !== "Space") return;
      e.preventDefault();
      release();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [press, release]);

  // Same shape as <TimeDisplay/>: one rAF loop writing textContent directly,
  // so the ticking value never costs a React commit.
  useEffect(() => {
    const el = digitsRef.current;
    if (!el) return;

    const paint = (now: number) => {
      switch (phase) {
        case "idle":
          el.textContent =
            finalMs.current !== null ? formatMs(finalMs.current) : "0.00";
          break;
        case "holding":
        case "ready":
          el.textContent = "0.00";
          break;
        case "running":
          el.textContent = formatMs(now - (solveStartedAt.current ?? now));
          break;
        case "stopped":
          el.textContent = formatMs(finalMs.current ?? 0);
          break;
      }
    };

    paint(performance.now());
    if (phase !== "holding" && phase !== "ready" && phase !== "running") return;

    let frame = 0;
    const loop = () => {
      const now = performance.now();
      if (
        phase === "holding" &&
        holdStartedAt.current !== null &&
        now - holdStartedAt.current >= HOLD_MS
      ) {
        go("ready"); // phase change re-runs this effect; the loop restarts
      }
      paint(now);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [phase, go]);

  return (
    <div
      ref={rootRef}
      role="button"
      tabIndex={0}
      aria-label="Demo timer — hold, then release to start; press to stop"
      className={cn(
        "flex w-full cursor-pointer touch-none select-none flex-col items-center gap-3 rounded-xl border border-border bg-card p-6 shadow-lg shadow-black/20",
        "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        className,
      )}
      onPointerDown={(e) => {
        if (!e.isPrimary) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        press();
      }}
      onPointerUp={(e) => {
        if (!e.isPrimary) return;
        release();
      }}
      onPointerCancel={release}
      onContextMenu={(e) => e.preventDefault()}
    >
      <p className="min-h-5 max-w-md text-center font-mono text-xs text-muted-foreground md:text-sm">
        {scramble ?? " "}
      </p>

      <span
        ref={digitsRef}
        className={cn(
          "font-mono text-6xl font-semibold tabular-nums transition-[color,transform] duration-150 md:text-7xl",
          phase === "holding" && "text-timer-holding",
          phase === "ready" && "timer-ready-pulse text-timer-running",
          phase === "running" && "text-timer-running",
          phase === "stopped" && "text-timer-ready timer-stop-flash",
        )}
      />

      <p className="text-xs text-muted-foreground">
        <span className="hidden md:inline">
          Hold{" "}
          <kbd className="rounded border border-border bg-muted px-1.5 font-mono text-[11px]">
            Space
          </kbd>{" "}
          — release to start
        </span>
        <span className="md:hidden">Hold anywhere on this card to start</span>
      </p>

      {times.length > 0 && (
        <ul className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-mono text-xs text-muted-foreground tabular-nums">
          {times.map((t, i) => (
            <li key={`${i}-${t}`}>{formatMs(t)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
