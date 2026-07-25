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
    <div className={cn("group relative w-full", className)}>
      {/* Dynamic Ambient Card Glow */}
      <div
        className={cn(
          "pointer-events-none absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-primary/30 via-teal-500/20 to-cyan-500/30 opacity-60 blur-xl transition-all duration-500 group-hover:opacity-100",
          phase === "holding" && "from-amber-500/50 via-amber-500/30 to-amber-500/50 opacity-90 blur-2xl",
          phase === "ready" && "from-emerald-500/60 via-emerald-500/40 to-emerald-500/60 opacity-100 blur-2xl animate-pulse",
          phase === "running" && "from-primary/50 via-emerald-500/40 to-cyan-500/50 opacity-80 blur-2xl",
        )}
      />

      <div
        ref={rootRef}
        role="button"
        tabIndex={0}
        aria-label="Demo timer — hold, then release to start; press to stop"
        className={cn(
          "relative flex w-full cursor-pointer touch-none select-none flex-col items-center gap-4 rounded-2xl border border-white/15 bg-card/85 p-8 shadow-[0_12px_45px_rgba(0,0,0,0.5)] backdrop-blur-2xl ring-1 ring-white/10 transition-all duration-300 group-hover:border-primary/40 dark:bg-zinc-900/80",
          "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
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
        <div className="flex w-full items-center justify-between px-2 text-[11px] font-mono font-medium tracking-wider uppercase text-muted-foreground/70">
          <span className="flex items-center gap-1.5">
            <span
              className={cn(
                "size-2 rounded-full transition-colors duration-200",
                phase === "idle" && "bg-muted-foreground/40",
                phase === "holding" && "bg-amber-400",
                phase === "ready" && "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]",
                phase === "running" && "bg-cyan-400 animate-ping",
                phase === "stopped" && "bg-primary",
              )}
            />
            {phase.toUpperCase()}
          </span>
          <span className="text-right text-[11px]">3×3 RANDOM STATE</span>
        </div>

        <p className="min-h-7 max-w-md rounded-lg border border-border/50 bg-muted/40 px-3 py-1 text-center font-mono text-xs font-medium tracking-wide text-foreground/90 md:text-sm">
          {scramble ?? " "}
        </p>

        <span
          ref={digitsRef}
          className={cn(
            "my-2 inline-flex min-h-[80px] w-full items-center justify-center font-mono text-7xl font-bold tabular-nums tracking-tighter transition-[color,transform,text-shadow] duration-150 sm:min-h-[100px] md:min-h-[130px] md:text-8xl",
            phase === "idle" && "text-foreground drop-shadow-[0_2px_10px_rgba(0,0,0,0.3)]",
            phase === "holding" && "text-amber-400 scale-95",
            phase === "ready" && "timer-ready-pulse text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.4)] scale-105",
            phase === "running" && "text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.3)]",
            phase === "stopped" && "text-timer-ready timer-stop-flash text-primary drop-shadow-[0_0_20px_rgba(20,184,166,0.4)]",
          )}
        >
          0.00
        </span>

        <p className="text-xs font-medium text-muted-foreground">
          <span className="hidden md:inline-flex items-center gap-1.5">
            Hold{" "}
            <kbd className="inline-flex h-5 items-center rounded border border-white/20 bg-muted px-1.5 font-mono text-[11px] font-semibold text-foreground shadow-xs">
              Space
            </kbd>{" "}
            — release to start, hit any key to stop
          </span>
          <span className="md:hidden">Hold anywhere on this card — release to start</span>
        </p>

        {times.length > 0 && (
          <div className="w-full border-t border-border/60 pt-3">
            <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 font-mono text-xs text-muted-foreground tabular-nums">
              <li className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-semibold">Recent Solves:</li>
              {times.map((t, i) => (
                <li
                  key={`${i}-${t}`}
                  className={cn(
                    "rounded bg-muted/50 px-2 py-0.5 font-medium text-foreground border border-border/40",
                    i === 0 && "border-primary/50 text-primary font-bold bg-primary/10 shadow-[0_0_10px_rgba(20,184,166,0.15)]",
                  )}
                >
                  {formatMs(t)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
